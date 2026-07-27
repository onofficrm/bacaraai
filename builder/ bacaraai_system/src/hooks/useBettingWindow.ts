import { useEffect, useMemo, useState } from 'react';
import type { TableData } from '../types';

/** 마지막 결과 표시 후 베팅 가능 시간 (초) */
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

/**
 * 테이블별 베팅 창 시작 시각.
 * - 기준: 마지막 결과가 표시(감지)된 시각
 * - latestId 가 바뀌면 창을 다시 연다
 * - detected_at 이 늦게 도착하면 같은 latestId 라도 서버 시각으로 보정
 */
const clientWindowStart = new Map<
  string,
  { latestId: number; startMs: number; fromServer: boolean }
>();

function resolveWindowStartMs(
  table: TableData,
  latestId: number,
  now: number,
): number {
  const key = table.id;
  const prev = clientWindowStart.get(key);
  const detected = parseDetectedAtMs(table.live?.latestDetectedAt);

  // 1) 서버 결과 시각이 있으면 그게 절대 기준 (마지막 결과 표시 시점)
  if (!Number.isNaN(detected)) {
    // 미래로 과도하게 치우친 값만 시계/TZ 오류로 보고 보정
    const startMs = detected > now + 2_000 ? now : detected;
    const sameId = prev && prev.latestId === latestId;
    // 같은 회차에서 이미 서버 시각을 쓰고 있으면 유지 (매 틱 Map 갱신 불필요)
    if (sameId && prev.fromServer && prev.startMs === startMs) {
      return prev.startMs;
    }
    // 클라이언트 fallback → 서버 시각으로 업그레이드
    clientWindowStart.set(key, { latestId, startMs, fromServer: detected <= now + 2_000 });
    return startMs;
  }

  // 2) detected_at 아직 없음 → 이 클라이언트에서 해당 결과를 처음 본 시각
  if (prev && prev.latestId === latestId) {
    return prev.startMs;
  }
  clientWindowStart.set(key, { latestId, startMs: now, fromServer: false });
  return now;
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
 * 마지막 결과가 표시된 뒤 30초 베팅 창.
 * 새 결과가 오면 다시 30초부터 시작.
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
        hint: '마지막 결과가 표시되면 그때부터 30초 동안 베팅할 수 있습니다.',
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
        hint: '라이브 테이블을 선택하면 결과 표시 후 30초 베팅이 가능합니다.',
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
        ? '마지막 결과 표시 후 30초입니다. 이 안에 베팅·취소하세요.'
        : '베팅 가능 시간이 끝났습니다. 다음 결과가 나오면 다시 30초가 열립니다.',
    };
  }, [table, now, table?.live?.latestId, table?.live?.latestDetectedAt]);
}
