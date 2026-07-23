import { useEffect, useMemo, useState } from 'react';
import type { TableData } from '../types';

/** 결과 표시 후 베팅 가능 시간 (초) */
export const BET_WINDOW_SEC = 30;

/** 테이블 결과 시각 기준 남은 베팅 초 (오토·카드용) */
export function getBettingRemainingSecForTable(
  table: TableData,
  now = Date.now(),
): number {
  if (!table.live) {
    // 데모 테이블은 항상 창 열린 것으로 취급
    return BET_WINDOW_SEC;
  }
  const detected = table.live.latestDetectedAt
    ? Date.parse(table.live.latestDetectedAt)
    : NaN;
  if (Number.isNaN(detected)) {
    return 0;
  }
  // 서버 시각이 앞서 있으면(타임존) 창이 비정상적으로 커지지 않게 클램프
  const elapsed = Math.floor((now - detected) / 1000);
  if (elapsed < 0) return BET_WINDOW_SEC;
  return Math.max(0, Math.min(BET_WINDOW_SEC, BET_WINDOW_SEC - elapsed));
}

export type BettingWindowState = {
  /** 남은 초 (0이면 마감) */
  remainingSec: number;
  /** 이 선택 이후 베팅 창이 열린 적 있는지(새 결과 기준) */
  hasResult: boolean;
  /** 베팅 접수 가능 */
  canPlaceBet: boolean;
  /** 대기 중 베팅 취소 가능 (남은 시간 있을 때만) */
  canCancelBet: boolean;
  /** 진행률 0~1 (1 = 막 열림) */
  progress: number;
  statusLabel: string;
  hint: string;
};

/**
 * 마지막 결과 시각 기준 30초 베팅 창.
 * 테이블을 클릭하면 남은 시간이 바로 표시되고, 그 안에 베팅 가능.
 * 새 결과가 오면 창이 다시 30초로 열림.
 */
export default function useBettingWindow(table: TableData | null): BettingWindowState {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  return useMemo(() => {
    if (!table) {
      return {
        remainingSec: 0,
        hasResult: false,
        canPlaceBet: false,
        canCancelBet: false,
        progress: 0,
        statusLabel: '테이블 선택',
        hint: '베팅할 테이블을 선택하세요.',
      };
    }

    const results = table.stats.recentResults || [];
    const hasResult =
      results.length > 0 || table.live?.latestId != null || !table.live;

    if (!hasResult) {
      return {
        remainingSec: 0,
        hasResult: false,
        canPlaceBet: false,
        canCancelBet: false,
        progress: 0,
        statusLabel: '결과 대기',
        hint: '결과가 나오면 30초 동안 베팅할 수 있습니다.',
      };
    }

    const remainingSec = getBettingRemainingSecForTable(table, now);
    const open = remainingSec > 0;
    const progress = open ? remainingSec / BET_WINDOW_SEC : 0;

    return {
      remainingSec,
      hasResult: true,
      canPlaceBet: open,
      canCancelBet: open,
      progress,
      statusLabel: open ? `베팅 가능 ${remainingSec}초` : '베팅 마감',
      hint: open
        ? '남은 시간 안에 베팅하세요. 새 결과가 나오면 다시 30초가 열립니다.'
        : '베팅 가능 시간이 끝났습니다. 다음 결과를 기다리세요.',
    };
  }, [table, now]);
}
