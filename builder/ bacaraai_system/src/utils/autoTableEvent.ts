import type { AutoBetStrategy, PatternCase, TableData } from '../types';
import type { LastBetResult, PendingBet } from '../hooks/useSession';
import { BET_WINDOW_SEC, getBettingRemainingSecForTable } from '../hooks/useBettingWindow';
import { findMatchingPatternCase } from './patternMatch';

/** 우선순위 높은 순 — 카드 테두리·메인 이벤트 */
export type AutoTableEventKind =
  | 'risk'
  | 'hit'
  | 'miss'
  | 'pending'
  | 'signal'
  | 'watching';

export type AutoTableEventTone =
  | 'risk'
  | 'hit'
  | 'miss'
  | 'pending'
  | 'manual'
  | 'ai'
  | 'pattern'
  | 'watch';

export type AutoTableEvent = {
  kind: AutoTableEventKind;
  tone: AutoTableEventTone;
  /** 이벤트 바 한 줄 */
  label: string;
  /** 작은 배지 (AI / 패턴 / 직접) */
  badge?: string;
  betSec?: number;
  progress?: number;
};

/** 카드에 쌓이는 베팅·정산 줄 (직접/오토 각각) */
export type TableBetBanner = {
  id: string;
  tone: AutoTableEventTone;
  badge: string;
  label: string;
  hint?: string;
  amount?: number;
  side?: string;
};

export type ResolveTableCardEventInput = {
  table: TableData;
  autoRunning: boolean;
  strategy: AutoBetStrategy;
  pendingBets: PendingBet[];
  lastAutoResult: LastBetResult | null;
  lastManualResult?: LastBetResult | null;
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
/** 승리 플립 유지 시간 */
const WIN_FLIP_MS = 1650;

function pendingBanner(bet: PendingBet, strategy: AutoBetStrategy): TableBetBanner {
  const isAuto = bet.source === 'auto';
  return {
    id: bet.id,
    tone: isAuto ? (strategy === 'pattern' ? 'pattern' : 'pending') : 'manual',
    badge: isAuto ? (strategy === 'pattern' ? '오토·패턴' : '오토') : '직접',
    label: `${sideShort(bet.side)} · ${formatWon(bet.amount)}`,
    hint: '결과 대기',
    amount: bet.amount,
    side: sideShort(bet.side),
  };
}

function settleBanner(result: LastBetResult): TableBetBanner {
  const isAuto = result.source === 'auto';
  const won = result.won === true;
  const lost = result.won === false;
  const pnl = result.pnlDelta ?? 0;
  const side = sideShort(result.side);
  if (won) {
    return {
      id: `settle-${result.id}`,
      tone: 'hit',
      badge: isAuto ? '오토 적중' : '직접 적중',
      label: pnl > 0 ? `${side} · +${formatWon(pnl)}` : `${side} · 적중`,
    };
  }
  if (lost) {
    const stage = result.martinStage != null ? result.martinStage + 1 : null;
    return {
      id: `settle-${result.id}`,
      tone: 'miss',
      badge: isAuto ? '오토 미적중' : '직접 미적중',
      label:
        stage != null && isAuto
          ? `${side} · −${formatWon(Math.abs(pnl) || result.amount)} · 다음 ${stage}단계`
          : `${side} · −${formatWon(Math.abs(pnl) || result.amount)}`,
    };
  }
  return {
    id: `settle-${result.id}`,
    tone: 'watch',
    badge: isAuto ? '오토' : '직접',
    label: `${side} · 정산`,
  };
}

/** 이 테이블의 진행 중 베팅 줄 (마감 후에도 유지) */
export function resolveTableBetBanners(
  input: Pick<ResolveTableCardEventInput, 'table' | 'pendingBets' | 'strategy'>,
): TableBetBanner[] {
  const { table, pendingBets, strategy } = input;
  return pendingBets
    .filter((b) => b.tableId === table.id)
    .sort((a, b) => {
      if (a.source === b.source) return a.placedAt - b.placedAt;
      return a.source === 'manual' ? -1 : 1;
    })
    .map((b) => pendingBanner(b, strategy));
}

/** 최근 정산 플래시 (직접·오토) — 승리는 플립용으로 짧게 */
export function resolveTableSettleBanner(
  input: Pick<
    ResolveTableCardEventInput,
    'table' | 'lastAutoResult' | 'lastManualResult' | 'autoHit' | 'now'
  >,
): TableBetBanner | null {
  const {
    table,
    lastAutoResult,
    lastManualResult = null,
    autoHit = false,
    now = Date.now(),
  } = input;

  const candidates = [lastManualResult, lastAutoResult].filter(
    (r): r is LastBetResult => {
      if (!r || r.tableId !== table.id) return false;
      const windowMs = r.won === true ? WIN_FLIP_MS : RESULT_FLASH_MS;
      return now - r.at < windowMs;
    },
  );
  if (candidates.length === 0) {
    if (
      autoHit &&
      lastAutoResult?.tableId === table.id &&
      lastAutoResult.won === true &&
      now - lastAutoResult.at < WIN_FLIP_MS
    ) {
      return settleBanner(lastAutoResult);
    }
    return null;
  }
  candidates.sort((a, b) => b.at - a.at);
  return settleBanner(candidates[0]);
}

/**
 * 테이블 카드 메인 이벤트 (테두리용).
 * 진행 중 베팅은 오토 실행 여부와 무관하게 표시.
 * 우선순위: 위험 > 정산 플래시 > 접수 > (오토) 신호/감시
 */
export function resolveAutoTableEvent(
  input: ResolveTableCardEventInput,
): AutoTableEvent | null {
  const {
    table,
    autoRunning,
    strategy,
    pendingBets,
    lastAutoResult,
    lastManualResult = null,
    autoHit = false,
    patternCases = [],
    patternRunTableId = null,
    patternRunCaseLabel = null,
    now = Date.now(),
  } = input;

  const isLive =
    table.live != null || table.id === 't1' || table.gameCode === 'MD2729';

  if (table.status === 'risk_blocked') {
    return {
      kind: 'risk',
      tone: 'risk',
      label: '위험 한도 차단',
      badge: 'STOP',
    };
  }

  const settle = resolveTableSettleBanner({
    table,
    lastAutoResult,
    lastManualResult,
    autoHit,
    now,
  });
  if (settle) {
    return {
      kind: settle.tone === 'hit' ? 'hit' : settle.tone === 'miss' ? 'miss' : 'watching',
      tone: settle.tone,
      label: settle.label,
      badge: settle.badge,
    };
  }

  const tablePendings = pendingBets.filter((b) => b.tableId === table.id);
  if (tablePendings.length > 0) {
    const manual = tablePendings.find((b) => b.source === 'manual');
    const auto = tablePendings.find((b) => b.source === 'auto');
    const primary = manual || auto!;
    const isAuto = primary.source === 'auto';
    return {
      kind: 'pending',
      tone: isAuto ? (strategy === 'pattern' ? 'pattern' : 'pending') : 'manual',
      label: `${sideShort(primary.side)} · ${formatWon(primary.amount)} · 결과 대기`,
      badge: isAuto
        ? strategy === 'pattern'
          ? '오토·패턴'
          : '오토'
        : '직접',
    };
  }

  if (!autoRunning || !isLive) return null;

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
    badge,
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
        : ' border-sky-400/80 ring-2 ring-sky-400/50 shadow-[0_0_22px_rgba(56,189,248,0.45)] auto-event-pulse-pending ';
    case 'manual':
      return reduced
        ? ' border-blue-400/70 ring-2 ring-blue-400/50 '
        : ' border-blue-400/80 ring-2 ring-blue-400/55 shadow-[0_0_22px_rgba(59,130,246,0.45)] auto-event-pulse-manual ';
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
    case 'manual':
      return 'border-blue-400/45 bg-blue-500/15 text-blue-200';
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
