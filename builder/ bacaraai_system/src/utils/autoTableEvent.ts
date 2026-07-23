import type { AutoBetStrategy, PatternCase, TableData } from '../types';
import type { LastBetResult, PendingBet } from '../hooks/useSession';
import { BET_WINDOW_SEC, getBettingRemainingSecForTable } from '../hooks/useBettingWindow';
import { findMatchingPatternCase } from './patternMatch';

/** 우선순위 높은 순 — 카드에는 하나만 표시 */
export type AutoTableEventKind =
  | 'risk'
  | 'hit'
  | 'miss'
  | 'pending'
  | 'signal'
  | 'watching';

export type AutoTableEventTone = 'risk' | 'hit' | 'miss' | 'pending' | 'ai' | 'pattern' | 'watch';

export type AutoTableEvent = {
  kind: AutoTableEventKind;
  tone: AutoTableEventTone;
  /** 이벤트 바 한 줄 */
  label: string;
  /** 작은 배지 (AI / 패턴) */
  badge?: string;
  betSec?: number;
  progress?: number;
};

export type ResolveAutoTableEventInput = {
  table: TableData;
  autoRunning: boolean;
  strategy: AutoBetStrategy;
  pendingBets: PendingBet[];
  lastAutoResult: LastBetResult | null;
  /** 최근 오토 적중 연출 중 */
  autoHit?: boolean;
  patternCases?: PatternCase[];
  /** 패턴 마틴 이어가는 테이블 */
  patternRunTableId?: string | null;
  patternRunCaseLabel?: string | null;
  now?: number;
};

function sideShort(side: string): string {
  if (side === 'PLAYER' || side === 'P') return 'Player';
  if (side === 'BANKER' || side === 'B') return 'Banker';
  if (side === 'TIE' || side === 'T') return 'Tie';
  return side;
}

function formatWon(amount: number): string {
  const n = Math.abs(Math.round(amount));
  return `${n.toLocaleString()}원`;
}

const RESULT_FLASH_MS = 4500;

/**
 * 오토베팅 실행 중 테이블의 현재 이벤트 1개.
 * 우선순위: 위험 > 적중/미적중 > 접수 > 신호(AI/패턴) > 감시
 */
export function resolveAutoTableEvent(
  input: ResolveAutoTableEventInput,
): AutoTableEvent | null {
  const {
    table,
    autoRunning,
    strategy,
    pendingBets,
    lastAutoResult,
    autoHit = false,
    patternCases = [],
    patternRunTableId = null,
    patternRunCaseLabel = null,
    now = Date.now(),
  } = input;

  if (!autoRunning) return null;

  const isLive =
    table.live != null || table.id === 't1' || table.gameCode === 'MD2729';
  if (!isLive) return null;

  if (table.status === 'risk_blocked') {
    return {
      kind: 'risk',
      tone: 'risk',
      label: '위험 한도 차단',
      badge: 'STOP',
    };
  }

  const recent =
    lastAutoResult &&
    lastAutoResult.tableId === table.id &&
    lastAutoResult.source === 'auto' &&
    now - lastAutoResult.at < RESULT_FLASH_MS
      ? lastAutoResult
      : null;

  if (autoHit || (recent && recent.won === true)) {
    const pnl = recent?.pnlDelta ?? 0;
    return {
      kind: 'hit',
      tone: 'hit',
      label: pnl > 0 ? `적중 +${formatWon(pnl)}` : '적중',
      badge: 'HIT',
    };
  }

  if (recent && recent.won === false) {
    const stage = recent.martinStage != null ? recent.martinStage + 1 : null;
    return {
      kind: 'miss',
      tone: 'miss',
      label: stage != null ? `미적중 · 다음 ${stage}단계` : '미적중',
      badge: 'MISS',
    };
  }

  const pending = pendingBets.find((b) => b.source === 'auto' && b.tableId === table.id);
  if (pending) {
    return {
      kind: 'pending',
      tone: 'pending',
      label: `${sideShort(pending.side)} · ${formatWon(pending.amount)} 접수`,
      badge: strategy === 'pattern' ? '패턴' : 'AI',
    };
  }

  const betSec = getBettingRemainingSecForTable(table, now);
  const tone: AutoTableEventTone = strategy === 'pattern' ? 'pattern' : 'ai';
  const badge = strategy === 'pattern' ? '패턴' : 'AI';

  if (strategy === 'pattern') {
    const onRun = patternRunTableId === table.id;
    const matched =
      !onRun && patternCases.length > 0
        ? findMatchingPatternCase(table.stats.recentResults || [], patternCases)
        : null;

    if (onRun || matched) {
      const caseLabel =
        (onRun ? patternRunCaseLabel : matched?.label) || matched?.label || '패턴';
      const sideHint = matched ? sideShort(matched.patternBetSide) : null;
      if (betSec > 0) {
        return {
          kind: 'signal',
          tone,
          label: sideHint
            ? `${caseLabel} · ${sideHint} · BET ${betSec}s`
            : `${caseLabel} · BET ${betSec}s`,
          badge,
          betSec,
          progress: betSec / BET_WINDOW_SEC,
        };
      }
      return {
        kind: 'signal',
        tone,
        label: sideHint ? `패턴 일치 · ${caseLabel} → ${sideHint}` : `패턴 일치 · ${caseLabel}`,
        badge,
      };
    }
  } else {
    const opinion = table.ai.finalOpinion;
    const actionable =
      Boolean(table.ai.autoBetAllowed) &&
      (opinion === 'PLAYER' || opinion === 'BANKER');
    if (actionable) {
      const conf = table.ai.finalConfidence > 0 ? ` ${table.ai.finalConfidence}%` : '';
      if (betSec > 0) {
        return {
          kind: 'signal',
          tone,
          label: `AI ${sideShort(opinion)}${conf} · BET ${betSec}s`,
          badge,
          betSec,
          progress: betSec / BET_WINDOW_SEC,
        };
      }
      return {
        kind: 'signal',
        tone,
        label: `AI 추천 · ${sideShort(opinion)}${conf}`,
        badge,
      };
    }
  }

  return {
    kind: 'watching',
    tone: 'watch',
    label: strategy === 'pattern' ? '패턴 감시 중' : 'AI 감시 중',
    badge: badge,
  };
}

export function autoEventCardClass(event: AutoTableEvent | null, reduced: boolean): string {
  if (!event) return '';
  switch (event.tone) {
    case 'risk':
      return ' border-red-700/70 shadow-[0_0_22px_rgba(220,38,38,0.28)] ';
    case 'hit':
      return reduced
        ? ' border-emerald-500/60 '
        : ' border-emerald-400/70 shadow-[0_0_24px_rgba(52,211,153,0.35)] auto-event-pulse-hit ';
    case 'miss':
      return reduced
        ? ' border-rose-500/50 '
        : ' border-rose-500/60 shadow-[0_0_18px_rgba(244,63,94,0.28)] auto-event-shake ';
    case 'pending':
      return reduced
        ? ' border-sky-400/70 ring-2 ring-sky-400/50 '
        : ' border-sky-400/80 ring-2 ring-sky-400/40 shadow-[0_0_22px_rgba(56,189,248,0.4)] auto-event-pulse-pending ';
    case 'ai':
      return reduced
        ? ' border-violet-400/60 '
        : ' border-violet-400/70 shadow-[0_0_20px_rgba(167,139,250,0.35)] auto-event-pulse-ai ';
    case 'pattern':
      return reduced
        ? ' border-amber-400/70 '
        : ' border-amber-400/80 shadow-[0_0_22px_rgba(251,191,36,0.38)] auto-event-pulse-pattern ';
    case 'watch':
      return ' border-cyan-700/40 shadow-[0_0_12px_rgba(34,211,238,0.12)] ';
    default:
      return '';
  }
}

export function autoEventBarClass(tone: AutoTableEventTone): string {
  switch (tone) {
    case 'risk':
      return 'border-red-500/40 bg-red-500/15 text-red-300';
    case 'hit':
      return 'border-emerald-400/45 bg-emerald-500/15 text-emerald-200';
    case 'miss':
      return 'border-rose-500/40 bg-rose-500/15 text-rose-200';
    case 'pending':
      return 'border-sky-400/45 bg-sky-500/15 text-sky-200';
    case 'ai':
      return 'border-violet-400/45 bg-violet-500/15 text-violet-200';
    case 'pattern':
      return 'border-amber-400/45 bg-amber-500/15 text-amber-200';
    case 'watch':
      return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200/90';
    default:
      return 'border-zinc-700 bg-zinc-900 text-zinc-400';
  }
}
