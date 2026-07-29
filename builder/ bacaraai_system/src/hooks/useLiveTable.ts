import { useEffect, useMemo, useRef, useState } from 'react';
import { PLATFORM_LINKS } from '../constants';
import type { AiModelAnalysis, AiOpinion, GameResult, TableData } from '../types';
import {
  aiAmountSuggestEnabled,
  aiSideSuggestEnabled,
  sessionCutsReadyForAmount,
} from './useSession';
import {
  recommendBetAmount,
  type RecommendBetContext,
} from '../utils/recommendBetAmount';
import {
  verifyLiveFeedIntegrity,
  type LiveFeedResponse,
  type LiveIntegrity,
} from '../utils/liveIntegrity';
import {
  parseGameStatus,
  resolveEffectiveGameStatus,
  type GameStatus,
} from '../utils/gameStatus';

type LiveResultRow = {
  id: number;
  table_name: string;
  game_no?: number | null;
  result: GameResult;
  detected_at: string;
};

type LiveResponse = LiveFeedResponse & {
  results?: LiveResultRow[];
};

type AiAnalyzeResponse = {
  ok: boolean;
  message?: string;
  cached?: boolean;
  mode?: string;
  auto_bet_allowed?: boolean;
  suggest_scope?: 'side' | 'amount' | 'both';
  source_result_id?: number;
  game_no?: number | null;
  gpt?: AiModelAnalysis & { error?: string };
  claude?: AiModelAnalysis & { error?: string };
  gemini?: AiModelAnalysis & { error?: string };
  finalOpinion?: AiOpinion;
  finalConfidence?: number;
  consensus?: string;
  decisionReason?: string;
  appliedRule?: string;
  recommendedAmount?: number;
  accuracy?: { settled: number; hits: number; rate: number | null };
};

type LiveState = {
  loading: boolean;
  connected: boolean;
  rows: LiveResultRow[];
  gameNo: number | null;
  latestId: number | null;
  latestDetectedAt: string | null;
  shuffleActive: boolean;
  gameStatus: GameStatus | null;
  manualMode: boolean;
  integrity: LiveIntegrity | null;
  syncWarning: string | null;
  error: string | null;
};

type AiState = {
  loading: boolean;
  error: string | null;
  forResultId: number | null;
  data: AiAnalyzeResponse | null;
};

const POLL_MS = 1000;

function buildRoadmap(results: GameResult[]): GameResult[][] {
  const columns: GameResult[][] = [];

  results.forEach((result) => {
    if (result === 'T') {
      if (!columns.length) columns.push(['T']);
      else columns[columns.length - 1].push('T');
      return;
    }

    const last = columns[columns.length - 1];
    const lastDecisive = last?.find((item) => item !== 'T');
    if (!last || !lastDecisive || lastDecisive !== result) {
      columns.push([result]);
    } else {
      last.push(result);
    }
  });

  return columns.slice(-18);
}

function currentStreak(results: GameResult[]): string {
  const decisive = [...results].reverse().find((item) => item !== 'T');
  if (!decisive) return results.length ? `Tie ${results.length}연속` : '결과 대기';

  let count = 0;
  for (let i = results.length - 1; i >= 0; i -= 1) {
    if (results[i] === 'T') continue;
    if (results[i] !== decisive) break;
    count += 1;
  }
  return `${decisive === 'P' ? 'Player' : 'Banker'} ${count}연속`;
}

/** 변경 감지용 경량 시그니처 (id·결과·개수) — 매 폴링 전체 문자열화 없이 안전 비교 */
function buildRowsSignature(rows: LiveResultRow[]): string {
  if (rows.length === 0) return '0';
  let checksum = 0;
  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i];
    if (!r || typeof r.id !== 'number') continue;
    const code = r.result === 'P' ? 1 : r.result === 'B' ? 2 : 3;
    // 정수 오버플로 방지를 위해 32-bit 범위로 접음
    checksum = (checksum * 31 + r.id * 4 + code) % 2147483647;
  }
  const first = rows[0];
  const last = rows[rows.length - 1];
  if (!first?.id || !last?.id) return `${rows.length}`;
  return `${rows.length}:${first.id}:${last.id}:${last.result}:${checksum}`;
}

function fallbackModel(opinion: AiOpinion = 'WAIT'): AiModelAnalysis {
  return {
    status: '대기',
    opinion,
    confidence: 0,
    responseTime: 0,
    reasons: [],
  };
}

export default function useLiveTable(
  base: TableData,
  tableName = 'MD2729',
  displayName = 'TABLE1(MD2729)',
  recommendCtx: RecommendBetContext | null = null,
): TableData {
  const [state, setState] = useState<LiveState>({
    loading: true,
    connected: false,
    rows: [],
    gameNo: null,
    latestId: null,
    latestDetectedAt: null,
    shuffleActive: false,
    gameStatus: null,
    manualMode: false,
    integrity: null,
    syncWarning: null,
    error: null,
  });
  const [aiState, setAiState] = useState<AiState>({
    loading: false,
    error: null,
    forResultId: null,
    data: null,
  });
  const pollSeqRef = useRef(0);
  const analyzeActive = useRef(false);
  const analyzedIdRef = useRef<string | null>(null);
  const lastSyncSigRef = useRef<string | null>(null);
  const fpFailStreakRef = useRef(0);
  const forceNextPollRef = useRef(false);
  /** 새 latestId 를 처음 본 시각 — lobby 오표시 보정용 */
  const latestIdSeenAtRef = useRef<{ id: number; at: number } | null>(null);

  const suggestScope = recommendCtx?.config.aiSuggestScope || 'side';
  const amountEnabled = recommendCtx
    ? aiAmountSuggestEnabled(recommendCtx.config)
    : false;
  const sideEnabled = recommendCtx
    ? aiSideSuggestEnabled(recommendCtx.config)
    : true;
  const analyzeKey = useMemo(() => {
    if (!recommendCtx) return `side|0|0`;
    const c = recommendCtx.config;
    return [
      c.aiSuggestScope || 'side',
      c.winCut || 0,
      c.lossCut || 0,
      c.initialBet || 0,
      c.maxBet || 0,
      recommendCtx.availableBankroll || 0,
      recommendCtx.pnl || 0,
      recommendCtx.martinStage || 1,
    ].join('|');
  }, [recommendCtx]);

  useEffect(() => {
    let cancelled = false;
    // 테이블이 바뀌면 이전 시그니처 무효화
    lastSyncSigRef.current = null;

    const poll = async () => {
      const seq = ++pollSeqRef.current;
      try {
        const query = new URLSearchParams({ table_name: tableName, limit: '800' });
        if (forceNextPollRef.current) {
          query.set('force', '1');
          forceNextPollRef.current = false;
        }
        const response = await fetch(`${PLATFORM_LINKS.liveResults}?${query.toString()}`, {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        const data = (await response.json()) as LiveResponse;
        if (!response.ok || !data.ok) {
          throw new Error(data.message || '실시간 결과 조회에 실패했습니다.');
        }
        if (cancelled || seq !== pollSeqRef.current) return;

        // 서버가 이미 슈 정리·중복 제거한 결과를 그대로 표시 (클라이언트 재가공 금지)
        const rows = (data.results || [])
          .map((row) => ({
            ...row,
            id: Number(row.id),
            result: String(row.result || '')
              .trim()
              .toUpperCase() as GameResult,
            detected_at: String(row.detected_at || ''),
            table_name: String(row.table_name || tableName),
          }))
          .filter(
            (row) =>
              Number.isFinite(row.id) &&
              row.id > 0 &&
              ['P', 'B', 'T'].includes(row.result),
          )
          .sort((a, b) => a.id - b.id);

        const check = await verifyLiveFeedIntegrity({ ...data, results: rows });
        if (!check.fpMatch) {
          fpFailStreakRef.current += 1;
          forceNextPollRef.current = true;
          // 지문 불일치여도 서버 rows 는 즉시 반영 (표시 지연 방지)
        } else {
          fpFailStreakRef.current = 0;
        }

        // 감지가 표시보다 앞서면 다음 폴링에서 캐시 강제 무효화
        if (!check.synced && !data.manual_mode) {
          forceNextPollRef.current = true;
        }

        const latest = rows.length ? rows[rows.length - 1] : null;
        const nextGameNo = latest?.game_no ?? data.game_no ?? null;
        const nextLatestId = latest?.id ?? data.latest_id ?? null;
        const nextDetectedAt = latest?.detected_at ?? data.latest_detected_at ?? null;
        const syncWarning =
          check.healed
            ? check.message || '감지 새 결과로 표시를 자동 복구했습니다.'
            : !check.synced
              ? check.message
              : !check.fpMatch
                ? check.message
                : null;

        if (nextLatestId != null && Number.isFinite(nextLatestId)) {
          const prevSeen = latestIdSeenAtRef.current;
          if (!prevSeen || prevSeen.id !== nextLatestId) {
            latestIdSeenAtRef.current = { id: nextLatestId, at: Date.now() };
          }
        }

        const rawStatus = parseGameStatus(data.game_status);
        const gameStatus = resolveEffectiveGameStatus(rawStatus, {
          wallClockSeenAt: latestIdSeenAtRef.current?.at ?? null,
          latestDetectedAt:
            typeof nextDetectedAt === 'string' ? nextDetectedAt : null,
        });
        const shuffleActive =
          Boolean(data.shuffle_active) || gameStatus === 'shuffle';

        // 데이터가 실제로 바뀐 경우에만 상태 갱신 (game_status 포함)
        const sig = `ok|${buildRowsSignature(rows)}|${nextGameNo ?? ''}|${nextLatestId ?? ''}|${data.integrity?.results_fp || ''}|${syncWarning || ''}|${gameStatus || ''}|${shuffleActive ? 1 : 0}`;
        if (lastSyncSigRef.current === sig) {
          return;
        }
        lastSyncSigRef.current = sig;

        setState({
          loading: false,
          connected: true,
          rows,
          gameNo: nextGameNo,
          latestId: nextLatestId,
          latestDetectedAt: nextDetectedAt,
          shuffleActive,
          gameStatus,
          manualMode: Boolean(data.manual_mode),
          integrity: data.integrity || null,
          syncWarning,
          error: null,
        });
      } catch (error) {
        if (cancelled || seq !== pollSeqRef.current) return;
        const message = error instanceof Error ? error.message : '실시간 연결 오류';
        // 오류는 상태를 한 번만 반영 (반복 오류로 인한 재렌더 폭주 방지)
        if (lastSyncSigRef.current === `err|${message}`) {
          return;
        }
        lastSyncSigRef.current = `err|${message}`;
        forceNextPollRef.current = true;
        setState((prev) => ({
          ...prev,
          loading: false,
          connected: false,
          error: message,
        }));
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [tableName]);

  // 새 결과가 들어왔을 때만 AI 분석 (결과 ID + 제안 범위/한도 키)
  useEffect(() => {
    const latestId = state.latestId;
    if (!latestId || !state.connected) return;
    const runKey = `${latestId}:${analyzeKey}`;
    if (analyzedIdRef.current === runKey) return;

    let cancelled = false;
    analyzeActive.current = true;
    setAiState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      forResultId: latestId,
    }));

    const run = async () => {
      try {
        const query = new URLSearchParams({ table_name: tableName });
        const scope = suggestScope;
        query.set('suggest_scope', scope);
        if (recommendCtx && (scope === 'amount' || scope === 'both')) {
          if (sessionCutsReadyForAmount(recommendCtx.config)) {
            query.set('win_cut', String(recommendCtx.config.winCut));
            query.set('loss_cut', String(recommendCtx.config.lossCut));
            query.set('bankroll', String(Math.floor(recommendCtx.availableBankroll || 0)));
            query.set('initial_bet', String(recommendCtx.config.initialBet || 10000));
            query.set('max_bet', String(recommendCtx.config.maxBet || 0));
            query.set('pnl', String(Math.floor(recommendCtx.pnl || 0)));
            query.set('martin_stage', String(recommendCtx.martinStage || 1));
          }
        }
        const response = await fetch(`${PLATFORM_LINKS.aiAnalyze}?${query.toString()}`, {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        const data = (await response.json()) as AiAnalyzeResponse;
        if (cancelled) return;
        if (!response.ok || !data.ok) {
          throw new Error(data.message || 'AI 분석에 실패했습니다.');
        }
        analyzedIdRef.current = runKey;
        setAiState({
          loading: false,
          error: null,
          forResultId: latestId,
          data,
        });
      } catch (error) {
        if (cancelled) return;
        analyzedIdRef.current = runKey;
        setAiState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'AI 분석 오류',
        }));
      } finally {
        if (!cancelled) {
          analyzeActive.current = false;
        }
      }
    };

    void run();
    return () => {
      // 스코프/한도 변경 시 이전 요청을 버리고 바로 재분석 가능하게
      cancelled = true;
      analyzeActive.current = false;
    };
  }, [state.latestId, state.connected, tableName, analyzeKey, suggestScope, recommendCtx]);

  return useMemo(() => {
    const results = state.rows.map((row) => row.result);
    // 슈 내 회차는 결과 건수 기준 (감지 game_no 고착 시 G4 고정 방지)
    const shoeRound = results.length > 0 ? results.length : null;
    const shoeLabel =
      shoeRound !== null ? `G${shoeRound}` : base.stats.shoeNumber;

    const analysis = aiState.data;
    const analysisReady =
      analysis &&
      analysis.source_result_id != null &&
      analysis.source_result_id === state.latestId;

    const gpt = analysisReady && analysis.gpt ? analysis.gpt : fallbackModel('WAIT');
    const claude = analysisReady && analysis.claude ? analysis.claude : fallbackModel('WAIT');
    const gemini = analysisReady && analysis.gemini ? analysis.gemini : fallbackModel('WAIT');

    const rawOpinion: AiOpinion =
      analysisReady && analysis.finalOpinion ? analysis.finalOpinion : 'WAIT';
    // 금액만 모드: 방향은 WAIT 로 표시 (사용자가 직접 선택)
    const finalOpinion: AiOpinion = sideEnabled ? rawOpinion : 'WAIT';
    const finalConfidence =
      analysisReady && typeof analysis.finalConfidence === 'number'
        ? analysis.finalConfidence
        : 0;
    const consensus =
      analysisReady && analysis.consensus
        ? analysis.consensus
        : aiState.loading
          ? '분석 중'
          : '0/3';
    const appliedRule = aiState.loading
      ? 'GPT·Claude·Gemini 섀도 분석 중'
      : aiState.error
        ? aiState.error
        : analysisReady
          ? analysis.appliedRule || analysis.decisionReason || '섀도 모드 분석'
          : 'AI 분석 대기';

    const isActionable = finalOpinion === 'PLAYER' || finalOpinion === 'BANKER';
    // 오토는 방향 제안이 켜져 있을 때만
    const autoBetAllowed =
      sideEnabled && Boolean(analysisReady && analysis.auto_bet_allowed);
    const shadowMode = !autoBetAllowed;

    if (!results.length) {
      return {
        ...base,
        name: displayName,
        gameCode: tableName,
        status: state.error ? 'error' : aiState.loading ? 'analyzing' : 'observing',
        live: {
          connected: state.connected,
          loading: state.loading,
          latestId: state.latestId,
          latestDetectedAt: state.latestDetectedAt,
          error: state.error,
          gameNo: state.gameNo,
          shuffleActive: state.shuffleActive,
          gameStatus: state.gameStatus,
          manualMode: state.manualMode,
          resultsFp: state.integrity?.results_fp ?? null,
          syncWarning: state.syncWarning,
          integritySynced: state.integrity ? state.integrity.synced !== false : true,
        },
        roadmap: [],
        stats: {
          ...base.stats,
          player: 0,
          banker: 0,
          tie: 0,
          currentStreak: '결과 대기',
          shoeNumber: shoeLabel,
          currentRound: 0,
          recentResults: [],
        },
        ai: {
          ...base.ai,
          gpt,
          claude,
          gemini,
          finalOpinion: 'WAIT',
          finalConfidence: 0,
          consensus,
          appliedRule,
          recommendedAmount: 0,
          skipReasons: aiState.error ? [aiState.error] : ['실시간 데이터 대기'],
          discussionSummary: 'AI 분석 대기 중. 조건 충족 시에만 자동 베팅됩니다.',
          autoBetAllowed: false,
          shadowMode: true,
        },
      };
    }

    const player = results.filter((result) => result === 'P').length;
    const banker = results.filter((result) => result === 'B').length;
    const tie = results.filter((result) => result === 'T').length;

    let status: TableData['status'] = 'observing';
    if (state.error) status = 'error';
    else if (aiState.loading) status = 'analyzing';
    else if (isActionable && autoBetAllowed) status = 'rule_triggered';
    else if (isActionable) status = 'observing';

    const accuracy = analysisReady ? analysis.accuracy : undefined;
    const accuracyText =
      accuracy && accuracy.settled > 0 && accuracy.rate != null
        ? `적중 ${Math.round(accuracy.rate * 100)}% (${accuracy.hits}/${accuracy.settled})`
        : '검증 데이터 축적 중';

    const modeLabel = autoBetAllowed
      ? 'AI 자동베팅 가능'
      : isActionable
        ? '참고 추천(자동베팅 조건 미충족)'
        : '관망';

    // 금액: 서버 AI 우선, 없으면(레거시) 클라이언트 보조 — 단 금액 스코프+한도 OK 일 때만
    let recommendedAmount = 0;
    let amountReason = '';
    if (amountEnabled) {
      const serverAmt =
        analysisReady && typeof analysis.recommendedAmount === 'number'
          ? analysis.recommendedAmount
          : 0;
      if (serverAmt > 0) {
        recommendedAmount = serverAmt;
        amountReason = 'AI 금액 분석';
      } else if (recommendCtx && (rawOpinion === 'PLAYER' || rawOpinion === 'BANKER')) {
        const betRec = recommendBetAmount({
          ...recommendCtx,
          opinion: rawOpinion,
          confidence: finalConfidence,
          consensus,
        });
        recommendedAmount = betRec.amount;
        amountReason = betRec.reason;
      }
    } else if (!sideEnabled) {
      amountReason = '금액 제안: 윈컷·로스컷 필요';
    }

    return {
      ...base,
      name: displayName,
      gameCode: tableName,
      status,
      timer: 0,
      live: {
        connected: state.connected,
        loading: state.loading,
        latestId: state.latestId,
        latestDetectedAt: state.latestDetectedAt,
        error: state.error,
        gameNo: shoeRound ?? state.gameNo,
        shuffleActive: state.shuffleActive,
        gameStatus: state.gameStatus,
        manualMode: state.manualMode,
        resultsFp: state.integrity?.results_fp ?? null,
        syncWarning: state.syncWarning,
        integritySynced: state.integrity ? state.integrity.synced !== false : true,
      },
      roadmap: buildRoadmap(results),
      stats: {
        ...base.stats,
        player,
        banker,
        tie,
        currentStreak: currentStreak(results),
        shoeNumber: shoeLabel,
        shoeProgress: Math.min(100, Math.round((results.length / 80) * 100)),
        currentRound: shoeRound ?? results.length,
        recentResults: results,
      },
      ai: {
        ...base.ai,
        gpt: {
          status: gpt.status || '분석 완료',
          opinion: gpt.opinion,
          confidence: gpt.confidence,
          responseTime: gpt.responseTime,
          reasons: gpt.reasons || [],
        },
        claude: {
          status: claude.status || '분석 완료',
          opinion: claude.opinion,
          confidence: claude.confidence,
          responseTime: claude.responseTime,
          reasons: claude.reasons || [],
        },
        gemini: {
          status: gemini.status || '분석 완료',
          opinion: gemini.opinion,
          confidence: gemini.confidence,
          responseTime: gemini.responseTime,
          reasons: gemini.reasons || [],
        },
        finalOpinion,
        finalConfidence,
        consensus,
        appliedRule,
        recommendedAmount,
        skipReasons: isActionable ? undefined : [appliedRule, accuracyText],
        discussionSummary: isActionable
          ? `${modeLabel} · ${amountReason || '참고'} · ${accuracyText}`
          : `${modeLabel} · ${amountReason ? `${amountReason} · ` : ''}${accuracyText}`,
        autoBetAllowed,
        shadowMode,
      },
    };
  }, [
    base,
    state,
    aiState,
    tableName,
    displayName,
    recommendCtx,
    amountEnabled,
    sideEnabled,
  ]);
}
