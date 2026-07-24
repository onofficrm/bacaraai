import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SessionConfig } from '../types';
import {
  cancelClientKey,
  emitWalletBalance,
  makeWalletClientKey,
  settleClientKey,
  walletCancelBet,
  walletPlaceBet,
  walletSettleBet,
} from '../api/walletBet';
import { normalizePatternCases, defaultPatternCases } from '../utils/patternMatch';
import { recordBetResult } from '../utils/betHistory';

export type SessionMode = 'observe' | 'shadow' | 'live';
export type SessionStatus = 'idle' | 'running' | 'paused';
export type BetSide = 'PLAYER' | 'BANKER' | 'TIE';

export type BetSource = 'manual' | 'auto';

/** 베팅 시점 테이블·AI 스냅샷 (게임 기록용) */
export type BetHistoryMeta = {
  gameCode?: string;
  shoeNumber?: string;
  round?: number;
  recentResults?: Array<'P' | 'B' | 'T'>;
  gptOpinion?: string;
  geminiOpinion?: string;
  claudeOpinion?: string;
  finalOpinion?: string;
  /** 예: 오토 · 패턴 / 오토 · AI / 직접 베팅 */
  ruleLabel?: string;
};

export type PendingBet = {
  id: string;
  tableId: string;
  tableName: string;
  side: BetSide;
  amount: number;
  placedAt: number;
  /** 직접 베팅 / 오토베팅 구분 — 동시에 각각 진행·표시 가능 */
  source: BetSource;
  /** place 시 사용한 서버 idempotency 키 */
  clientKey: string;
  /** 패턴 경우별 금액·마틴 추적용 */
  patternCaseId?: string | null;
  /** 라이브 테이블: 베팅 시점의 마지막 결과 id (이후 더 큰 id 가 오면 정산) */
  baselineLatestId?: number | null;
  /** 베팅 시점 결과 개수 (id 보조 신호) */
  baselineResultCount?: number;
  /** true 면 절대 시뮬레이션 정산하지 않고 다음 실결과 대기 */
  waitForLiveResult?: boolean;
  historyMeta?: BetHistoryMeta;
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
  /** 직접 / 오토 구분 */
  source?: BetSource;
  /** 게임 기록용 */
  appliedRule?: string;
  martinStage?: number;
  historyMeta?: BetHistoryMeta;
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
  /** 미지정 시 오토 실행 중이면 auto, 아니면 manual */
  source?: BetSource;
  /** 게임 기록용 스냅샷 */
  historyMeta?: BetHistoryMeta;
  /** 패턴 경우별 금액 추적 */
  patternCaseId?: string | null;
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
  /** 패턴 경우별 마틴 단계 (patternAmountScope=per_case) */
  caseMartinStages: Record<string, number>;
  /** 오토·직접 각각 1개까지 동시 대기 가능 */
  pendingBets: PendingBet[];
  /** 축하 연출·하위 호환용 (최근 결과, 승리 우선) */
  lastBetResult: LastBetResult | null;
  lastManualResult: LastBetResult | null;
  lastAutoResult: LastBetResult | null;
  /** 승리 축하 카드 전용 (다른 결과 갱신에 덮이지 않음) */
  winCelebration: LastBetResult | null;
  skippedCount: number;
};

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  seed: 4_000_000,
  initialBet: 10_000,
  winCut: 1_000_000,
  lossCut: -2_000_000,
  maxMartin: 6,
  maxBet: 2_000_000,
  maxTables: 8,
  maxTime: 90,
  strategy: 'pattern',
  patternSegments: [
    { side: 'B', count: 2, atLeast: false },
  ],
  patternBetSide: 'PLAYER',
  patternCases: defaultPatternCases(),
  patternTableScope: 'all',
  patternTableIds: [],
  patternAmountScope: 'shared',
  amountMode: 'martin',
  customSteps: [],
  maxConsecutiveAutoLosses: 4,
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
  caseMartinStages: {},
  pendingBets: [],
  lastBetResult: null,
  lastManualResult: null,
  lastAutoResult: null,
  winCelebration: null,
  skippedCount: 0,
};

function normalizeConfig(partial?: Partial<SessionConfig>): SessionConfig {
  const merged = { ...DEFAULT_SESSION_CONFIG, ...(partial || {}) };
  const normalized = normalizePatternCases(partial ?? merged);
  const scope =
    partial?.patternTableScope === 'selected' || merged.patternTableScope === 'selected'
      ? 'selected'
      : 'all';
  const ids = Array.isArray(partial?.patternTableIds)
    ? partial!.patternTableIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : Array.isArray(merged.patternTableIds)
      ? merged.patternTableIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
      : [];
  const amountScope =
    partial?.patternAmountScope === 'per_case' || merged.patternAmountScope === 'per_case'
      ? 'per_case'
      : 'shared';

  const maxConsecutiveAutoLosses = Math.max(
    0,
    Math.min(
      20,
      Math.floor(
        Number(
          partial?.maxConsecutiveAutoLosses ??
            merged.maxConsecutiveAutoLosses ??
            DEFAULT_SESSION_CONFIG.maxConsecutiveAutoLosses,
        ) || 0,
      ),
    ),
  );

  return {
    ...merged,
    patternCases: normalized.patternCases,
    patternSegments: normalized.patternSegments,
    patternBetSide: normalized.patternBetSide,
    patternTableScope: scope,
    patternTableIds: scope === 'selected' ? ids : [],
    patternAmountScope: amountScope,
    maxConsecutiveAutoLosses,
  };
}

function freshWinCelebration(parsed: Partial<SessionState>): LastBetResult | null {
  const win = parsed.winCelebration ?? null;
  if (!win || win.won !== true || !(win.amount > 0)) return null;
  // 새로고침 직후 오래된 승리는 카드로 다시 띄우지 않음
  if (Date.now() - (win.at || 0) > 12_000) return null;
  return win;
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
      pendingBets: [],
      lastBetResult: parsed.lastBetResult ?? null,
      lastManualResult: parsed.lastManualResult ?? null,
      lastAutoResult: parsed.lastAutoResult ?? null,
      winCelebration: freshWinCelebration(parsed),
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
export type AmountPlan = {
  amountMode: SessionConfig['amountMode'];
  initialBet: number;
  maxMartin: number;
  maxBet: number;
  customSteps: number[];
};

export function resolveAmountPlan(
  config: SessionConfig,
  caseId?: string | null,
): AmountPlan {
  const shared: AmountPlan = {
    amountMode: config.amountMode,
    initialBet: config.initialBet,
    maxMartin: config.maxMartin,
    maxBet: config.maxBet,
    customSteps: Array.isArray(config.customSteps) ? config.customSteps : [],
  };
  if (config.patternAmountScope !== 'per_case' || !caseId) return shared;
  const c = (config.patternCases || []).find((x) => x.id === caseId);
  if (!c) return shared;
  return {
    amountMode: c.amountMode ?? config.amountMode,
    initialBet: typeof c.initialBet === 'number' ? c.initialBet : config.initialBet,
    maxMartin: typeof c.maxMartin === 'number' ? c.maxMartin : config.maxMartin,
    maxBet: config.maxBet,
    customSteps: Array.isArray(c.customSteps) ? c.customSteps : [],
  };
}

export function resolveBetAmountFromPlan(plan: AmountPlan, stage: number): number {
  const steps = plan.customSteps;
  const useCustom = plan.amountMode === 'custom' && Array.isArray(steps) && steps.length > 0;
  if (useCustom) {
    const idx = Math.max(0, Math.min(stage - 1, steps.length - 1, plan.maxMartin - 1));
    const amt = steps[idx] ?? plan.initialBet;
    return Math.min(Math.max(0, amt), plan.maxBet);
  }
  return nextBetAmount(plan.initialBet, stage, plan.maxBet);
}

/** 마틴 또는 사용자 지정 단계 금액 (공통 설정 기준, 경우 id 선택 가능) */
export function resolveBetAmount(
  config: SessionConfig,
  stage: number,
  caseId?: string | null,
): number {
  return resolveBetAmountFromPlan(resolveAmountPlan(config, caseId), stage);
}

export function getCaseMartinStage(
  caseMartinStages: Record<string, number> | undefined,
  caseId: string | null | undefined,
  fallback = 1,
): number {
  if (!caseId) return fallback;
  const n = caseMartinStages?.[caseId];
  return typeof n === 'number' && n >= 1 ? n : fallback;
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
  const settleTimers = useRef<Map<string, number>>(new Map());
  const onCutRef = useRef<((type: 'wincut' | 'losscut', pnl: number) => void) | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  /** source+table별 place 진행 중 락 (await 전 레이스 방지) */
  const placeInFlightRef = useRef<Set<string>>(new Set());
  const placeFlightKey = (source: BetSource, tableId: string) => `${source}:${tableId}`;

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
      settleTimers.current.forEach((tid) => window.clearTimeout(tid));
      settleTimers.current.clear();
    };
  }, []);

  // setState 밖에서 게임 기록 저장 (updater 내부 side-effect 로 유실되던 문제 방지)
  const recordedBetIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const candidates = [state.lastManualResult, state.lastAutoResult, state.lastBetResult];
    for (const r of candidates) {
      if (!r?.id) continue;
      if (recordedBetIdsRef.current.has(r.id)) continue;
      recordedBetIdsRef.current.add(r.id);
      recordBetResult(r, {
        martinStage: r.martinStage ?? state.martinStage,
        appliedRule: r.appliedRule || (r.source === 'auto' ? '오토베팅' : '직접 베팅'),
      });
    }
  }, [state.lastManualResult, state.lastAutoResult, state.lastBetResult, state.martinStage]);

  const elapsedMs = useMemo(() => {
    if (state.status === 'running' && state.startedAt) {
      return state.elapsedMs + (now - state.startedAt);
    }
    return state.elapsedMs;
  }, [state.status, state.startedAt, state.elapsedMs, now]);

  const clearSettleTimer = (betId?: string) => {
    if (betId) {
      const tid = settleTimers.current.get(betId);
      if (tid) {
        window.clearTimeout(tid);
        settleTimers.current.delete(betId);
      }
      return;
    }
    settleTimers.current.forEach((tid) => window.clearTimeout(tid));
    settleTimers.current.clear();
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
      caseMartinStages: {},
      pendingBets: [],
      lastBetResult: null,
      lastManualResult: null,
      lastAutoResult: null,
      winCelebration: null,
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
      caseMartinStages: {},
      pendingBets: [],
      lastBetResult: null,
      lastManualResult: null,
      lastAutoResult: null,
      winCelebration: null,
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

  const setCutHandler = useCallback((handler: ((type: 'wincut' | 'losscut', pnl: number) => void) | null) => {
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
    let nextCaseStages = { ...(curr.caseMartinStages || {}) };

    // 마틴 단계는 오토베팅 정산에만 반영
    if (pending.source === 'auto') {
      const caseId = pending.patternCaseId || null;
      const usePerCase =
        curr.config.patternAmountScope === 'per_case' && Boolean(caseId);
      const plan = resolveAmountPlan(curr.config, usePerCase ? caseId : null);
      const curStage = usePerCase
        ? getCaseMartinStage(curr.caseMartinStages, caseId, curr.martinStage)
        : curr.martinStage;

      let stageAfter = curStage;
      if (settled.won === true) stageAfter = 1;
      else if (settled.won === false) {
        stageAfter = Math.min(plan.maxMartin + 1, curStage + 1);
      }

      if (usePerCase && caseId) {
        nextCaseStages[caseId] = stageAfter;
      }
      nextStage = stageAfter;
    }

    const ruleLabel =
      pending.historyMeta?.ruleLabel ||
      (pending.source === 'auto' ? '오토베팅' : '직접 베팅');

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
      source: pending.source,
      appliedRule: ruleLabel,
      martinStage: curr.martinStage,
      historyMeta: pending.historyMeta,
    };

    void walletSettleBet({
      amount: pending.amount,
      side: pending.side,
      outcome,
      tableName: pending.tableName,
      source: pending.source,
      round: pending.historyMeta?.round,
      shoeNumber: pending.historyMeta?.shoeNumber || pending.historyMeta?.gameCode,
      clientKey: settleClientKey(pending.id),
    }).then((res) => {
      if (res.ok && typeof res.balance === 'number') {
        emitWalletBalance(res.balance);
      }
    });

    window.setTimeout(() => {
      if (nextPnl >= curr.config.winCut) onCutRef.current?.('wincut', nextPnl);
      else if (nextPnl <= curr.config.lossCut) onCutRef.current?.('losscut', nextPnl);
    }, 0);

    const preferResult = result;

    return {
      ...curr,
      pnl: nextPnl,
      martinStage: nextStage,
      caseMartinStages: nextCaseStages,
      pendingBets: curr.pendingBets.filter((b) => b.id !== pending.id),
      lastBetResult: preferResult,
      lastManualResult: pending.source === 'manual' ? result : curr.lastManualResult,
      lastAutoResult: pending.source === 'auto' ? result : curr.lastAutoResult,
      // 승리만 축하 카드 큐에 넣음 (이후 place/cancel 에 덮이지 않음)
      winCelebration:
        settled.won === true && result.amount > 0 ? result : curr.winCelebration,
    };
  }, []);

  const placeBet = useCallback(async (input: PlaceBetInput): Promise<PlaceBetResult> => {
    const prev = stateRef.current;
    const resolvedSource: BetSource = input.source ?? 'manual';

    if (prev.status === 'paused' && resolvedSource === 'auto') {
      return { ok: false, error: '오토베팅이 일시정지 중입니다.' };
    }
    // paused 여도 직접 베팅은 허용 (오토만 멈춘 상태)

    // 같은 테이블·같은 소스만 중복 금지 — 다른 테이블은 동시 베팅 가능
    if (
      prev.pendingBets.some(
        (b) => b.source === resolvedSource && b.tableId === input.tableId,
      )
    ) {
      return {
        ok: false,
        error:
          resolvedSource === 'auto'
            ? '이 테이블 오토베팅 결과를 확인 중입니다.'
            : '이 테이블 직접 베팅 결과를 확인 중입니다.',
      };
    }
    const flightKey = placeFlightKey(resolvedSource, input.tableId);
    if (placeInFlightRef.current.has(flightKey)) {
      return {
        ok: false,
        error:
          resolvedSource === 'auto'
            ? '이 테이블 오토베팅을 접수하는 중입니다.'
            : '이 테이블 직접 베팅을 접수하는 중입니다.',
      };
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

    if (resolvedSource === 'auto') {
      const plan = resolveAmountPlan(prev.config, input.patternCaseId);
      const stage = getCaseMartinStage(
        prev.caseMartinStages,
        input.patternCaseId,
        prev.martinStage,
      );
      if (stage > plan.maxMartin) {
        return {
          ok: false,
          error: '최대 마틴 단계에 도달했습니다. 오토베팅을 재설정하세요.',
        };
      }
    }

    const clientKey = makeWalletClientKey(`p_${resolvedSource}_${input.tableId}`);
    placeInFlightRef.current.add(flightKey);
    let walletRes;
    try {
      walletRes = await walletPlaceBet({
        amount,
        side: input.side,
        tableName: input.tableName,
        source: resolvedSource,
        round: input.historyMeta?.round,
        shoeNumber: input.historyMeta?.shoeNumber || input.historyMeta?.gameCode,
        clientKey,
      });
    } finally {
      placeInFlightRef.current.delete(flightKey);
    }
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

    // 오토베팅은 반드시 라이브 결과로만 정산 — 랜덤 시뮬레이션 금지
    if (resolvedSource === 'auto' && !useLiveSettle) {
      return {
        ok: false,
        error: '오토베팅은 라이브 테이블에서만 가능합니다.',
      };
    }

    const defaultRule =
      resolvedSource === 'auto' ? '오토베팅' : '직접 베팅';
    const pending: PendingBet = {
      id: `bet_${Date.now()}_${resolvedSource}`,
      tableId: input.tableId,
      tableName: input.tableName,
      side: input.side,
      amount,
      placedAt: Date.now(),
      source: resolvedSource,
      clientKey,
      patternCaseId: input.patternCaseId || null,
      baselineLatestId: useLiveSettle ? (baselineLatestId ?? 0) : null,
      baselineResultCount:
        typeof input.baselineResultCount === 'number' ? input.baselineResultCount : 0,
      waitForLiveResult: useLiveSettle,
      historyMeta: {
        ...input.historyMeta,
        ruleLabel: input.historyMeta?.ruleLabel || defaultRule,
      },
    };

    setState((curr) => ({
      ...curr,
      pendingBets: [
        ...curr.pendingBets.filter(
          (b) => !(b.source === resolvedSource && b.tableId === input.tableId),
        ),
        pending,
      ],
    }));

    if (!useLiveSettle) {
      const tid = window.setTimeout(() => {
        settleTimers.current.delete(pending.id);
        setState((curr) => {
          const bet = curr.pendingBets.find((b) => b.id === pending.id);
          if (!bet) return curr;
          return applySettlement(curr, bet, rollOutcome());
        });
      }, SETTLE_MS);
      settleTimers.current.set(pending.id, tid);
    } else {
      const tid = window.setTimeout(() => {
        settleTimers.current.delete(pending.id);
        void walletCancelBet({
          amount: pending.amount,
          tableName: pending.tableName,
          source: pending.source,
          clientKey: cancelClientKey(pending.id),
        }).then((res) => {
          if (res.ok && typeof res.balance === 'number') {
            emitWalletBalance(res.balance);
          }
        });
        setState((curr) => {
          if (!curr.pendingBets.some((b) => b.id === pending.id)) return curr;
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
            source: pending.source,
            appliedRule: pending.historyMeta?.ruleLabel || '자동 취소',
            martinStage: curr.martinStage,
            historyMeta: pending.historyMeta,
          };
          return {
            ...curr,
            pendingBets: curr.pendingBets.filter((b) => b.id !== pending.id),
            lastBetResult,
            lastManualResult:
              pending.source === 'manual' ? lastBetResult : curr.lastManualResult,
            lastAutoResult:
              pending.source === 'auto' ? lastBetResult : curr.lastAutoResult,
          };
        });
      }, 180_000);
      settleTimers.current.set(pending.id, tid);
    }

    return { ok: true };
  }, [applySettlement]);

  /** 결과 대기 중인 베팅 취소 (시드/가상머니 반환) */
  const cancelPendingBet = useCallback(async (opts?: {
    id?: string;
    source?: BetSource;
    tableId?: string;
  }): Promise<PlaceBetResult> => {
    const list = stateRef.current.pendingBets;
    const pending =
      (opts?.id && list.find((b) => b.id === opts.id)) ||
      list.find((b) => {
        if (opts?.source && b.source !== opts.source) return false;
        if (opts?.tableId && b.tableId !== opts.tableId) return false;
        return Boolean(opts?.id || opts?.source || opts?.tableId);
      }) ||
      (!opts || (!opts.id && !opts.source && !opts.tableId) ? list[0] : undefined);

    if (!pending) {
      return { ok: false, error: '취소할 베팅이 없습니다.' };
    }

    clearSettleTimer(pending.id);

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
      source: pending.source,
      appliedRule: pending.historyMeta?.ruleLabel || '사용자 취소',
      martinStage: stateRef.current.martinStage,
      historyMeta: pending.historyMeta,
    };
    setState((curr) => {
      if (!curr.pendingBets.some((b) => b.id === pending.id)) return curr;
      return {
        ...curr,
        pendingBets: curr.pendingBets.filter((b) => b.id !== pending.id),
        lastBetResult,
        lastManualResult:
          pending.source === 'manual' ? lastBetResult : curr.lastManualResult,
        lastAutoResult:
          pending.source === 'auto' ? lastBetResult : curr.lastAutoResult,
      };
    });

    try {
      const res = await walletCancelBet({
        amount: pending.amount,
        tableName: pending.tableName,
        source: pending.source,
        clientKey: cancelClientKey(pending.id),
      });
      if (res.ok && typeof res.balance === 'number') {
        emitWalletBalance(res.balance);
      }
      if (!res.ok) {
        return {
          ok: false,
          error: res.message || '가상머니 반환에 실패했습니다. 잔액을 확인해 주세요.',
        };
      }
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: '베팅 취소 요청 중 오류가 발생했습니다.',
      };
    }
  }, []);

  const settlePendingWithOutcome = useCallback((
    tableId: string,
    outcome: 'P' | 'B' | 'T',
    latestId?: number | null,
    resultCount?: number,
  ) => {
    setState((curr) => {
      const ready = curr.pendingBets.filter((pending) => {
        if (pending.tableId !== tableId) return false;
        if (!pending.waitForLiveResult && pending.baselineLatestId == null) return false;

        const baselineId = pending.baselineLatestId ?? 0;
        const baselineCount = pending.baselineResultCount ?? 0;
        const idAdvanced = typeof latestId === 'number' && latestId > baselineId;
        const countAdvanced =
          typeof resultCount === 'number' && resultCount > baselineCount;
        return idAdvanced || countAdvanced;
      });

      if (ready.length === 0) return curr;

      let next = curr;
      for (const pending of ready) {
        clearSettleTimer(pending.id);
        next = applySettlement(next, pending, outcome);
      }
      return next;
    });
  }, [applySettlement]);

  const skipRound = useCallback((tableId?: string) => {
    setState((prev) => {
      if (
        tableId
          ? prev.pendingBets.some((b) => b.tableId === tableId)
          : prev.pendingBets.length > 0
      ) {
        return prev;
      }
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

  const clearLastBetResult = useCallback((source?: BetSource) => {
    setState((prev) => {
      if (source === 'manual') {
        return {
          ...prev,
          lastManualResult: null,
          lastBetResult:
            prev.lastBetResult?.source === 'manual' ? prev.lastAutoResult : prev.lastBetResult,
        };
      }
      if (source === 'auto') {
        return {
          ...prev,
          lastAutoResult: null,
          lastBetResult:
            prev.lastBetResult?.source === 'auto' ? prev.lastManualResult : prev.lastBetResult,
        };
      }
      return {
        ...prev,
        lastBetResult: null,
        lastManualResult: null,
        lastAutoResult: null,
      };
    });
  }, []);

  const clearWinCelebration = useCallback((id?: string) => {
    setState((prev) => {
      if (!prev.winCelebration) return prev;
      if (id && prev.winCelebration.id !== id) return prev;
      return { ...prev, winCelebration: null };
    });
  }, []);

  const isActive = state.status === 'running' || state.status === 'paused';
  const availableBankroll = bankroll(state.config.seed, state.pnl);
  const suggestedBet = resolveBetAmount(
    state.config,
    Math.min(state.martinStage, state.config.maxMartin),
  );

  // 하위 호환: 첫 번째 pending
  const pendingBet = state.pendingBets[0] ?? null;

  return {
    ...state,
    pendingBet,
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
    clearWinCelebration,
    setCutHandler,
  };
}
