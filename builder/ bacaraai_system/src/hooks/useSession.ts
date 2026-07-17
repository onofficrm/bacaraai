import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SessionConfig } from '../types';

export type SessionMode = 'observe' | 'shadow' | 'live';
export type SessionStatus = 'idle' | 'running' | 'paused';
export type BetSide = 'PLAYER' | 'BANKER';

export type PendingBet = {
  id: string;
  tableId: string;
  tableName: string;
  side: BetSide;
  amount: number;
  placedAt: number;
};

export type LastBetResult = {
  id: string;
  tableId: string;
  tableName: string;
  side: BetSide;
  amount: number;
  outcome: 'P' | 'B' | 'T';
  won: boolean | null;
  pnlDelta: number;
  message: string;
  at: number;
};

export type PlaceBetInput = {
  tableId: string;
  tableName: string;
  side: BetSide;
  amount: number;
};

export type PlaceBetResult =
  | { ok: true }
  | { ok: false; error: string };

export type SessionState = {
  status: SessionStatus;
  mode: SessionMode | null;
  config: SessionConfig;
  startedAt: number | null;
  elapsedMs: number;
  pnl: number;
  martinStage: number;
  pendingBet: PendingBet | null;
  lastBetResult: LastBetResult | null;
  skippedCount: number;
};

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  seed: 4_000_000,
  initialBet: 10_000,
  winCut: 1_000_000,
  lossCut: -2_000_000,
  maxMartin: 8,
  maxBet: 2_000_000,
  maxTables: 1,
  maxTime: 90,
};

const STORAGE_KEY = 'bacara_session_state_v1';
const SETTLE_MS = 1400;

const DEFAULT_STATE: SessionState = {
  status: 'idle',
  mode: null,
  config: DEFAULT_SESSION_CONFIG,
  startedAt: null,
  elapsedMs: 0,
  pnl: 0,
  martinStage: 1,
  pendingBet: null,
  lastBetResult: null,
  skippedCount: 0,
};

function readStored(): SessionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<SessionState>;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      config: { ...DEFAULT_SESSION_CONFIG, ...(parsed.config || {}) },
      status: parsed.status === 'running' ? 'paused' : parsed.status || 'idle',
      startedAt: null,
      elapsedMs: Number(parsed.elapsedMs) || 0,
      pendingBet: null,
      lastBetResult: parsed.lastBetResult ?? null,
      skippedCount: Number(parsed.skippedCount) || 0,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function parseMoneyInput(value: string): number {
  const negative = value.trim().startsWith('-');
  const digits = value.replace(/[^\d]/g, '');
  const n = Number(digits) || 0;
  return negative ? -n : n;
}

export function formatMoney(amount: number, withSign = false): string {
  const abs = new Intl.NumberFormat('ko-KR').format(Math.abs(amount));
  if (!withSign) return `${abs}원`;
  if (amount > 0) return `+${abs}원`;
  if (amount < 0) return `-${abs}원`;
  return `${abs}원`;
}

export function formatMoneyInput(amount: number, withSign = false): string {
  const abs = new Intl.NumberFormat('ko-KR').format(Math.abs(amount));
  if (!withSign) return abs;
  if (amount > 0) return `+${abs}`;
  if (amount < 0) return `-${abs}`;
  return abs;
}

/** Martingale capital needed for N stages: initial * (2^n - 1) */
export function martinRequiredCapital(initialBet: number, maxMartin: number): number {
  const stages = Math.max(1, Math.min(20, Math.floor(maxMartin)));
  return initialBet * (2 ** stages - 1);
}

export function nextBetAmount(initialBet: number, stage: number, maxBet: number): number {
  const s = Math.max(1, stage);
  return Math.min(initialBet * 2 ** (s - 1), maxBet);
}

export function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}시간 ${m}분 ${s}초`;
  return `${m}분 ${s.toString().padStart(2, '0')}초`;
}

export function modeLabel(mode: SessionMode | null): string {
  switch (mode) {
    case 'observe':
      return '관찰 모드';
    case 'shadow':
      return '섀도 모드';
    case 'live':
      return 'AI 추천 모드';
    default:
      return '대기 중';
  }
}

export function bankroll(seed: number, pnl: number): number {
  return Math.max(0, seed + pnl);
}

export function computeGauge(pnl: number, lossCut: number, winCut: number) {
  const lossAbs = Math.abs(lossCut);
  const winAbs = Math.max(1, winCut);
  const total = lossAbs + winAbs;
  const zeroAt = (lossAbs / total) * 100;
  const clamped = Math.max(lossCut, Math.min(winCut, pnl));
  const fillWidth =
    clamped >= 0
      ? (clamped / winAbs) * (100 - zeroAt)
      : (Math.abs(clamped) / lossAbs) * zeroAt;
  const fillLeft = clamped >= 0 ? zeroAt : zeroAt - fillWidth;
  const toLossCut = Math.max(0, pnl - lossCut);
  const toWinCut = Math.max(0, winCut - pnl);
  let zone: 'safe' | 'near_win' | 'near_loss' | 'hit_win' | 'hit_loss' = 'safe';
  if (pnl >= winCut) zone = 'hit_win';
  else if (pnl <= lossCut) zone = 'hit_loss';
  else if (pnl >= winCut * 0.8) zone = 'near_win';
  else if (pnl <= lossCut * 0.8) zone = 'near_loss';
  return { zeroAt, fillLeft, fillWidth, toLossCut, toWinCut, zone };
}

function rollOutcome(): 'P' | 'B' | 'T' {
  const r = Math.random();
  if (r < 0.446) return 'P';
  if (r < 0.892) return 'B';
  return 'T';
}

function settlePnl(side: BetSide, amount: number, outcome: 'P' | 'B' | 'T'): {
  won: boolean | null;
  pnlDelta: number;
  message: string;
} {
  if (outcome === 'T') {
    return { won: null, pnlDelta: 0, message: '타이 — 베팅금이 반환되었습니다' };
  }
  const hit = (side === 'PLAYER' && outcome === 'P') || (side === 'BANKER' && outcome === 'B');
  if (hit) {
    const pnlDelta = side === 'BANKER' ? Math.floor(amount * 0.95) : amount;
    return {
      won: true,
      pnlDelta,
      message:
        side === 'BANKER'
          ? `Banker 적중 (+${formatMoney(pnlDelta)}, 5% 수수료 반영)`
          : `Player 적중 (+${formatMoney(pnlDelta)})`,
    };
  }
  return {
    won: false,
    pnlDelta: -amount,
    message: `${outcome === 'P' ? 'Player' : 'Banker'} 결과 — ${formatMoney(amount)} 손실`,
  };
}

export default function useSession() {
  const [state, setState] = useState<SessionState>(() =>
    typeof localStorage !== 'undefined' ? readStored() : DEFAULT_STATE,
  );
  const [now, setNow] = useState(() => Date.now());
  const settleTimer = useRef<number | null>(null);
  const onCutRef = useRef<((type: 'wincut' | 'losscut') => void) | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (state.status !== 'running') return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [state.status]);

  useEffect(() => {
    return () => {
      if (settleTimer.current) window.clearTimeout(settleTimer.current);
    };
  }, []);

  const elapsedMs = useMemo(() => {
    if (state.status === 'running' && state.startedAt) {
      return state.elapsedMs + (now - state.startedAt);
    }
    return state.elapsedMs;
  }, [state.status, state.startedAt, state.elapsedMs, now]);

  const clearSettleTimer = () => {
    if (settleTimer.current) {
      window.clearTimeout(settleTimer.current);
      settleTimer.current = null;
    }
  };

  const startSession = useCallback((mode: SessionMode, config: SessionConfig) => {
    clearSettleTimer();
    setState({
      status: 'running',
      mode,
      config,
      startedAt: Date.now(),
      elapsedMs: 0,
      pnl: 0,
      martinStage: 1,
      pendingBet: null,
      lastBetResult: null,
      skippedCount: 0,
    });
  }, []);

  const pauseSession = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'running' || !prev.startedAt) return prev;
      return {
        ...prev,
        status: 'paused',
        elapsedMs: prev.elapsedMs + (Date.now() - prev.startedAt),
        startedAt: null,
      };
    });
  }, []);

  const resumeSession = useCallback(() => {
    setState((prev) => {
      if (prev.status !== 'paused') return prev;
      return {
        ...prev,
        status: 'running',
        startedAt: Date.now(),
      };
    });
  }, []);

  const stopSession = useCallback(() => {
    clearSettleTimer();
    setState((prev) => ({
      ...prev,
      status: 'idle',
      mode: null,
      startedAt: null,
      elapsedMs: 0,
      pnl: 0,
      martinStage: 1,
      pendingBet: null,
      lastBetResult: null,
      skippedCount: 0,
    }));
  }, []);

  const updateConfig = useCallback((config: SessionConfig) => {
    setState((prev) => ({ ...prev, config }));
  }, []);

  const setMode = useCallback((mode: SessionMode) => {
    setState((prev) => ({
      ...prev,
      mode,
      status: prev.status === 'idle' ? 'running' : prev.status,
      startedAt: prev.status === 'idle' || prev.status === 'paused' ? Date.now() : prev.startedAt,
    }));
  }, []);

  const setCutHandler = useCallback((handler: ((type: 'wincut' | 'losscut') => void) | null) => {
    onCutRef.current = handler;
  }, []);

  const placeBet = useCallback((input: PlaceBetInput): PlaceBetResult => {
    const prev = stateRef.current;

    if (prev.status !== 'running') {
      return {
        ok: false,
        error:
          prev.status === 'paused'
            ? '일시정지 중입니다. 재개 후 베팅하세요.'
            : '먼저 세션을 시작해 주세요.',
      };
    }
    if (prev.mode === 'observe') {
      return {
        ok: false,
        error: '관찰 모드에서는 베팅할 수 없습니다. AI 추천/섀도 모드로 전환하세요.',
      };
    }
    if (prev.pendingBet) {
      return { ok: false, error: '이전 베팅 결과를 확인 중입니다.' };
    }
    if (input.side !== 'PLAYER' && input.side !== 'BANKER') {
      return { ok: false, error: 'Player 또는 Banker만 베팅할 수 있습니다.' };
    }

    const amount = Math.floor(input.amount);
    if (amount <= 0) {
      return { ok: false, error: '베팅 금액을 입력해 주세요.' };
    }
    if (amount > prev.config.maxBet) {
      return { ok: false, error: `1회 최대 베팅액은 ${formatMoney(prev.config.maxBet)}입니다.` };
    }

    const available = bankroll(prev.config.seed, prev.pnl);
    if (amount > available) {
      return { ok: false, error: `잔여 시드가 부족합니다. (가능 ${formatMoney(available)})` };
    }

    if (prev.martinStage > prev.config.maxMartin) {
      return {
        ok: false,
        error: '최대 마틴 단계에 도달했습니다. 관망하거나 세션을 재설정하세요.',
      };
    }

    const pending: PendingBet = {
      id: `bet_${Date.now()}`,
      tableId: input.tableId,
      tableName: input.tableName,
      side: input.side,
      amount,
      placedAt: Date.now(),
    };

    clearSettleTimer();
    settleTimer.current = window.setTimeout(() => {
      setState((curr) => {
        if (!curr.pendingBet || curr.pendingBet.id !== pending.id) return curr;
        const outcome = rollOutcome();
        const settled = settlePnl(curr.pendingBet.side, curr.pendingBet.amount, outcome);
        const nextPnl = curr.pnl + settled.pnlDelta;
        let nextStage = curr.martinStage;
        if (settled.won === true) nextStage = 1;
        else if (settled.won === false) {
          nextStage = Math.min(curr.config.maxMartin + 1, curr.martinStage + 1);
        }

        const result: LastBetResult = {
          id: curr.pendingBet.id,
          tableId: curr.pendingBet.tableId,
          tableName: curr.pendingBet.tableName,
          side: curr.pendingBet.side,
          amount: curr.pendingBet.amount,
          outcome,
          won: settled.won,
          pnlDelta: settled.pnlDelta,
          message: settled.message,
          at: Date.now(),
        };

        window.setTimeout(() => {
          if (nextPnl >= curr.config.winCut) onCutRef.current?.('wincut');
          else if (nextPnl <= curr.config.lossCut) onCutRef.current?.('losscut');
        }, 0);

        return {
          ...curr,
          pnl: nextPnl,
          martinStage: nextStage,
          pendingBet: null,
          lastBetResult: result,
        };
      });
      settleTimer.current = null;
    }, SETTLE_MS);

    setState((curr) => ({
      ...curr,
      pendingBet: pending,
      lastBetResult: null,
    }));

    return { ok: true };
  }, []);

  const skipRound = useCallback((tableId?: string) => {
    setState((prev) => {
      if (prev.pendingBet) return prev;
      return {
        ...prev,
        skippedCount: prev.skippedCount + 1,
        lastBetResult: {
          id: `skip_${Date.now()}`,
          tableId: tableId || '',
          tableName: '',
          side: 'PLAYER',
          amount: 0,
          outcome: 'T',
          won: null,
          pnlDelta: 0,
          message: '이번 회차를 건너뛰었습니다',
          at: Date.now(),
        },
      };
    });
  }, []);

  const clearLastBetResult = useCallback(() => {
    setState((prev) => ({ ...prev, lastBetResult: null }));
  }, []);

  const isActive = state.status === 'running' || state.status === 'paused';
  const availableBankroll = bankroll(state.config.seed, state.pnl);
  const suggestedBet = nextBetAmount(
    state.config.initialBet,
    Math.min(state.martinStage, state.config.maxMartin),
    state.config.maxBet,
  );

  return {
    ...state,
    elapsedMs,
    isActive,
    availableBankroll,
    suggestedBet,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    updateConfig,
    setMode,
    placeBet,
    skipRound,
    clearLastBetResult,
    setCutHandler,
  };
}
