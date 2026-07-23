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
    return 0;
  }
  return Math.max(0, BET_WINDOW_SEC - Math.floor((now - detected) / 1000));
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
 * 테이블을 고른 직후에는 베팅 불가.
 * 선택 이후 새 결과가 화면에 반영된 시점부터 30초 베팅 창.
 */
export default function useBettingWindow(table: TableData | null): BettingWindowState {
  const [now, setNow] = useState(() => Date.now());
  const [windowOpenedAt, setWindowOpenedAt] = useState<number | null>(null);
  const tableIdRef = useRef<string | null>(null);
  const baselineReadyRef = useRef(false);
  const prevLatestIdRef = useRef<number | null>(null);
  const prevResultKeyRef = useRef<string>('');

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!table) {
      setWindowOpenedAt(null);
      tableIdRef.current = null;
      baselineReadyRef.current = false;
      prevLatestIdRef.current = null;
      prevResultKeyRef.current = '';
      return;
    }

    const latestId = table.live?.latestId ?? null;
    const results = table.stats.recentResults || [];
    const resultKey = `${latestId ?? 'x'}:${results.length}:${results[results.length - 1] ?? ''}`;
    const hasSnapshot = latestId != null || results.length > 0;

    // 테이블을 새로 고르면: 현재 결과를 기준선으로만 잡고 창은 닫음
    if (tableIdRef.current !== table.id) {
      tableIdRef.current = table.id;
      setWindowOpenedAt(null);
      if (hasSnapshot) {
        prevLatestIdRef.current = latestId;
        prevResultKeyRef.current = resultKey;
        baselineReadyRef.current = true;
      } else {
        // 라이브 첫 응답 대기
        prevLatestIdRef.current = null;
        prevResultKeyRef.current = '';
        baselineReadyRef.current = false;
      }
      return;
    }

    // 선택 직후 로딩 → 첫 스냅샷은 기준선만 설정 (베팅 창 열지 않음)
    if (!baselineReadyRef.current) {
      if (!hasSnapshot) return;
      prevLatestIdRef.current = latestId;
      prevResultKeyRef.current = resultKey;
      baselineReadyRef.current = true;
      setWindowOpenedAt(null);
      return;
    }

    const idChanged =
      latestId != null &&
      prevLatestIdRef.current !== latestId;

    const keyChanged =
      resultKey !== prevResultKeyRef.current && results.length > 0;

    if (idChanged || keyChanged) {
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
    // 창이 한 번도 안 열렸으면: 기존 슈 결과가 있어도 "다음 결과 대기"
    if (!table || windowOpenedAt == null) {
      return {
        remainingSec: 0,
        hasResult: false,
        canPlaceBet: false,
        canCancelBet: false,
        progress: 0,
        statusLabel: '결과 대기',
        hint: '새 결과가 나오면 30초 동안 베팅할 수 있습니다.',
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
