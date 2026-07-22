import { useEffect, useMemo, useRef, useState } from 'react';
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
    return table.stats.recentResults?.length ? 0 : 0;
  }
  return Math.max(0, BET_WINDOW_SEC - Math.floor((now - detected) / 1000));
}

export type BettingWindowState = {
  /** 남은 초 (0이면 마감) */
  remainingSec: number;
  /** 새 결과가 있어 윈도우가 열린 적 있는지 */
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
 * 결과가 화면에 반영된 시점부터 30초 베팅 창.
 * latestId 변경을 "표시 시점"으로 보고 로컬 시각으로 카운트한다.
 */
export default function useBettingWindow(table: TableData | null): BettingWindowState {
  const [now, setNow] = useState(() => Date.now());
  const [windowOpenedAt, setWindowOpenedAt] = useState<number | null>(null);
  const prevLatestIdRef = useRef<number | null | undefined>(undefined);
  const prevResultKeyRef = useRef<string>('');

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!table) {
      setWindowOpenedAt(null);
      prevLatestIdRef.current = undefined;
      prevResultKeyRef.current = '';
      return;
    }

    const latestId = table.live?.latestId ?? null;
    const results = table.stats.recentResults || [];
    const resultKey = `${latestId ?? 'x'}:${results.length}:${results[results.length - 1] ?? ''}`;

    const idChanged =
      latestId != null &&
      prevLatestIdRef.current !== undefined &&
      latestId !== prevLatestIdRef.current;

    const keyChanged =
      prevResultKeyRef.current !== '' && prevResultKeyRef.current !== resultKey && results.length > 0;

    // 최초 로드: 서버 detected_at 기준으로 남은 시간 맞춤 (너무 오래된 결과는 0)
    if (prevLatestIdRef.current === undefined && prevResultKeyRef.current === '') {
      prevLatestIdRef.current = latestId;
      prevResultKeyRef.current = resultKey;
      if (results.length === 0 && latestId == null) {
        setWindowOpenedAt(null);
        return;
      }
      const detected = table.live?.latestDetectedAt
        ? Date.parse(table.live.latestDetectedAt)
        : NaN;
      if (!Number.isNaN(detected)) {
        const ageSec = (Date.now() - detected) / 1000;
        if (ageSec <= BET_WINDOW_SEC) {
          setWindowOpenedAt(detected);
        } else {
          setWindowOpenedAt(null);
        }
      } else {
        setWindowOpenedAt(Date.now());
      }
      return;
    }

    if (idChanged || keyChanged) {
      // 결과가 새로 표시된 순간부터 30초
      setWindowOpenedAt(Date.now());
    }

    prevLatestIdRef.current = latestId;
    prevResultKeyRef.current = resultKey;
  }, [
    table?.id,
    table?.live?.latestId,
    table?.live?.latestDetectedAt,
    table?.stats.recentResults,
  ]);

  return useMemo(() => {
    const hasResult = Boolean(
      table &&
        ((table.stats.recentResults && table.stats.recentResults.length > 0) ||
          table.live?.latestId != null),
    );

    if (!table || !hasResult || windowOpenedAt == null) {
      return {
        remainingSec: 0,
        hasResult: Boolean(hasResult),
        canPlaceBet: false,
        canCancelBet: false,
        progress: 0,
        statusLabel: hasResult ? '베팅 마감' : '결과 대기',
        hint: hasResult
          ? '베팅 가능 시간이 끝났습니다. 다음 결과를 기다리세요.'
          : '결과가 표시되면 30초 동안 베팅할 수 있습니다.',
      };
    }

    const elapsedMs = Math.max(0, now - windowOpenedAt);
    const remainingMs = Math.max(0, BET_WINDOW_SEC * 1000 - elapsedMs);
    const remainingSec = Math.ceil(remainingMs / 1000);
    const open = remainingSec > 0;
    const progress = Math.min(1, Math.max(0, remainingMs / (BET_WINDOW_SEC * 1000)));

    return {
      remainingSec: open ? remainingSec : 0,
      hasResult: true,
      canPlaceBet: open,
      canCancelBet: open,
      progress,
      statusLabel: open ? `베팅 가능 ${remainingSec}초` : '베팅 마감',
      hint: open
        ? '결과 확인 후 남은 시간 안에 베팅하세요.'
        : '베팅 가능 시간이 끝났습니다. 이미 접수한 베팅은 취소할 수 없습니다.',
    };
  }, [table, windowOpenedAt, now]);
}
