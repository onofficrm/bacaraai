import type { AiOpinion, SessionConfig } from '../types';

export type RecommendBetContext = {
  config: SessionConfig;
  pnl: number;
  availableBankroll: number;
  martinStage?: number;
};

export type RecommendBetInput = RecommendBetContext & {
  opinion: AiOpinion;
  confidence: number;
  consensus: string;
};

export type RecommendBetResult = {
  amount: number;
  reason: string;
};

function parseConsensus(consensus: string): { agree: number; total: number } {
  const m = String(consensus || '').match(/(\d)\s*\/\s*(\d)/);
  if (!m) return { agree: 0, total: 3 };
  return { agree: Number(m[1]) || 0, total: Number(m[2]) || 3 };
}

function roundToChip(amount: number): number {
  if (amount <= 0) return 0;
  // 1천 단위, 최소 1천
  return Math.max(1000, Math.floor(amount / 1000) * 1000);
}

/**
 * AI 방향이 있을 때 참고 베팅액 추천.
 * - 기본: initialBet
 * - 신뢰도·합의로 배수
 * - 윈컷·로스컷·잔액·maxBet 으로 상한
 */
export function recommendBetAmount(input: RecommendBetInput): RecommendBetResult {
  const {
    opinion,
    confidence,
    consensus,
    config,
    pnl,
    availableBankroll,
    martinStage = 1,
  } = input;

  const actionable = opinion === 'PLAYER' || opinion === 'BANKER';
  if (!actionable) {
    return { amount: 0, reason: '관망 — 금액 추천 없음' };
  }

  const base = Math.max(1000, Math.floor(config.initialBet || 10000));
  const maxBet = Math.max(base, Math.floor(config.maxBet || base));
  const winCut = Number(config.winCut) || 0;
  const lossCut = Number(config.lossCut) || 0;
  const conf = Math.max(0, Math.min(100, Math.floor(confidence || 0)));
  const { agree } = parseConsensus(consensus);

  // 1) 신뢰도 배수
  let mult = 1;
  let confLabel = '기본';
  if (conf >= 75) {
    mult = 2;
    confLabel = '신뢰 높음×2';
  } else if (conf >= 65) {
    mult = 1.5;
    confLabel = '신뢰 양호×1.5';
  } else if (conf >= 55) {
    mult = 1;
    confLabel = '신뢰 보통×1';
  } else {
    mult = 0.5;
    confLabel = '신뢰 낮음×0.5';
  }

  // 2) 합의 배수
  let agreeLabel = '';
  if (agree >= 3) {
    mult *= 1.25;
    agreeLabel = '·3/3';
  } else if (agree === 2) {
    agreeLabel = '·2/3';
  } else if (agree <= 1) {
    mult *= 0.5;
    agreeLabel = '·합의약함';
  }

  let raw = base * mult;

  // 3) 윈컷 근접: 목표의 85% 이상이면 공격 배수 제거(기본액 유지)
  if (winCut > 0 && pnl >= winCut * 0.85) {
    raw = Math.min(raw, base);
    confLabel += '·윈컷근접';
  }
  // 윈컷까지 남은 폭이 작으면 그 이상으로 불필요하게 키우지 않음
  const roomToWin = winCut - pnl;
  if (winCut > 0 && roomToWin > 0 && roomToWin < base * 2) {
    raw = Math.min(raw, Math.max(base, roomToWin));
  }

  // 4) 로스컷 여유: 남은 손실 버퍼의 5%를 상한으로
  const roomToLoss = pnl - lossCut; // lossCut normally negative
  let lossCap = Number.POSITIVE_INFINITY;
  if (Number.isFinite(roomToLoss) && roomToLoss > 0) {
    lossCap = roomToLoss * 0.05;
    if (roomToLoss < base * 5) {
      raw = Math.min(raw, base * 0.5);
      confLabel += '·로스컷근접';
    }
    if (roomToLoss < base) {
      return { amount: 0, reason: '로스컷 여유 부족 — 관망 권장' };
    }
  }

  // 5) 마틴 단계 높으면 추천 증액 억제
  const stage = Math.max(1, martinStage || 1);
  const maxMartin = Math.max(1, config.maxMartin || 6);
  if (stage >= Math.max(3, Math.ceil(maxMartin * 0.5))) {
    raw = Math.min(raw, base);
    confLabel += '·마틴억제';
  }

  // 6) 잔액·maxBet 클램프 (잔액 3%)
  const bankCap = Math.max(0, availableBankroll) * 0.03;
  const capped = Math.min(
    raw,
    maxBet,
    bankCap > 0 ? bankCap : raw,
    Number.isFinite(lossCap) ? lossCap : raw,
  );

  const amount = roundToChip(capped);
  if (amount <= 0) {
    return { amount: 0, reason: '잔액/한도상 추천액 없음' };
  }

  const reason = `기준 ${base.toLocaleString()}원 · ${confLabel}${agreeLabel} · 윈/로스컷 반영`;
  return { amount, reason };
}
