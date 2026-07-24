import { PLATFORM_LINKS } from '../constants';

export type WalletBetSide = 'PLAYER' | 'BANKER' | 'TIE';

type BetApiResponse = {
  ok: boolean;
  message?: string;
  balance?: number;
  credit?: number;
  pnl?: number;
  idempotent?: boolean;
};

/** place/settle/cancel 공통 idempotency 키 (서버 UNIQUE mb_id+client_key) */
export function makeWalletClientKey(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '')
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
}

/** pending.id 기반 결정적 키 (재시도·이중 호출 안전) */
export function settleClientKey(pendingId: string): string {
  return `s_${pendingId}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
}

export function cancelClientKey(pendingId: string): string {
  return `c_${pendingId}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
}

async function postBet(body: Record<string, unknown>): Promise<BetApiResponse> {
  const response = await fetch(PLATFORM_LINKS.walletBet, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as BetApiResponse;
  if (!response.ok || !data.ok) {
    return {
      ok: false,
      message: data.message || '가상머니 처리에 실패했습니다.',
      balance: data.balance,
    };
  }
  return data;
}

/** 베팅 확정 시 가상머니 차감 */
export async function walletPlaceBet(input: {
  amount: number;
  side: WalletBetSide;
  tableName: string;
  source?: 'manual' | 'auto';
  round?: number;
  shoeNumber?: string;
  clientKey: string;
}): Promise<BetApiResponse> {
  const source = input.source === 'auto' ? 'auto' : 'manual';
  return postBet({
    action: 'place',
    amount: input.amount,
    side: input.side,
    table_name: input.tableName,
    source,
    round: typeof input.round === 'number' ? input.round : 0,
    shoe: input.shoeNumber || '-',
    client_key: input.clientKey,
  });
}

/** 결과 정산 입금 (이미 차감된 원금 기준) */
export async function walletSettleBet(input: {
  amount: number;
  side: WalletBetSide;
  outcome: 'P' | 'B' | 'T';
  tableName: string;
  source?: 'manual' | 'auto';
  round?: number;
  shoeNumber?: string;
  clientKey: string;
}): Promise<BetApiResponse> {
  const source = input.source === 'auto' ? 'auto' : 'manual';
  return postBet({
    action: 'settle',
    amount: input.amount,
    side: input.side,
    outcome: input.outcome,
    table_name: input.tableName,
    source,
    round: typeof input.round === 'number' ? input.round : 0,
    shoe: input.shoeNumber || '-',
    client_key: input.clientKey,
  });
}

/** 결과 대기 초과 등 취소 시 원금 반환 */
export async function walletCancelBet(input: {
  amount: number;
  tableName: string;
  source?: 'manual' | 'auto';
  clientKey: string;
}): Promise<BetApiResponse> {
  const source = input.source === 'auto' ? 'auto' : 'manual';
  return postBet({
    action: 'cancel',
    amount: input.amount,
    table_name: input.tableName,
    source,
    client_key: input.clientKey,
  });
}

export function emitWalletBalance(balance: number) {
  window.dispatchEvent(
    new CustomEvent('bacara-wallet-balance', { detail: { balance } }),
  );
}

export type WalletHistoryItem = {
  id: string;
  time: string;
  tableName: string;
  shoeNumber: string;
  round: number;
  previousResult: string;
  gptOpinion: string;
  geminiOpinion: string;
  claudeOpinion: string;
  finalOpinion: string;
  userSelection: string;
  amount: number;
  actualResult: string;
  pnl: number;
  martingaleStage: number;
  appliedRule: string;
  dataStatus: string;
  createdAt?: string;
  betSource?: 'manual' | 'auto' | 'unknown';
  note?: string;
};

/** 서버 가상머니 베팅 로그 → 게임 기록 */
export async function fetchWalletBetHistory(limit = 100): Promise<WalletHistoryItem[]> {
  try {
    const response = await fetch(
      `${PLATFORM_LINKS.walletBetHistory}?limit=${limit}`,
      {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      },
    );
    const data = (await response.json()) as {
      ok?: boolean;
      items?: WalletHistoryItem[];
    };
    if (!response.ok || !data.ok || !Array.isArray(data.items)) return [];
    return data.items;
  } catch {
    return [];
  }
}
