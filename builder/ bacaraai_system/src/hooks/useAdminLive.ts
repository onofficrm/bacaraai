import { useCallback, useEffect, useMemo, useState } from 'react';
import { MOCK_TABLES } from '../data';
import type { GameResult, TableData } from '../types';
import {
  fetchAdminOverview,
  fetchAdminState,
  postAdminAction,
  type AdminAuditRow,
  type AdminLivePayload,
  type AdminLiveRow,
  type AdminTableOverview,
} from '../api/adminLive';

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

function normalizeRows(rows: AdminLiveRow[] | undefined): AdminLiveRow[] {
  if (!Array.isArray(rows)) return [];
  return rows.filter((r) => r && ['P', 'B', 'T'].includes(String(r.result || '').toUpperCase()));
}

function tableFromPayload(
  base: TableData,
  payload: AdminLivePayload | null,
  shuffleActive: boolean,
  sourceLabel: string,
): TableData {
  const rows = normalizeRows(payload?.results);
  const results = rows.map((r) => String(r.result).toUpperCase() as GameResult);
  const gameNo = payload?.game_no ?? (results.length ? results.length : null);
  const latestId = payload?.latest_id ?? (rows.length ? rows[rows.length - 1].id : null);
  const manualMode = Boolean(payload?.manual_mode);
  const appliedRule = shuffleActive
    ? '셔플 중'
    : manualMode
      ? '관리자 수동 입력'
      : sourceLabel === 'detector'
        ? '자동 감지'
        : '실시간';

  if (!results.length) {
    return {
      ...base,
      status: shuffleActive ? 'paused' : 'observing',
      live: {
        connected: true,
        loading: false,
        latestId,
        latestDetectedAt: payload?.latest_detected_at ?? null,
        error: payload?.detector_error || null,
        gameNo: gameNo || null,
        shuffleActive,
        manualMode,
      },
      roadmap: [],
      stats: {
        ...base.stats,
        player: 0,
        banker: 0,
        tie: 0,
        currentStreak: shuffleActive ? '셔플 중' : '결과 대기',
        shoeNumber: gameNo ? `G${gameNo}` : base.stats.shoeNumber,
        currentRound: 0,
        recentResults: [],
        shoeProgress: 0,
      },
      ai: {
        ...base.ai,
        finalOpinion: 'WAIT',
        consensus: manualMode ? '수동' : '감지',
        appliedRule,
        recommendedAmount: 0,
        autoBetAllowed: false,
        shadowMode: true,
      },
    };
  }

  const player = results.filter((r) => r === 'P').length;
  const banker = results.filter((r) => r === 'B').length;
  const tie = results.filter((r) => r === 'T').length;

  return {
    ...base,
    status: shuffleActive ? 'paused' : 'observing',
    live: {
      connected: true,
      loading: false,
      latestId,
      latestDetectedAt: payload?.latest_detected_at ?? null,
      error: null,
      gameNo: gameNo || null,
      shuffleActive,
      manualMode,
    },
    roadmap: buildRoadmap(results),
    stats: {
      ...base.stats,
      player,
      banker,
      tie,
      currentStreak: shuffleActive ? '셔플 중' : currentStreak(results),
      shoeNumber: gameNo ? `G${gameNo}` : base.stats.shoeNumber,
      currentRound: typeof gameNo === 'number' ? gameNo : results.length,
      recentResults: results,
      shoeProgress: Math.min(100, Math.round((results.length / 80) * 100)),
    },
    ai: {
      ...base.ai,
      finalOpinion: 'WAIT',
      consensus: manualMode ? '수동' : '감지',
      appliedRule,
      recommendedAmount: 0,
      autoBetAllowed: false,
      shadowMode: true,
    },
  };
}

function overviewToPayload(ov: AdminTableOverview): AdminLivePayload {
  return {
    ok: true,
    table_name: ov.table_name,
    game_no: ov.game_no || null,
    latest_id: ov.latest_id ?? null,
    latest_detected_at: ov.latest_detected_at ?? null,
    count: ov.count,
    source: ov.source || (ov.manual_mode ? 'admin' : 'detector'),
    manual_mode: ov.manual_mode,
    shuffle_active: ov.shuffle_active,
    results: normalizeRows(ov.results),
  };
}

export function useAdminLiveControl(selectedTableId: string | null) {
  const [overview, setOverview] = useState<AdminTableOverview[]>([]);
  const [payload, setPayload] = useState<AdminLivePayload | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [shuffleActive, setShuffleActive] = useState(false);
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
      const [ov, st] = await Promise.all([
        fetchAdminOverview(),
        fetchAdminState(selectedCode),
      ]);
      setOverview(ov);
      setPayload(st.payload);
      setManualMode(st.manual_mode);
      setShuffleActive(st.shuffle_active);
      setAudit(st.audit);
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

  const tables = useMemo(() => {
    const ovMap = new Map(overview.map((o) => [o.table_name, o]));
    return MOCK_TABLES.map((base) => {
      const ov = ovMap.get(base.gameCode);
      const isSelected = base.id === (selectedTableId || MOCK_TABLES[0].id);
      const source = ov?.source || (ov?.manual_mode ? 'admin' : 'detector');
      let livePayload: AdminLivePayload | null = null;
      let shuffle = Boolean(ov?.shuffle_active);

      if (isSelected && payload) {
        livePayload = payload;
        shuffle = shuffleActive;
      } else if (ov) {
        livePayload = overviewToPayload(ov);
      }

      return tableFromPayload(base, livePayload, shuffle, source);
    });
  }, [overview, payload, shuffleActive, selectedTableId]);

  const selectedTable = useMemo(
    () => tables.find((t) => t.id === (selectedTableId || MOCK_TABLES[0].id)) || tables[0],
    [tables, selectedTableId],
  );

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
        if (res.payload) setPayload(res.payload);
        setToast(res.message || '완료');
        window.setTimeout(() => setToast(null), 2800);
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
