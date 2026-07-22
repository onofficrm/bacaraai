import type { AiOpinion, GameHistoryEntry, GameResult } from '../types';
import type { BetSide, BetSource, LastBetResult } from '../hooks/useSession';

const STORAGE_KEY = 'bacara_bet_history_v1';
const MAX_ENTRIES = 500;

export function loadBetHistory(): GameHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GameHistoryEntry[];
    return Array.isArray(parsed) ? parsed.map(normalizeHistoryEntry) : [];
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

function asOpinion(v: unknown): AiOpinion {
  const s = String(v || 'WAIT').toUpperCase();
  if (
    s === 'PLAYER' ||
    s === 'BANKER' ||
    s === 'WAIT' ||
    s === 'SKIP' ||
    s === 'PAUSE' ||
    s === 'STOP' ||
    s === 'ERROR' ||
    s === 'DATA_ERROR'
  ) {
    return s;
  }
  if (s === 'P') return 'PLAYER';
  if (s === 'B') return 'BANKER';
  if (s === 'T') return 'SKIP';
  return 'WAIT';
}

export function inferBetSource(
  entry: Pick<GameHistoryEntry, 'betSource' | 'appliedRule' | 'id'>,
): 'manual' | 'auto' | 'unknown' {
  if (entry.betSource === 'manual' || entry.betSource === 'auto') return entry.betSource;
  const rule = entry.appliedRule || '';
  if (/오토|auto/i.test(rule)) return 'auto';
  if (/직접|수동|manual/i.test(rule)) return 'manual';
  if (typeof entry.id === 'string' && entry.id.includes('_auto')) return 'auto';
  if (typeof entry.id === 'string' && entry.id.includes('_manual')) return 'manual';
  return 'unknown';
}

export function normalizeHistoryEntry(entry: GameHistoryEntry): GameHistoryEntry {
  const betSource = inferBetSource(entry);
  const previousLooksLikeNote =
    !!entry.previousResult &&
    (/적중|손실|취소|반환|타이 —|베팅 차감|SETTLE|CANCEL|PLACE/.test(entry.previousResult) ||
      entry.previousResult.length > 40);
  const note = entry.note || (previousLooksLikeNote ? entry.previousResult : undefined);
  return {
    ...entry,
    betSource,
    note,
    previousResult: previousLooksLikeNote ? '-' : entry.previousResult || '-',
    shoeNumber: entry.shoeNumber || '-',
    round: Number(entry.round) || 0,
    gptOpinion: asOpinion(entry.gptOpinion),
    geminiOpinion: asOpinion(entry.geminiOpinion),
    claudeOpinion: asOpinion(entry.claudeOpinion),
    finalOpinion: asOpinion(entry.finalOpinion),
    userSelection: asOpinion(entry.userSelection),
  };
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
    if (!e.day && !e.at) continue;
    if (d !== today) continue;
    if (e.dataStatus === '취소' || e.dataStatus === '접수' || e.amount <= 0) continue;
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

function formatRecentResults(results?: Array<'P' | 'B' | 'T'>): string {
  if (!results?.length) return '-';
  return results.slice(-8).join(' ');
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
  const meta = result.historyMeta;
  const source: BetSource | 'unknown' = result.source || 'unknown';
  const appliedRule =
    opts?.appliedRule ||
    meta?.ruleLabel ||
    result.appliedRule ||
    (source === 'auto' ? '오토베팅' : source === 'manual' ? '직접 베팅' : '베팅');

  return {
    id: result.id,
    time: formatTime(at),
    tableName: result.tableName || result.tableId || '-',
    shoeNumber:
      opts?.shoeNumber || meta?.shoeNumber || meta?.gameCode || '-',
    round: opts?.round ?? meta?.round ?? 0,
    previousResult:
      opts?.previousResult || formatRecentResults(meta?.recentResults),
    gptOpinion: asOpinion(meta?.gptOpinion),
    geminiOpinion: asOpinion(meta?.geminiOpinion),
    claudeOpinion: asOpinion(meta?.claudeOpinion),
    finalOpinion: asOpinion(meta?.finalOpinion || sideToOpinion(result.side)),
    userSelection: result.amount <= 0 ? 'SKIP' : sideToOpinion(result.side),
    amount: result.amount,
    actualResult: (cancelled && result.won === null
      ? 'NONE'
      : result.outcome) as GameResult | 'NONE',
    pnl: result.pnlDelta,
    martingaleStage: opts?.martinStage ?? result.martinStage ?? 1,
    appliedRule,
    dataStatus: cancelled ? '취소' : '정상',
    at,
    day: dayKey(at),
    betSource: source === 'unknown' ? inferBetSource({ appliedRule, id: result.id }) : source,
    note: result.message,
  };
}

/** 최신 기록이 앞에 오도록 추가 */
export function appendBetHistory(entry: GameHistoryEntry): GameHistoryEntry[] {
  const normalized = normalizeHistoryEntry(entry);
  const prev = loadBetHistory().filter((e) => e.id !== normalized.id);
  const next = [normalized, ...prev].slice(0, MAX_ENTRIES);
  saveBetHistory(next);
  return next;
}

export function recordBetResult(
  result: LastBetResult,
  opts?: Parameters<typeof lastBetToHistoryEntry>[1],
): void {
  appendBetHistory(lastBetToHistoryEntry(result, opts));
}

function entryScore(e: GameHistoryEntry): number {
  let s = 0;
  if (e.betSource === 'manual' || e.betSource === 'auto') s += 4;
  if (e.round > 0) s += 2;
  if (e.shoeNumber && e.shoeNumber !== '-') s += 1;
  if (e.note) s += 2;
  if (e.previousResult && e.previousResult !== '-' && e.previousResult.length <= 40) s += 1;
  if (e.dataStatus === '정상') s += 2;
  if (e.dataStatus === '접수') s -= 5;
  if (!String(e.id).startsWith('wlog_')) s += 3;
  return s;
}

function parseCreatedAt(createdAt?: string, time?: string): number {
  if (createdAt) {
    const t = Date.parse(createdAt.replace(' ', 'T'));
    if (!Number.isNaN(t)) return t;
  }
  if (time && /^\d{2}:\d{2}:\d{2}$/.test(time)) {
    const d = new Date();
    const [hh, mm, ss] = time.split(':').map(Number);
    d.setHours(hh, mm, ss, 0);
    return d.getTime();
  }
  return 0;
}

export function mergeBetHistory(
  local: GameHistoryEntry[],
  remote: GameHistoryEntry[],
): GameHistoryEntry[] {
  const map = new Map<string, GameHistoryEntry>();
  for (const raw of [...remote, ...local]) {
    if (!raw?.id) continue;
    const e = normalizeHistoryEntry({
      ...raw,
      at: raw.at || parseCreatedAt(
        (raw as GameHistoryEntry & { createdAt?: string }).createdAt,
        raw.time,
      ),
    });
    // 접수(차감)만 있는 서버 로그는 정산 기록과 중복되므로 기본 목록에서 제외
    if (e.dataStatus === '접수') continue;
    const prev = map.get(e.id);
    if (!prev || entryScore(e) >= entryScore(prev)) {
      map.set(e.id, e);
    }
  }

  // 같은 시각·테이블·금액의 로컬/서버 중복만 제거 (로컬 우선)
  const list = Array.from(map.values());
  const deduped: GameHistoryEntry[] = [];
  for (const e of list.sort((a, b) => entryScore(b) - entryScore(a))) {
    const eRemote = String(e.id).startsWith('wlog_');
    const twin = deduped.find((x) => {
      const xRemote = String(x.id).startsWith('wlog_');
      if (eRemote === xRemote) return false;
      return (
        x.tableName === e.tableName &&
        x.amount === e.amount &&
        x.userSelection === e.userSelection &&
        Math.abs((x.at || 0) - (e.at || 0)) < 20_000
      );
    });
    if (twin) {
      if (entryScore(e) > entryScore(twin)) {
        const idx = deduped.indexOf(twin);
        deduped[idx] = e;
      }
      continue;
    }
    deduped.push(e);
  }

  return deduped.sort((a, b) => (b.at || 0) - (a.at || 0));
}
