/**
 * 패턴 오토 규칙 검증 (빌드/로컬에서 실행)
 *   npx tsx src/utils/patternReplay.test.ts
 */
import assert from 'node:assert/strict';
import {
  matchesPattern,
  patternMatchFingerprint,
  findFreshMatchingPatternCase,
  defaultPatternCases,
} from './patternMatch.ts';
import { replayPatternBets, assertNoBetOnExtendedStreak } from './patternReplay.ts';
import type { PatternCase, GameResult } from '../types.ts';

const bbP: PatternCase = {
  id: 'bb_p',
  label: '뱅뱅다음플',
  enabled: true,
  patternSegments: [{ side: 'B', count: 2, atLeast: false }],
  patternBetSide: 'PLAYER',
};
const ppP: PatternCase = {
  id: 'pp_p',
  label: '플플다음플',
  enabled: true,
  patternSegments: [{ side: 'P', count: 2, atLeast: false }],
  patternBetSide: 'PLAYER',
};
const cases = [bbP, ppP];

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✗ ${name}`);
    throw e;
  }
}

run('exact BB matches, BBB does not', () => {
  assert.equal(matchesPattern(['P', 'B', 'B'], bbP.patternSegments), true);
  assert.equal(matchesPattern(['P', 'B', 'B', 'B'], bbP.patternSegments), false);
});

run('Tie keeps same BB fingerprint', () => {
  const a = patternMatchFingerprint(['P', 'B', 'B'], bbP.patternSegments);
  const b = patternMatchFingerprint(['P', 'B', 'B', 'T'], bbP.patternSegments);
  assert.ok(a);
  assert.equal(a, b);
});

run('consumed fingerprint blocks Tie re-entry', () => {
  const fp = patternMatchFingerprint(['P', 'B', 'B'], bbP.patternSegments)!;
  const consumed = new Map([['t1:bb_p', fp]]);
  const blocked = findFreshMatchingPatternCase(['P', 'B', 'B', 'T'], cases, {
    tableId: 't1',
    consumed,
  });
  assert.equal(blocked, null);
});

run('user scenario: BB→bet once, BBB no rebet, later PP/BB re-enter', () => {
  // P BB | bet on next | B (loss→BBB) | P | B B | bet again | P
  const results: GameResult[] = ['P', 'B', 'B', 'B', 'P', 'B', 'B', 'P'];
  const { bets, log } = replayPatternBets(results, cases);
  console.log('  ', log.join(' | '));

  // first bet after initial BB (index 3 = after P,B,B)
  assert.equal(bets.length >= 1, true);
  assert.equal(bets[0].atIndex, 3);
  assert.equal(bets[0].caseId, 'bb_p');

  // no bet while BBB / middle noise until new formation
  const midBets = bets.filter((b) => b.atIndex > 3 && b.atIndex < 7);
  assert.equal(midBets.length, 0, 'BBB~중간 구간 베팅 없어야 함');

  // second bet when new BB forms (road ...P,B,B at index 7)
  assert.equal(bets.length, 2);
  assert.equal(bets[1].atIndex, 7);
  assert.equal(bets[1].caseId, 'bb_p');
});

run('PP then P: only one entry per formation', () => {
  const results: GameResult[] = ['B', 'P', 'P', 'P', 'P'];
  const { bets } = replayPatternBets(results, cases);
  assert.equal(bets.length, 1);
  assert.equal(bets[0].atIndex, 3);
  assert.equal(bets[0].caseId, 'pp_p');
});

run('assertNoBetOnExtendedStreak helper', () => {
  const r = assertNoBetOnExtendedStreak(['B', 'B', 'B', 'B', 'P'], [bbP]);
  assert.equal(r.ok, true, r.detail);
});

run('defaults include BB/PP style cases', () => {
  const d = defaultPatternCases();
  assert.ok(d.length >= 2);
});

console.log('\nAll pattern replay tests passed.');
