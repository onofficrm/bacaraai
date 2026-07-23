import { useEffect, useMemo, useState } from 'react';
import type { TableData } from '../types';

/** 결과 표시 후 베팅 가능 시간 (초) */
export const BET_WINDOW_SEC = 30;

/**
 * MySQL DATETIME(타임존 없음) 은 한국 서버(KST, UTC+9) 벽시계로 해석.
 * TZ 없는 문자열을 UTC/로컬로 오인해 창이 항상 30초에 고정되는 것을 막음.
 */
export function parseDetectedAtMs(value: string | null | undefined): number {
  if (!value) return NaN;
  const raw = String(value).trim();
  if (!raw) return NaN;

  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) {
    const t = Date.parse(raw);
    return Number.isNaN(t) ? NaN : t;
  }

  const m = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?$/,
  );
  if (m) {
    const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}+09:00`;
    const t = Date.parse(iso);
    return Number.isNaN(t) ? NaN : t;
  }

  const t = Date.parse(raw);
  return Number.isNaN(t) ? NaN : t;
}

/** 테이블별 클라이언트 창 시작 (latestId 변경 시 리셋) */
const clientWindowStart = new Map<string, { latestId: number; startMs: number }>();

function resolveWindowStartMs(
  table: TableData,
  latestId: number,
  now: number,
): number {
  const key = table.id;
  const prev = clientWindowStart.get(key);
  if (prev && prev.latestId === latestId) {
    return prev.startMs;
  }

  const detected = parseDetectedAtMs(table.live?.latestDetectedAt);
  let startMs = now;
  if (!Number.isNaN(detected)) {
    const elapsedSec = (now - detected) / 1000;
    // 서버 시각이 창 구간 안에 있으면 그대로 사용, 아니면(타임존 오류 등) 지금 기준
    if (elapsedSec >= -2 && elapsedSec <= BET_WINDOW_SEC + 2) {
      startMs = detected;
    } else if (elapsedSec > BET_WINDOW_SEC + 2) {
      // 이미 창이 지난 결과 — 시작점을 과거로 두어 remaining=0
      startMs = detected;
    } else {
      startMs = now;
    }
  }

  clientWindowStart.set(key, { latestId, startMs });
  return startMs;
}

/** 테이블 결과 시각 기준 남은 베팅 초 (오토·카드용) */
export function getBettingRemainingSecForTable(
  table: TableData,
  now = Date.now(),
): number {
  // 목업(비라이브)은 가짜 30초를 고정 표시하지 않음
  if (!table.live) {
    return 0;
  }

  const latestId = table.live.latestId;
  if (latestId == null) {
    return 0;
  }

  const startMs = resolveWindowStartMs(table, latestId, now);
  const elapsed = Math.floor((now - startMs) / 1000);
  if (elapsed < 0) {
    return BET_WINDOW_SEC;
  }
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
      results.length > 0 || table.live?.latestId != null;

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

    // 목업: 결과만 있고 라이브 아님 → 데모 베팅 창(항상 열림은 하지 않음)
    if (!table.live) {
      return {
        remainingSec: 0,
        hasResult: true,
        canPlaceBet: false,
        canCancelBet: false,
        progress: 0,
        statusLabel: '데모 테이블',
        hint: '라이브 테이블을 선택하면 30초 베팅이 가능합니다.',
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
