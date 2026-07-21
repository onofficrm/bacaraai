import type { GameResult } from '../types';
import type { BetSide } from '../hooks/useSession';

/** recentResults 끝이 pattern 과 일치하는지 (기본: 히스토리의 Tie 는 무시) */
export function matchesPattern(
  recentResults: GameResult[],
  pattern: GameResult[],
): boolean {
  if (!pattern.length) return false;
  const ignoreTie = !pattern.includes('T');
  const hist = ignoreTie ? recentResults.filter((r) => r !== 'T') : recentResults;
  if (hist.length < pattern.length) return false;
  const suffix = hist.slice(-pattern.length);
  return suffix.every((r, i) => r === pattern[i]);
}

export function formatPattern(pattern: GameResult[]): string {
  if (!pattern.length) return '(없음)';
  return pattern
    .map((r) => (r === 'P' ? 'P' : r === 'B' ? 'B' : 'T'))
    .join(' → ');
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
