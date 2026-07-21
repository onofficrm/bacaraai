import type { AiOpinion, GameHistoryEntry, GameResult } from '../types';
import type { BetSide, LastBetResult } from '../hooks/useSession';

const STORAGE_KEY = 'bacara_bet_history_v1';
const MAX_ENTRIES = 500;

export function loadBetHistory(): GameHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GameHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveBetHistory(entries: GameHistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    /* ignore quota */
  }
  window.dispatchEvent(new CustomEvent('bacara-bet-history'));
}

export function clearBetHistory() {
  saveBetHistory([]);
}

function formatTime(at: number): string {
  const d = new Date(at);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function sideToOpinion(side: BetSide): AiOpinion {
  return side;
}

export function lastBetToHistoryEntry(
  result: LastBetResult,
  opts?: {
    martinStage?: number;
    appliedRule?: string;
    shoeNumber?: string;
    round?: number;
    previousResult?: string;
  },
): GameHistoryEntry {
  const cancelled =
    result.message.includes('취소') || result.message.includes('반환');
  return {
    id: result.id,
    time: formatTime(result.at),
    tableName: result.tableName || result.tableId || '-',
    shoeNumber: opts?.shoeNumber || '-',
    round: opts?.round ?? 0,
    previousResult: opts?.previousResult || result.message,
    gptOpinion: 'WAIT',
    geminiOpinion: 'WAIT',
    claudeOpinion: 'WAIT',
    finalOpinion: sideToOpinion(result.side),
    userSelection: result.amount <= 0 ? 'SKIP' : sideToOpinion(result.side),
    amount: result.amount,
    actualResult: (cancelled && result.won === null
      ? 'NONE'
      : result.outcome) as GameResult | 'NONE',
    pnl: result.pnlDelta,
    martingaleStage: opts?.martinStage ?? 1,
    appliedRule: opts?.appliedRule || '직접/오토 베팅',
    dataStatus: cancelled ? '취소' : '정상',
  };
}

/** 최신 기록이 앞에 오도록 추가 */
export function appendBetHistory(entry: GameHistoryEntry): GameHistoryEntry[] {
  const prev = loadBetHistory().filter((e) => e.id !== entry.id);
  const next = [entry, ...prev].slice(0, MAX_ENTRIES);
  saveBetHistory(next);
  return next;
}

export function recordBetResult(
  result: LastBetResult,
  opts?: Parameters<typeof lastBetToHistoryEntry>[1],
): void {
  // 금액 0 건너뛰기도 기록 (관망)
  appendBetHistory(lastBetToHistoryEntry(result, opts));
}
