import { PLATFORM_LINKS } from '../constants';

export type WalletBetSide = 'PLAYER' | 'BANKER' | 'TIE';

type BetApiResponse = {
  ok: boolean;
  message?: string;
  balance?: number;
  credit?: number;
  pnl?: number;
};

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
}): Promise<BetApiResponse> {
  return postBet({
    action: 'place',
    amount: input.amount,
    side: input.side,
    table_name: input.tableName,
    note: `베팅 차감 · ${input.tableName} · ${input.side}`,
  });
}

/** 결과 정산 입금 (이미 차감된 원금 기준) */
export async function walletSettleBet(input: {
  amount: number;
  side: WalletBetSide;
  outcome: 'P' | 'B' | 'T';
  tableName: string;
}): Promise<BetApiResponse> {
  return postBet({
    action: 'settle',
    amount: input.amount,
    side: input.side,
    outcome: input.outcome,
    table_name: input.tableName,
  });
}

/** 결과 대기 초과 등 취소 시 원금 반환 */
export async function walletCancelBet(input: {
  amount: number;
  tableName: string;
}): Promise<BetApiResponse> {
  return postBet({
    action: 'cancel',
    amount: input.amount,
    table_name: input.tableName,
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
