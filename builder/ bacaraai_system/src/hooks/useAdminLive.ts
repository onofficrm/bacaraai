import { useCallback, useEffect, useMemo, useState } from 'react';
import { MOCK_TABLES } from '../data';
import type { GameResult, TableData } from '../types';
import {
  fetchAdminOverview,
  fetchAdminState,
  postAdminAction,
  type AdminAuditRow,
  type AdminLivePayload,
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

function tableFromPayload(
  base: TableData,
  payload: AdminLivePayload | null,
  shuffleActive: boolean,
): TableData {
  const rows = payload?.results || [];
  const results = rows.map((r) => r.result);
  const gameNo = payload?.game_no ?? results.length;
  const latestId = payload?.latest_id ?? (rows.length ? rows[rows.length - 1].id : null);

  if (!results.length) {
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
        manualMode: Boolean(payload?.manual_mode),
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
        consensus: '관리자',
        appliedRule: shuffleActive ? '셔플 중' : '관리자 수동 입력',
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
      manualMode: Boolean(payload?.manual_mode),
    },
    roadmap: buildRoadmap(results),
    stats: {
      ...base.stats,
      player,
      banker,
      tie,
      currentStreak: shuffleActive ? '셔플 중' : currentStreak(results),
      shoeNumber: gameNo ? `G${gameNo}` : base.stats.shoeNumber,
      currentRound: gameNo || results.length,
      recentResults: results,
      shoeProgress: Math.min(100, Math.round((results.length / 80) * 100)),
    },
    ai: {
      ...base.ai,
      finalOpinion: 'WAIT',
      consensus: '관리자',
      appliedRule: shuffleActive ? '셔플 중' : '관리자 수동 입력',
      recommendedAmount: 0,
      autoBetAllowed: false,
      shadowMode: true,
    },
  };
}

export function useAdminLiveControl(selectedTableId: string | null) {
  const [overview, setOverview] = useState<AdminTableOverview[]>([]);
  const [payload, setPayload] = useState<AdminLivePayload | null>(null);
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
      const livePayload =
        isSelected && payload
          ? payload
          : ov
            ? ({
                ok: true,
                table_name: base.gameCode,
                game_no: ov.game_no,
                count: ov.count,
                manual_mode: ov.manual_mode,
                shuffle_active: ov.shuffle_active,
                results: [],
              } as AdminLivePayload)
            : null;
      return tableFromPayload(
        base,
        livePayload,
        Boolean(ov?.shuffle_active && isSelected ? shuffleActive : ov?.shuffle_active),
      );
    });
  }, [overview, payload, shuffleActive, selectedTableId]);

  const selectedTable = useMemo(
    () => tables.find((t) => t.id === (selectedTableId || MOCK_TABLES[0].id)) || tables[0],
    [tables, selectedTableId],
  );

  const runAction = useCallback(
    async (
      action: 'add_result' | 'undo_last' | 'new_game' | 'set_shuffle',
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
    shuffleActive,
    refresh,
    addResult: (result: 'P' | 'B' | 'T') => runAction('add_result', { result }),
    undoLast: () => runAction('undo_last'),
    newGame: () => runAction('new_game'),
    setShuffle: (active: boolean) => runAction('set_shuffle', { active: active ? '1' : '0' }),
  };
}
