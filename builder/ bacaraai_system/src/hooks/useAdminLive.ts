import { useCallback, useEffect, useMemo, useState } from 'react';
import { PLATFORM_LINKS } from '../constants';
import { MOCK_TABLES } from '../data';
import type { GameResult, TableData } from '../types';
import {
  fetchAdminOverview,
  fetchAdminState,
  postAdminAction,
  type AdminAuditRow,
  type AdminTableOverview,
} from '../api/adminLive';
import {
  verifyLiveFeedIntegrity,
  type LiveFeedResponse,
  type LiveIntegrity,
} from '../utils/liveIntegrity';
import { parseGameStatus, type GameStatus } from '../utils/gameStatus';

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
    if (!last || !lastDecisive || lastDecisive !== result) columns.push([result]);
    else last.push(result);
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

type NormalizedLive = {
  code: string;
  rows: Array<{
    id: number;
    result: GameResult;
    game_no?: number | null;
    detected_at: string;
  }>;
  gameNo: number | null;
  latestId: number | null;
  latestDetectedAt: string | null;
  shuffleActive: boolean;
  gameStatus: GameStatus | null;
  manualMode: boolean;
  source: string;
  integrity: LiveIntegrity | null;
  syncWarning: string | null;
  error: string | null;
};

async function fetchCanonicalLive(
  tableCode: string,
  force = false,
  fpRetry = 0,
): Promise<NormalizedLive> {
  const query = new URLSearchParams({ table_name: tableCode, limit: '800' });
  if (force) query.set('force', '1');
  const res = await fetch(`${PLATFORM_LINKS.liveResults}?${query}`, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  const data = (await res.json()) as LiveFeedResponse;
  if (!res.ok || !data.ok) {
    throw new Error(data.message || `${tableCode} 라이브 조회 실패`);
  }

  const rows = (data.results || [])
    .map((row) => ({
      id: Number(row.id),
      result: String(row.result || '')
        .trim()
        .toUpperCase() as GameResult,
      game_no: row.game_no ?? null,
      detected_at: String(row.detected_at || ''),
    }))
    .filter((r) => Number.isFinite(r.id) && r.id > 0 && ['P', 'B', 'T'].includes(r.result))
    .sort((a, b) => a.id - b.id);

  const check = await verifyLiveFeedIntegrity({ ...data, results: rows });
  if (!check.fpMatch && fpRetry < 1) {
    return fetchCanonicalLive(tableCode, true, fpRetry + 1);
  }
  // 감지가 앞서면 강제 재조회로 한 번 더 맞춤
  if (!check.synced && !force && !data.manual_mode) {
    return fetchCanonicalLive(tableCode, true, fpRetry);
  }

  const latest = rows.length ? rows[rows.length - 1] : null;
  return {
    code: tableCode,
    rows,
    gameNo: latest?.game_no ?? data.game_no ?? null,
    latestId: latest?.id ?? data.latest_id ?? null,
    latestDetectedAt: latest?.detected_at ?? data.latest_detected_at ?? null,
    shuffleActive: Boolean(data.shuffle_active),
    gameStatus: parseGameStatus(data.game_status),
    manualMode: Boolean(data.manual_mode),
    source: String(data.source || (data.manual_mode ? 'admin_manual' : 'detector')),
    integrity: data.integrity || null,
    syncWarning: check.healed
      ? check.message || '감지 새 결과로 자동 복구됨'
      : !check.synced || !check.fpMatch
        ? check.message
        : null,
    error: null,
  };
}

function tableFromLive(base: TableData, live: NormalizedLive): TableData {
  const results = live.rows.map((r) => r.result);
  const gameNo = results.length > 0 ? results.length : live.gameNo;
  const appliedRule = live.shuffleActive
    ? '셔플중'
    : live.gameStatus === 'lobby'
      ? '게임종료(lobby)'
      : live.gameStatus === 'game'
        ? '게임중'
      : live.manualMode
      ? '관리자 수동 입력'
      : '자동 감지(동일 피드)';

  return {
    ...base,
    status: live.shuffleActive ? 'paused' : 'observing',
    live: {
      connected: !live.error,
      loading: false,
      latestId: live.latestId,
      latestDetectedAt: live.latestDetectedAt,
      error: live.error,
      gameNo,
      shuffleActive: live.shuffleActive,
      gameStatus: live.gameStatus,
      manualMode: live.manualMode,
      resultsFp: live.integrity?.results_fp ?? null,
      syncWarning: live.syncWarning,
      integritySynced: live.integrity ? live.integrity.synced !== false : true,
    },
    roadmap: buildRoadmap(results),
    stats: {
      ...base.stats,
      player: results.filter((r) => r === 'P').length,
      banker: results.filter((r) => r === 'B').length,
      tie: results.filter((r) => r === 'T').length,
      currentStreak: live.shuffleActive ? '셔플 중' : currentStreak(results),
      shoeNumber: gameNo ? `G${gameNo}` : base.stats.shoeNumber,
      currentRound: typeof gameNo === 'number' ? gameNo : results.length,
      recentResults: results,
      shoeProgress: Math.min(100, Math.round((results.length / 80) * 100)),
    },
    ai: {
      ...base.ai,
      finalOpinion: 'WAIT',
      consensus: live.manualMode ? '수동' : '감지',
      appliedRule,
      recommendedAmount: 0,
      autoBetAllowed: false,
      shadowMode: true,
    },
  };
}

export function useAdminLiveControl(selectedTableId: string | null) {
  const [overview, setOverview] = useState<AdminTableOverview[]>([]);
  const [lives, setLives] = useState<Record<string, NormalizedLive>>({});
  const [audit, setAudit] = useState<AdminAuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedBase = useMemo(
    () => MOCK_TABLES.find((t) => t.id === selectedTableId) || MOCK_TABLES[0],
    [selectedTableId],
  );
  const selectedCode = selectedBase.gameCode;

  const refresh = useCallback(async () => {
    try {
      // 1) 게임과 동일한 live_results 파이프 (표시=감지 보장)
      const liveList = await Promise.all(
        MOCK_TABLES.map(async (t) => {
          try {
            return await fetchCanonicalLive(t.gameCode);
          } catch (e) {
            return {
              code: t.gameCode,
              rows: [],
              gameNo: null,
              latestId: null,
              latestDetectedAt: null,
              shuffleActive: false,
              gameStatus: null,
              manualMode: false,
              source: 'error',
              integrity: null,
              syncWarning: null,
              error: e instanceof Error ? e.message : '조회 실패',
            } satisfies NormalizedLive;
          }
        }),
      );
      const liveMap: Record<string, NormalizedLive> = {};
      liveList.forEach((l) => {
        liveMap[l.code] = l;
      });
      setLives(liveMap);

      // 2) 감사 로그·플래그 (선택 테이블)
      const [ov, st] = await Promise.all([
        fetchAdminOverview().catch(() => [] as AdminTableOverview[]),
        fetchAdminState(selectedCode).catch(() => null),
      ]);
      setOverview(ov);
      if (st) setAudit(st.audit);

      const healed = liveList.find((l) => l.syncWarning)?.syncWarning;
      if (healed) {
        setToast(healed);
        window.setTimeout(() => setToast(null), 3600);
      }

      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패');
    } finally {
      setLoading(false);
    }
  }, [selectedCode]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 1000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const tables = useMemo(
    () =>
      MOCK_TABLES.map((base) => {
        const live = lives[base.gameCode];
        if (!live) {
          return {
            ...base,
            status: 'observing' as const,
            live: {
              connected: false,
              loading: true,
              latestId: null,
              latestDetectedAt: null,
              error: null,
              shuffleActive: false,
              gameStatus: null,
              manualMode: false,
            },
            roadmap: [],
            stats: {
              ...base.stats,
              player: 0,
              banker: 0,
              tie: 0,
              currentStreak: '결과 대기',
              currentRound: 0,
              recentResults: [],
              shoeProgress: 0,
            },
            ai: {
              ...base.ai,
              finalOpinion: 'WAIT' as const,
              recommendedAmount: 0,
              autoBetAllowed: false,
              shadowMode: true,
            },
          };
        }
        return tableFromLive(base, live);
      }),
    [lives],
  );

  const selectedTable = useMemo(
    () => tables.find((t) => t.id === (selectedTableId || MOCK_TABLES[0].id)) || tables[0],
    [tables, selectedTableId],
  );

  const selectedLive = lives[selectedCode];
  const manualMode = Boolean(selectedLive?.manualMode);
  const shuffleActive = Boolean(selectedLive?.shuffleActive);

  const runAction = useCallback(
    async (
      action: 'add_result' | 'undo_last' | 'new_game' | 'set_shuffle' | 'resume_auto',
      extra: Record<string, string> = {},
    ) => {
      setBusy(true);
      setError(null);
      try {
        const res = await postAdminAction(action, {
          table_name: selectedCode,
          ...extra,
        });
        setToast(res.message || '완료');
        window.setTimeout(() => setToast(null), 2800);
        // 변이 직후 반드시 live_results 재조회 (캐시 무효화 반영)
        await refresh();
        return res;
      } catch (e) {
        const msg = e instanceof Error ? e.message : '실패';
        setError(msg);
        setToast(msg);
        window.setTimeout(() => setToast(null), 3200);
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [selectedCode, refresh],
  );

  return {
    tables,
    selectedTable,
    selectedCode,
    overview,
    audit,
    loading,
    busy,
    toast,
    error,
    manualMode,
    shuffleActive,
    refresh,
    addResult: (result: 'P' | 'B' | 'T') => runAction('add_result', { result }),
    undoLast: () => runAction('undo_last'),
    newGame: () => runAction('new_game'),
    setShuffle: (active: boolean) => runAction('set_shuffle', { active: active ? '1' : '0' }),
    resumeAuto: () => runAction('resume_auto'),
  };
}
