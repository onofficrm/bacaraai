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

function dayKey(at: number = Date.now()): string {
  const d = new Date(at);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getTodayBetStats(entries?: GameHistoryEntry[]): {
  wins: number;
  losses: number;
  pnl: number;
  count: number;
} {
  const list = entries ?? loadBetHistory();
  const today = dayKey();
  let wins = 0;
  let losses = 0;
  let pnl = 0;
  let count = 0;
  for (const e of list) {
    const d = e.day || (e.at ? dayKey(e.at) : today);
    // 날짜 없는 구기록은 오늘로 치지 않음 (왜곡 방지) — at/day 있을 때만
    if (!e.day && !e.at) continue;
    if (d !== today) continue;
    if (e.dataStatus === '취소' || e.amount <= 0) continue;
    count += 1;
    pnl += e.pnl || 0;
    if (e.pnl > 0) wins += 1;
    else if (e.pnl < 0) losses += 1;
  }
  return { wins, losses, pnl, count };
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
  const cancelled = /취소/.test(result.message) && !/타이/.test(result.message);
  const at = result.at || Date.now();
  return {
    id: result.id,
    time: formatTime(at),
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
    at,
    day: dayKey(at),
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
  appendBetHistory(lastBetToHistoryEntry(result, opts));
}

export function mergeBetHistory(
  local: GameHistoryEntry[],
  remote: GameHistoryEntry[],
): GameHistoryEntry[] {
  const map = new Map<string, GameHistoryEntry>();
  for (const e of [...remote, ...local]) {
    if (!e?.id) continue;
    if (!map.has(e.id)) map.set(e.id, e);
  }
  return Array.from(map.values()).sort((a, b) => {
    const ta = a.time || '';
    const tb = b.time || '';
    // createdAt preferred if present
    const ca = (a as GameHistoryEntry & { createdAt?: string }).createdAt || ta;
    const cb = (b as GameHistoryEntry & { createdAt?: string }).createdAt || tb;
    return cb.localeCompare(ca);
  });
}
