import { useEffect, useMemo, useRef, useState } from 'react';
import { PLATFORM_LINKS } from '../constants';
import type { GameResult, TableData } from '../types';

type LiveResultRow = {
  id: number;
  table_name: string;
  result: GameResult;
  detected_at: string;
};

type LiveResponse = {
  ok: boolean;
  message?: string;
  table_name?: string;
  latest_id?: number | null;
  latest_detected_at?: string | null;
  results?: LiveResultRow[];
};

type LiveState = {
  loading: boolean;
  connected: boolean;
  rows: LiveResultRow[];
  latestId: number | null;
  latestDetectedAt: string | null;
  error: string | null;
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

function liveOpinion(results: GameResult[]): 'PLAYER' | 'BANKER' | 'WAIT' {
  const decisive = results.filter((item) => item !== 'T');
  if (decisive.length < 2) return 'WAIT';
  const latest = decisive[decisive.length - 1];
  const previous = decisive[decisive.length - 2];
  if (latest !== previous) return 'WAIT';
  return latest === 'P' ? 'PLAYER' : 'BANKER';
}

export default function useLiveTable(base: TableData, tableName = 'MD2709'): TableData {
  const [state, setState] = useState<LiveState>({
    loading: true,
    connected: false,
    rows: [],
    latestId: null,
    latestDetectedAt: null,
    error: null,
  });
  const requestActive = useRef(false);

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
        const rows = (data.results || []).filter((row) =>
          ['P', 'B', 'T'].includes(row.result),
        );
        setState({
          loading: false,
          connected: true,
          rows,
          latestId: data.latest_id ?? null,
          latestDetectedAt: data.latest_detected_at ?? null,
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

  return useMemo(() => {
    const results = state.rows.map((row) => row.result);
    if (!results.length) {
      return {
        ...base,
        name: `SOLAIRE(${tableName})`,
        gameCode: tableName,
        status: state.error ? 'error' : 'analyzing',
        live: {
          connected: state.connected,
          loading: state.loading,
          latestId: state.latestId,
          latestDetectedAt: state.latestDetectedAt,
          error: state.error,
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
        },
        ai: {
          ...base.ai,
          finalOpinion: 'WAIT',
          finalConfidence: 0,
          consensus: '0/3',
          appliedRule: '실시간 데이터 대기',
        },
      };
    }

    const player = results.filter((result) => result === 'P').length;
    const banker = results.filter((result) => result === 'B').length;
    const tie = results.filter((result) => result === 'T').length;
    const opinion = liveOpinion(results);
    const isActionable = opinion !== 'WAIT';
    const confidence = isActionable ? Math.min(75, 50 + Math.max(0, Math.abs(player - banker))) : 45;

    return {
      ...base,
      name: `SOLAIRE(${tableName})`,
      gameCode: tableName,
      status: isActionable ? 'rule_triggered' : 'observing',
      timer: 0,
      live: {
        connected: state.connected,
        loading: state.loading,
        latestId: state.latestId,
        latestDetectedAt: state.latestDetectedAt,
        error: state.error,
      },
      roadmap: buildRoadmap(results),
      stats: {
        ...base.stats,
        player,
        banker,
        tie,
        currentStreak: currentStreak(results),
        shoeProgress: Math.min(100, Math.round((results.length / 80) * 100)),
        currentRound: results.length,
        recentResults: results.slice(-20),
      },
      ai: {
        ...base.ai,
        finalOpinion: opinion,
        finalConfidence: confidence,
        consensus: isActionable ? '2/3' : '0/3',
        appliedRule: isActionable ? '동일 결과 2연속 감지' : '실시간 흐름 관찰',
        recommendedAmount: isActionable ? base.ai.recommendedAmount : 0,
        gpt: { ...base.ai.gpt, opinion },
        gemini: { ...base.ai.gemini, opinion },
        claude: { ...base.ai.claude, opinion: 'WAIT' },
      },
    };
  }, [base, state, tableName]);
}
