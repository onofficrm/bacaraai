import { useEffect, useMemo, useRef, useState } from 'react';
import { PLATFORM_LINKS } from '../constants';
import type { AiModelAnalysis, AiOpinion, GameResult, TableData } from '../types';

type LiveResultRow = {
  id: number;
  table_name: string;
  game_no?: number | null;
  result: GameResult;
  detected_at: string;
};

type LiveResponse = {
  ok: boolean;
  message?: string;
  table_name?: string;
  game_no?: number | null;
  latest_id?: number | null;
  latest_detected_at?: string | null;
  results?: LiveResultRow[];
};

type AiAnalyzeResponse = {
  ok: boolean;
  message?: string;
  cached?: boolean;
  mode?: string;
  auto_bet_allowed?: boolean;
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
  accuracy?: { settled: number; hits: number; rate: number | null };
};

type LiveState = {
  loading: boolean;
  connected: boolean;
  rows: LiveResultRow[];
  gameNo: number | null;
  latestId: number | null;
  latestDetectedAt: string | null;
  error: string | null;
};

type AiState = {
  loading: boolean;
  error: string | null;
  forResultId: number | null;
  data: AiAnalyzeResponse | null;
};

const POLL_MS = 2000;

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

/** API가 과거 슈를 섞어 줄 때를 대비해 game_no 감소 지점부터만 사용 */
function trimToCurrentShoe(rows: LiveResultRow[]): LiveResultRow[] {
  if (rows.length === 0) return rows;
  const sorted = [...rows].sort((a, b) => a.id - b.id);
  let start = 0;
  let prevNo: number | null = null;
  for (let i = 0; i < sorted.length; i += 1) {
    const no = sorted[i].game_no ?? null;
    if (prevNo !== null && no !== null && no > 0 && prevNo > 0 && no < prevNo) {
      start = i;
    }
    if (no !== null && no > 0) prevNo = no;
  }
  return start === 0 ? sorted : sorted.slice(start);
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
): TableData {
  const [state, setState] = useState<LiveState>({
    loading: true,
    connected: false,
    rows: [],
    gameNo: null,
    latestId: null,
    latestDetectedAt: null,
    error: null,
  });
  const [aiState, setAiState] = useState<AiState>({
    loading: false,
    error: null,
    forResultId: null,
    data: null,
  });
  const requestActive = useRef(false);
  const analyzeActive = useRef(false);
  const analyzedIdRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      if (requestActive.current) return;
      requestActive.current = true;
      try {
        const query = new URLSearchParams({ table_name: tableName, limit: '120' });
        const response = await fetch(`${PLATFORM_LINKS.liveResults}?${query.toString()}`, {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        const data = (await response.json()) as LiveResponse;
        if (!response.ok || !data.ok) {
          throw new Error(data.message || '실시간 결과 조회에 실패했습니다.');
        }
        if (cancelled) return;

        const rows = trimToCurrentShoe(
          (data.results || []).filter((row) => ['P', 'B', 'T'].includes(row.result)),
        );
        const latest = rows.length ? rows[rows.length - 1] : null;
        const nextGameNo = latest?.game_no ?? data.game_no ?? null;

        setState({
          loading: false,
          connected: true,
          rows,
          gameNo: nextGameNo,
          latestId: latest?.id ?? data.latest_id ?? null,
          latestDetectedAt: latest?.detected_at ?? data.latest_detected_at ?? null,
          error: null,
        });
      } catch (error) {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          connected: false,
          error: error instanceof Error ? error.message : '실시간 연결 오류',
        }));
      } finally {
        requestActive.current = false;
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [tableName]);

  // 새 결과가 들어왔을 때만 AI 분석 (결과 ID당 1회, 서버 캐시)
  useEffect(() => {
    const latestId = state.latestId;
    if (!latestId || !state.connected) return;
    if (analyzedIdRef.current === latestId) return;
    if (analyzeActive.current) return;

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
        analyzedIdRef.current = latestId;
        setAiState({
          loading: false,
          error: null,
          forResultId: latestId,
          data,
        });
      } catch (error) {
        if (cancelled) return;
        // 실패해도 같은 ID 재호출 폭주 방지 (다음 새 결과에서 재시도)
        analyzedIdRef.current = latestId;
        setAiState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'AI 분석 오류',
        }));
      } finally {
        analyzeActive.current = false;
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [state.latestId, state.connected, tableName]);

  return useMemo(() => {
    const results = state.rows.map((row) => row.result);
    const shoeLabel =
      state.gameNo !== null ? `G${state.gameNo}` : base.stats.shoeNumber;

    const analysis = aiState.data;
    const analysisReady =
      analysis &&
      analysis.source_result_id != null &&
      analysis.source_result_id === state.latestId;

    const gpt = analysisReady && analysis.gpt ? analysis.gpt : fallbackModel('WAIT');
    const claude = analysisReady && analysis.claude ? analysis.claude : fallbackModel('WAIT');
    const gemini = analysisReady && analysis.gemini ? analysis.gemini : fallbackModel('WAIT');

    const finalOpinion: AiOpinion =
      analysisReady && analysis.finalOpinion ? analysis.finalOpinion : 'WAIT';
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
    const autoBetAllowed = Boolean(analysisReady && analysis.auto_bet_allowed);
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
        gameNo: state.gameNo,
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
        currentRound: state.gameNo ?? results.length,
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
        recommendedAmount: autoBetAllowed ? base.ai.recommendedAmount || 0 : 0,
        skipReasons: isActionable ? undefined : [appliedRule, accuracyText],
        discussionSummary: `${modeLabel} · ${accuracyText}`,
        autoBetAllowed,
        shadowMode,
      },
    };
  }, [base, state, aiState, tableName, displayName]);
}
