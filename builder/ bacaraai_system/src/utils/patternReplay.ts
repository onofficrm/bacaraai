import type { GameResult, PatternCase } from '../types';
import {
  findFreshMatchingPatternCase,
  patternMatchFingerprint,
} from './patternMatch';

export type PatternReplayBet = {
  /** 베팅이 걸린 직후 결과 인덱스 (0-based, results[i] 가 정산 결과) */
  atIndex: number;
  caseId: string;
  caseLabel: string;
  side: 'PLAYER' | 'BANKER' | 'TIE';
  fingerprint: string;
  /** 베팅 직전까지의 로드맵 (results[0..atIndex) ) */
  before: GameResult[];
};

export type PatternReplayResult = {
  bets: PatternReplayBet[];
  /** 각 단계별 설명 (디버그) */
  log: string[];
};

/**
 * 결과 시퀀스를 재생하며, 패턴 오토와 같은 규칙으로 베팅 시점을 계산.
 * - 매칭 1회 = 베팅 1회
 * - 같은 fingerprint 재사용 금지
 * - 정산 대기(pending) 중에는 추가 진입 없음
 */
export function replayPatternBets(
  results: GameResult[],
  cases: PatternCase[],
  opts?: { tableId?: string },
): PatternReplayResult {
  const tableId = opts?.tableId || 't1';
  const consumed = new Map<string, string>();
  const bets: PatternReplayBet[] = [];
  const log: string[] = [];
  let pending: PatternReplayBet | null = null;

  for (let i = 0; i <= results.length; i += 1) {
    const before = results.slice(0, i);

    // 직전 베팅 정산
    if (pending && i > pending.atIndex) {
      const outcome = results[pending.atIndex];
      log.push(
        `settle@${pending.atIndex}: ${pending.caseLabel} ${pending.side} ← ${outcome}`,
      );
      pending = null;
    }

    if (pending) continue;
    if (i >= results.length) break;

    const fresh = findFreshMatchingPatternCase(before, cases, {
      tableId,
      consumed,
    });
    if (!fresh) continue;

    const bet: PatternReplayBet = {
      atIndex: i,
      caseId: fresh.matched.id,
      caseLabel: fresh.matched.label,
      side: fresh.matched.patternBetSide,
      fingerprint: fresh.fingerprint,
      before: [...before],
    };
    consumed.set(`${tableId}:${fresh.matched.id}`, fresh.fingerprint);
    bets.push(bet);
    pending = bet;
    log.push(
      `bet@${i}: ${fresh.matched.label} → ${fresh.matched.patternBetSide} fp=${fresh.fingerprint} road=${before.join('')}`,
    );
  }

  return { bets, log };
}

/** 운영 시나리오 검증용 헬퍼 */
export function assertNoBetOnExtendedStreak(
  results: GameResult[],
  cases: PatternCase[],
): { ok: boolean; detail: string } {
  const { bets } = replayPatternBets(results, cases);
  // BB 패턴 후 B 가 나와 BBB 가 된 직후에는 베팅이 없어야 함
  for (let i = 3; i < results.length; i += 1) {
    const prefix = results.slice(0, i);
    if (prefix.slice(-3).join('') !== 'BBB') continue;
    const betHere = bets.find((b) => b.atIndex === i);
    if (betHere) {
      return {
        ok: false,
        detail: `BBB 직후(index=${i})에 베팅이 발생: ${betHere.caseLabel}`,
      };
    }
  }
  return { ok: true, detail: 'BBB 직후 재진입 없음' };
}

export function fingerprintOf(
  results: GameResult[],
  segments: PatternCase['patternSegments'],
): string | null {
  return patternMatchFingerprint(results, segments);
}
