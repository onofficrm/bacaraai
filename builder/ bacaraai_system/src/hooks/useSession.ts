import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SessionConfig } from '../types';
import {
  emitWalletBalance,
  walletCancelBet,
  walletPlaceBet,
  walletSettleBet,
} from '../api/walletBet';
import { normalizePatternSegments } from '../utils/patternMatch';
import { recordBetResult } from '../utils/betHistory';

export type SessionMode = 'observe' | 'shadow' | 'live';
export type SessionStatus = 'idle' | 'running' | 'paused';
export type BetSide = 'PLAYER' | 'BANKER' | 'TIE';

export type PendingBet = {
  id: string;
  tableId: string;
  tableName: string;
  side: BetSide;
  amount: number;
  placedAt: number;
  /** 라이브 테이블: 베팅 시점의 마지막 결과 id (이후 더 큰 id 가 오면 정산) */
  baselineLatestId?: number | null;
  /** 베팅 시점 결과 개수 (id 보조 신호) */
  baselineResultCount?: number;
  /** true 면 절대 시뮬레이션 정산하지 않고 다음 실결과 대기 */
  waitForLiveResult?: boolean;
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
  /** 게임 기록용 */
  appliedRule?: string;
  martinStage?: number;
};

export type PlaceBetInput = {
  tableId: string;
  tableName: string;
  side: BetSide;
  amount: number;
  /** 라이브 결과 id — 있으면 랜덤 대신 다음 실결과로 정산 */
  baselineLatestId?: number | null;
  /** 베팅 시점까지의 결과 수 */
  baselineResultCount?: number;
  /** true 면 다음 실결과까지 대기 (시뮬레이션 금지) */
  waitForLiveResult?: boolean;
  /** 가상머니 잔액 (있으면 시드 대신 이 값으로 한도 검사) */
  availableBalance?: number;
};

export type PlaceBetResult =
  | { ok: true }
  | { ok: false; error: string };

export type PlaceBetFn = (input: PlaceBetInput) => Promise<PlaceBetResult>;

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
  maxTables: 8,
  maxTime: 90,
  strategy: 'pattern',
  patternSegments: [
    { side: 'P', count: 4, atLeast: true },
    { side: 'B', count: 1, atLeast: false },
  ],
  patternBetSide: 'BANKER',
  amountMode: 'martin',
  customSteps: [],
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

function normalizeConfig(partial?: Partial<SessionConfig>): SessionConfig {
  const merged = { ...DEFAULT_SESSION_CONFIG, ...(partial || {}) };
  const patternSegments = normalizePatternSegments(merged);
  return {
    ...merged,
    patternSegments:
      patternSegments.length > 0
        ? patternSegments
        : DEFAULT_SESSION_CONFIG.patternSegments,
  };
}

function readStored(): SessionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<SessionState>;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      config: normalizeConfig(parsed.config),
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

/** 마틴 또는 사용자 지정 단계 금액 */
export function resolveBetAmount(config: SessionConfig, stage: number): number {
  if (config.amountMode === 'custom' && config.customSteps?.length) {
    const idx = Math.max(0, Math.min(stage - 1, config.customSteps.length - 1));
    const amt = config.customSteps[idx] ?? config.initialBet;
    return Math.min(Math.max(0, amt), config.maxBet);
  }
  return nextBetAmount(config.initialBet, stage, config.maxBet);
}

export function strategyLabel(strategy: SessionConfig['strategy'] | undefined): string {
  return strategy === 'pattern' ? '내 패턴 규칙' : 'AI 추천대로';
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
      return '오토 · 관망';
    case 'shadow':
      return '오토 · 섀도';
    case 'live':
      return '오토베팅';
    default:
      return '오토베팅 꺼짐';
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

function sideLabel(side: BetSide): string {
  if (side === 'BANKER') return 'Banker';
  if (side === 'TIE') return 'Tie';
  return 'Player';
}

function outcomeLabel(outcome: 'P' | 'B' | 'T'): string {
  if (outcome === 'B') return 'Banker';
  if (outcome === 'T') return 'Tie';
  return 'Player';
}

export function settlePnl(side: BetSide, amount: number, outcome: 'P' | 'B' | 'T'): {
  won: boolean | null;
  pnlDelta: number;
  message: string;
} {
  // Tie 베팅: 적중 시 8배 (원금 제외 순이익), 미적중 시 전액 손실
  if (side === 'TIE') {
    if (outcome === 'T') {
      const pnlDelta = amount * 8;
      return {
        won: true,
        pnlDelta,
        message: `Tie 적중 (+${formatMoney(pnlDelta)}, 8배)`,
      };
    }
    return {
      won: false,
      pnlDelta: -amount,
      message: `${outcomeLabel(outcome)} 결과 — Tie 미적중 ${formatMoney(amount)} 손실`,
    };
  }

  // P/B 베팅 중 타이 나오면 푸시(반환)
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
          ? `Banker 적중 · 순익 +${formatMoney(pnlDelta)} (5% 수수료) · 입금 ${formatMoney(amount + pnlDelta)}`
          : `Player 적중 · 순익 +${formatMoney(pnlDelta)} · 입금 ${formatMoney(amount * 2)}`,
    };
  }
  return {
    won: false,
    pnlDelta: -amount,
    message: `${outcomeLabel(outcome)} 결과 — ${sideLabel(side)} 베팅 ${formatMoney(amount)} 손실`,
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

  // setState 밖에서 게임 기록 저장 (updater 내부 side-effect 로 유실되던 문제 방지)
  const recordedBetIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const r = state.lastBetResult;
    if (!r?.id) return;
    if (recordedBetIdsRef.current.has(r.id)) return;
    recordedBetIdsRef.current.add(r.id);
    recordBetResult(r, {
      martinStage: r.martinStage ?? state.martinStage,
      appliedRule: r.appliedRule || '직접/오토 베팅',
    });
  }, [state.lastBetResult, state.martinStage]);

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
      config: normalizeConfig(config),
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
    setState((prev) => ({ ...prev, config: normalizeConfig(config) }));
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

  const applySettlement = useCallback((
    curr: SessionState,
    pending: PendingBet,
    outcome: 'P' | 'B' | 'T',
  ): SessionState => {
    const settled = settlePnl(pending.side, pending.amount, outcome);
    const nextPnl = curr.pnl + settled.pnlDelta;
    let nextStage = curr.martinStage;
    if (settled.won === true) nextStage = 1;
    else if (settled.won === false) {
      nextStage = Math.min(curr.config.maxMartin + 1, curr.martinStage + 1);
    }

    const result: LastBetResult = {
      id: pending.id,
      tableId: pending.tableId,
      tableName: pending.tableName,
      side: pending.side,
      amount: pending.amount,
      outcome,
      won: settled.won,
      pnlDelta: settled.pnlDelta,
      message: settled.message,
      at: Date.now(),
      appliedRule: curr.status === 'running' || curr.status === 'paused' ? '오토베팅' : '직접 베팅',
      martinStage: curr.martinStage,
    };

    // 가상머니 정산 입금 (차감된 원금 기준)
    void walletSettleBet({
      amount: pending.amount,
      side: pending.side,
      outcome,
      tableName: pending.tableName,
    }).then((res) => {
      if (res.ok && typeof res.balance === 'number') {
        emitWalletBalance(res.balance);
      }
    });

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
  }, []);

  const placeBet = useCallback(async (input: PlaceBetInput): Promise<PlaceBetResult> => {
    const prev = stateRef.current;
    const autoBetting = prev.status === 'running';

    // 수동 베팅은 오토베팅(세션) 없이도 가능. 일시정지 중인 오토베팅만 막음.
    if (prev.status === 'paused') {
      return {
        ok: false,
        error: '오토베팅이 일시정지 중입니다. 재개하거나 오토베팅을 종료한 뒤 수동 베팅하세요.',
      };
    }
    if (prev.pendingBet) {
      return { ok: false, error: '이전 베팅 결과를 확인 중입니다.' };
    }
    if (input.side !== 'PLAYER' && input.side !== 'BANKER' && input.side !== 'TIE') {
      return { ok: false, error: 'Player, Banker, Tie 중 하나를 선택해 주세요.' };
    }

    const amount = Math.floor(input.amount);
    if (amount <= 0) {
      return { ok: false, error: '베팅 금액을 입력해 주세요.' };
    }
    if (amount > prev.config.maxBet) {
      return { ok: false, error: `1회 최대 베팅액은 ${formatMoney(prev.config.maxBet)}입니다.` };
    }

    const available =
      typeof input.availableBalance === 'number'
        ? Math.max(0, input.availableBalance)
        : bankroll(prev.config.seed, prev.pnl);
    if (amount > available) {
      return { ok: false, error: `가상머니가 부족합니다. (가능 ${formatMoney(available)})` };
    }

    // 마틴 한도는 오토베팅 진행 중에만 적용
    if (autoBetting && prev.martinStage > prev.config.maxMartin) {
      return {
        ok: false,
        error: '최대 마틴 단계에 도달했습니다. 오토베팅을 재설정하세요.',
      };
    }

    // 가상머니 즉시 차감
    const walletRes = await walletPlaceBet({
      amount,
      side: input.side,
      tableName: input.tableName,
    });
    if (!walletRes.ok) {
      return {
        ok: false,
        error: walletRes.message || '가상머니 차감에 실패했습니다. 로그인·잔액을 확인해 주세요.',
      };
    }
    if (typeof walletRes.balance === 'number') {
      emitWalletBalance(walletRes.balance);
    }

    const waitForLiveResult = Boolean(input.waitForLiveResult);
    const baselineLatestId =
      typeof input.baselineLatestId === 'number' ? input.baselineLatestId : null;
    const useLiveSettle = waitForLiveResult || baselineLatestId !== null;

    const pending: PendingBet = {
      id: `bet_${Date.now()}`,
      tableId: input.tableId,
      tableName: input.tableName,
      side: input.side,
      amount,
      placedAt: Date.now(),
      baselineLatestId: useLiveSettle ? (baselineLatestId ?? 0) : null,
      baselineResultCount:
        typeof input.baselineResultCount === 'number' ? input.baselineResultCount : 0,
      waitForLiveResult: useLiveSettle,
    };

    clearSettleTimer();

    // 손익(pnl)은 정산 시에만 반영 — 베팅 접수 시점에는 손실로 잡지 않음
    setState((curr) => ({
      ...curr,
      pendingBet: pending,
      lastBetResult: null,
    }));

    if (!useLiveSettle) {
      // 라이브가 아닌 데모 테이블만 짧은 시뮬레이션 정산
      settleTimer.current = window.setTimeout(() => {
        setState((curr) => {
          if (!curr.pendingBet || curr.pendingBet.id !== pending.id) return curr;
          return applySettlement(curr, curr.pendingBet, rollOutcome());
        });
        settleTimer.current = null;
      }, SETTLE_MS);
    } else {
      // 다음 실결과 대기 — 타임아웃 시에만 취소(시드 반환)
      settleTimer.current = window.setTimeout(() => {
        void walletCancelBet({
          amount: pending.amount,
          tableName: pending.tableName,
        }).then((res) => {
          if (res.ok && typeof res.balance === 'number') {
            emitWalletBalance(res.balance);
          }
        });
        setState((curr) => {
          if (!curr.pendingBet || curr.pendingBet.id !== pending.id) return curr;
          const lastBetResult: LastBetResult = {
            id: pending.id,
            tableId: pending.tableId,
            tableName: pending.tableName,
            side: pending.side,
            amount: pending.amount,
            outcome: 'T',
            won: null,
            pnlDelta: 0,
            message: '다음 게임 결과가 없어 베팅을 취소했습니다 (시드 반환)',
            at: Date.now(),
            appliedRule: '자동 취소',
            martinStage: curr.martinStage,
          };
          return {
            ...curr,
            pendingBet: null,
            lastBetResult,
          };
        });
        settleTimer.current = null;
      }, 180_000);
    }

    return { ok: true };
  }, [applySettlement]);

  /** 결과 대기 중인 베팅 취소 (시드/가상머니 반환) */
  const cancelPendingBet = useCallback(async (): Promise<PlaceBetResult> => {
    const pending = stateRef.current.pendingBet;
    if (!pending) {
      return { ok: false, error: '취소할 베팅이 없습니다.' };
    }

    clearSettleTimer();

    const res = await walletCancelBet({
      amount: pending.amount,
      tableName: pending.tableName,
    });
    if (res.ok && typeof res.balance === 'number') {
      emitWalletBalance(res.balance);
    }
    // 로그인 안 된 데모/시드 모드에서도 UI 잔액은 pnl 복구로 맞춤

    setState((curr) => {
      if (!curr.pendingBet || curr.pendingBet.id !== pending.id) return curr;
      const lastBetResult: LastBetResult = {
        id: pending.id,
        tableId: pending.tableId,
        tableName: pending.tableName,
        side: pending.side,
        amount: pending.amount,
        outcome: 'T',
        won: null,
        pnlDelta: 0,
        message: `베팅 취소 · ${formatMoney(pending.amount)} 반환`,
        at: Date.now(),
        appliedRule: '사용자 취소',
        martinStage: curr.martinStage,
      };
      return {
        ...curr,
        pendingBet: null,
        lastBetResult,
      };
    });

    return { ok: true };
  }, []);

  const settlePendingWithOutcome = useCallback((
    tableId: string,
    outcome: 'P' | 'B' | 'T',
    latestId?: number | null,
    resultCount?: number,
  ) => {
    setState((curr) => {
      const pending = curr.pendingBet;
      if (!pending || pending.tableId !== tableId) return curr;
      if (!pending.waitForLiveResult && pending.baselineLatestId == null) return curr;

      const baselineId = pending.baselineLatestId ?? 0;
      const baselineCount = pending.baselineResultCount ?? 0;
      const idAdvanced = typeof latestId === 'number' && latestId > baselineId;
      const countAdvanced =
        typeof resultCount === 'number' && resultCount > baselineCount;

      // 베팅 시점보다 이후의 결과가 와야만 정산
      if (!idAdvanced && !countAdvanced) return curr;

      clearSettleTimer();
      return applySettlement(curr, pending, outcome);
    });
  }, [applySettlement]);

  const skipRound = useCallback((tableId?: string) => {
    setState((prev) => {
      if (prev.pendingBet) return prev;
      const lastBetResult: LastBetResult = {
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
        appliedRule: '건너뛰기',
        martinStage: prev.martinStage,
      };
      return {
        ...prev,
        skippedCount: prev.skippedCount + 1,
        lastBetResult,
      };
    });
  }, []);

  const clearLastBetResult = useCallback(() => {
    setState((prev) => ({ ...prev, lastBetResult: null }));
  }, []);

  const isActive = state.status === 'running' || state.status === 'paused';
  const availableBankroll = bankroll(state.config.seed, state.pnl);
  const suggestedBet = resolveBetAmount(
    state.config,
    Math.min(state.martinStage, state.config.maxMartin),
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
    cancelPendingBet,
    settlePendingWithOutcome,
    skipRound,
    clearLastBetResult,
    setCutHandler,
  };
}
