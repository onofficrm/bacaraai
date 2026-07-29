import { useEffect, useMemo, useState } from 'react';
import type { TableData } from '../types';

/** 게임 결과가 화면에 반영된 뒤 베팅 가능 시간 (초) */
export const BET_WINDOW_SEC = 30;

/**
 * MySQL DATETIME(타임존 없음) 은 한국 서버(KST, UTC+9) 벽시계로 해석.
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
 *
 * 규칙:
 * - 라이브 중 latestId 가 바뀌면(= 새 결과가 화면에 뜸) 그 순간부터 30초
 * - 서버 detected_at 으로 창을 줄이지 않음 (폴링 지연으로 30초가 깎이는 문제 방지)
 * - 새로고침·첫 진입만 detected_at 으로 남은 시간 복원
 */
const clientWindowStart = new Map<string, { latestId: number; startMs: number }>();

function resolveWindowStartMs(
  table: TableData,
  latestId: number,
  now: number,
): number {
  const key = table.id;
  const prev = clientWindowStart.get(key);

  // 이미 이 결과를 보고 창을 연 상태 → 시작 시각 고정 (틱마다 리셋 금지)
  if (prev && prev.latestId === latestId) {
    return prev.startMs;
  }

  const detected = parseDetectedAtMs(table.live?.latestDetectedAt);
  const hadPreviousResult = prev != null;

  let startMs: number;
  if (hadPreviousResult) {
    // 시청 중 새 결과 도착 → 표시 시점부터 풀 30초
    startMs = now;
  } else if (!Number.isNaN(detected)) {
    // 첫 진입/새로고침 → 서버 감지 시각으로 남은 시간 복원
    // (미래로 치우친 값만 시계 오차로 보고 now 사용)
    startMs = detected > now + 2_000 ? now : detected;
  } else {
    startMs = now;
  }

  clientWindowStart.set(key, { latestId, startMs });
  return startMs;
}

/** 테이블 결과 표시 기준 남은 베팅 초 (오토·카드용) */
export function getBettingRemainingSecForTable(
  table: TableData,
  now = Date.now(),
): number {
  if (!table.live) {
    return 0;
  }

  // game_status: stop=대기, shuffle=셔플 — 베팅 창 닫음
  const gs = table.live.gameStatus;
  if (gs === 'stop' || gs === 'shuffle' || table.live.shuffleActive) {
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
 * 결과가 화면에 반영된 뒤 30초 베팅 창.
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

    const gs = table.live.gameStatus;
    if (gs === 'stop') {
      return {
        remainingSec: 0,
        hasResult: true,
        canPlaceBet: false,
        canCancelBet: false,
        progress: 0,
        statusLabel: '감지 대기(stop)',
        hint: '감지 프로그램이 stop 상태입니다. game 으로 전환되면 베팅할 수 있습니다.',
      };
    }
    if (gs === 'shuffle' || table.live.shuffleActive) {
      return {
        remainingSec: 0,
        hasResult: true,
        canPlaceBet: false,
        canCancelBet: false,
        progress: 0,
        statusLabel: '셔플 중',
        hint: '셔플이 끝나면 game 상태로 복귀하며 다시 30초 베팅 창이 열립니다.',
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
        ? '결과 표시 후 30초입니다. 이 안에 베팅·취소하세요.'
        : '베팅 가능 시간이 끝났습니다. 다음 결과가 나오면 다시 30초가 열립니다.',
    };
  }, [
    table,
    now,
    table?.live?.latestId,
    table?.live?.latestDetectedAt,
    table?.live?.gameStatus,
    table?.live?.shuffleActive,
  ]);
}
