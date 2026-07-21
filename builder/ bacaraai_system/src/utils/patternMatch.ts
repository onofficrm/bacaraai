import type { GameResult, PatternSegment } from '../types';
import type { BetSide } from '../hooks/useSession';

/** 연속 같은 결과를 구간으로 묶기 (이상은 false) */
export function beadsToSegments(beads: GameResult[]): PatternSegment[] {
  const out: PatternSegment[] = [];
  for (const side of beads) {
    const last = out[out.length - 1];
    if (last && last.side === side && !last.atLeast) {
      last.count += 1;
    } else if (last && last.side === side && last.atLeast) {
      last.count += 1;
    } else {
      out.push({ side, count: 1, atLeast: false });
    }
  }
  return out;
}

/** 표시·추가용으로 구간을 구슬 목록으로 펼침 */
export function segmentsToBeads(segments: PatternSegment[]): GameResult[] {
  const beads: GameResult[] = [];
  for (const seg of segments) {
    for (let i = 0; i < seg.count; i++) beads.push(seg.side);
  }
  return beads;
}

export function patternTotalGames(segments: PatternSegment[]): number {
  return segments.reduce((sum, s) => sum + Math.max(0, s.count), 0);
}

/**
 * recentResults 끝이 패턴 구간과 맞는지.
 * atLeast=true 이면 해당 사이드가 최소 count 연속(더 길어도 OK).
 * atLeast=false 이면 정확히 count 연속(더 길면 불일치).
 * 패턴에 Tie 가 없으면 히스토리 Tie 는 무시.
 */
export function matchesPattern(
  recentResults: GameResult[],
  segments: PatternSegment[],
): boolean {
  if (!segments.length) return false;
  const hasTie = segments.some((s) => s.side === 'T');
  const hist = hasTie ? recentResults : recentResults.filter((r) => r !== 'T');
  const minLen = patternTotalGames(segments);
  if (hist.length < minLen) return false;

  let i = hist.length - 1;
  for (let s = segments.length - 1; s >= 0; s -= 1) {
    const seg = segments[s];
    if (seg.count < 1) return false;

    if (seg.atLeast) {
      let n = 0;
      while (i >= 0 && hist[i] === seg.side) {
        n += 1;
        i -= 1;
      }
      if (n < seg.count) return false;
    } else {
      for (let k = 0; k < seg.count; k += 1) {
        if (i < 0 || hist[i] !== seg.side) return false;
        i -= 1;
      }
      // 정확 매칭: 그 앞에 같은 사이드가 더 있으면 안 됨
      if (i >= 0 && hist[i] === seg.side) return false;
    }
  }
  return true;
}

export function formatPattern(segments: PatternSegment[] | GameResult[]): string {
  const segs: PatternSegment[] = Array.isArray(segments) && segments.length > 0
    ? typeof segments[0] === 'string'
      ? beadsToSegments(segments as GameResult[])
      : (segments as PatternSegment[])
    : [];
  if (!segs.length) return '(없음)';
  return segs
    .map((seg) => {
      const label = seg.side;
      const cnt = seg.count > 1 || seg.atLeast ? `×${seg.count}` : '';
      const plus = seg.atLeast ? '이상' : '';
      return `${label}${cnt}${plus}`;
    })
    .join(' → ');
}

/** 시그널/저장용 짧은 키 */
export function patternSignalKey(segments: PatternSegment[]): string {
  return segments.map((s) => `${s.side}${s.count}${s.atLeast ? '+' : ''}`).join('_');
}

/** 구버전 flat sequence → segments 정규화 */
export function normalizePatternSegments(
  config: {
    patternSegments?: PatternSegment[];
    patternSequence?: GameResult[];
  },
): PatternSegment[] {
  if (config.patternSegments && config.patternSegments.length > 0) {
    return config.patternSegments.map((s) => ({
      side: s.side,
      count: Math.max(1, Math.floor(s.count) || 1),
      atLeast: Boolean(s.atLeast),
    }));
  }
  if (config.patternSequence && config.patternSequence.length > 0) {
    return beadsToSegments(config.patternSequence);
  }
  return [];
}

export function patternSideLabel(side: BetSide): string {
  if (side === 'BANKER') return 'Banker';
  if (side === 'TIE') return 'Tie';
  return 'Player';
}

export function gameResultToBetSide(r: GameResult): BetSide {
  if (r === 'B') return 'BANKER';
  if (r === 'T') return 'TIE';
  return 'PLAYER';
}

export function betSideToGameResult(side: BetSide): GameResult {
  if (side === 'BANKER') return 'B';
  if (side === 'TIE') return 'T';
  return 'P';
}
