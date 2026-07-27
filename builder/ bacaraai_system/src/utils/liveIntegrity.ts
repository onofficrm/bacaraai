import type { GameResult } from '../types';

export type LiveIntegrity = {
  version?: number;
  results_fp: string;
  count: number;
  latest_id?: number | null;
  latest_result?: string | null;
  latest_game_no?: number | null;
  source?: string;
  manual_mode?: boolean;
  synced: boolean;
  policy?: string;
  detector_max_id?: number | null;
  detector_result?: string | null;
  message?: string | null;
  healed?: boolean;
  manual_baseline_id?: number | null;
};

export type LiveFeedRow = {
  id: number;
  table_name?: string;
  game_no?: number | null;
  result: GameResult | string;
  detected_at?: string;
};

export type LiveFeedResponse = {
  ok: boolean;
  message?: string;
  table_name?: string;
  game_no?: number | null;
  latest_id?: number | null;
  latest_detected_at?: string | null;
  shuffle_active?: boolean;
  manual_mode?: boolean;
  source?: string;
  results_fp?: string;
  integrity?: LiveIntegrity;
  results?: LiveFeedRow[];
};

/** 서버와 동일한 지문 규칙 (sha256 앞 20자 — Web Crypto) */
export async function fingerprintLiveResults(
  rows: Array<{ id?: number; result?: string; game_no?: number | null }>,
): Promise<string> {
  if (!rows.length) return 'empty';
  const parts: string[] = [];
  for (const r of rows) {
    const res = String(r.result || '')
      .trim()
      .toUpperCase();
    if (!res) continue;
    parts.push(`${Number(r.id) || 0}:${res}:${Number(r.game_no) || 0}`);
  }
  if (!parts.length) return 'empty';
  const raw = parts.join('|');
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
    const hex = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return hex.slice(0, 20);
  }
  // fallback: 약한 해시 (구형 환경) — 서버 fp 와 다를 수 있어 검증 skip 신호
  let h = 0;
  for (let i = 0; i < raw.length; i += 1) h = (h * 31 + raw.charCodeAt(i)) >>> 0;
  return `weak${h.toString(16)}`;
}

export type IntegrityCheck = {
  ok: boolean;
  synced: boolean;
  healed: boolean;
  message: string | null;
  fpMatch: boolean;
};

export async function verifyLiveFeedIntegrity(
  data: LiveFeedResponse,
): Promise<IntegrityCheck> {
  const rows = Array.isArray(data.results) ? data.results : [];
  const serverFp = data.integrity?.results_fp || data.results_fp || '';
  const clientFp = await fingerprintLiveResults(rows);
  const canVerify = Boolean(serverFp) && !clientFp.startsWith('weak');
  const fpMatch = !canVerify ? true : serverFp === clientFp;
  const synced = data.integrity ? data.integrity.synced !== false : true;
  const healed = Boolean(data.integrity?.healed);
  const message =
    data.integrity?.message ||
    (!fpMatch ? '표시 지문이 서버와 일치하지 않습니다. 재동기화합니다.' : null);

  return {
    ok: fpMatch && synced,
    synced,
    healed,
    message,
    fpMatch,
  };
}
