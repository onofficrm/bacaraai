import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SessionConfig } from '../types';

export type SessionMode = 'observe' | 'shadow' | 'live';
export type SessionStatus = 'idle' | 'running' | 'paused';

export type SessionState = {
  status: SessionStatus;
  mode: SessionMode | null;
  config: SessionConfig;
  startedAt: number | null;
  elapsedMs: number;
  pnl: number;
  martinStage: number;
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

const DEFAULT_STATE: SessionState = {
  status: 'idle',
  mode: null,
  config: DEFAULT_SESSION_CONFIG,
  startedAt: null,
  elapsedMs: 0,
  pnl: 0,
  martinStage: 1,
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
      // Don't auto-resume a previous running timer across reloads — keep paused/idle-friendly
      status: parsed.status === 'running' ? 'paused' : parsed.status || 'idle',
      startedAt: null,
      elapsedMs: Number(parsed.elapsedMs) || 0,
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

export default function useSession() {
  const [state, setState] = useState<SessionState>(() =>
    typeof localStorage !== 'undefined' ? readStored() : DEFAULT_STATE,
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (state.status !== 'running') return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [state.status]);

  const elapsedMs = useMemo(() => {
    if (state.status === 'running' && state.startedAt) {
      return state.elapsedMs + (now - state.startedAt);
    }
    return state.elapsedMs;
  }, [state.status, state.startedAt, state.elapsedMs, now]);

  const startSession = useCallback((mode: SessionMode, config: SessionConfig) => {
    setState({
      status: 'running',
      mode,
      config,
      startedAt: Date.now(),
      elapsedMs: 0,
      pnl: 0,
      martinStage: 1,
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
    setState((prev) => ({
      ...prev,
      status: 'idle',
      mode: null,
      startedAt: null,
      elapsedMs: 0,
      pnl: 0,
      martinStage: 1,
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

  const isActive = state.status === 'running' || state.status === 'paused';

  return {
    ...state,
    elapsedMs,
    isActive,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    updateConfig,
    setMode,
  };
}
