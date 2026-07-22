import type { GameResult, PatternCase, PatternSegment, SessionConfig } from '../types';
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
      if (i >= 0 && hist[i] === seg.side) return false;
    }
  }
  return true;
}

export function formatPattern(segments: PatternSegment[] | GameResult[]): string {
  const segs: PatternSegment[] =
    Array.isArray(segments) && segments.length > 0
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

export function createPatternCaseId(): string {
  return `pc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createEmptyPatternCase(index: number): PatternCase {
  return {
    id: createPatternCaseId(),
    label: `경우${index}`,
    enabled: true,
    patternSegments: [],
    patternBetSide: 'PLAYER',
  };
}

/** 기본 예시 경우들 (BB→P, PP→P, BBBB+→P→B) */
export function defaultPatternCases(): PatternCase[] {
  return [
    {
      id: 'pc_default_bb_p',
      label: '경우1',
      enabled: true,
      patternSegments: [{ side: 'B', count: 2, atLeast: false }],
      patternBetSide: 'PLAYER',
    },
    {
      id: 'pc_default_pp_p',
      label: '경우2',
      enabled: true,
      patternSegments: [{ side: 'P', count: 2, atLeast: false }],
      patternBetSide: 'PLAYER',
    },
    {
      id: 'pc_default_bbbb_p_b',
      label: '경우3',
      enabled: true,
      patternSegments: [
        { side: 'B', count: 4, atLeast: true },
        { side: 'P', count: 1, atLeast: false },
      ],
      patternBetSide: 'BANKER',
    },
  ];
}

function sanitizeCase(raw: Partial<PatternCase> | null | undefined, index: number): PatternCase {
  const segments = normalizePatternSegments({
    patternSegments: raw?.patternSegments,
  });
  const side = raw?.patternBetSide;
  return {
    id: typeof raw?.id === 'string' && raw.id ? raw.id : createPatternCaseId(),
    label:
      typeof raw?.label === 'string' && raw.label.trim()
        ? raw.label.trim().slice(0, 24)
        : `경우${index}`,
    enabled: raw?.enabled !== false,
    patternSegments: segments,
    patternBetSide:
      side === 'BANKER' || side === 'TIE' || side === 'PLAYER' ? side : 'PLAYER',
  };
}

/**
 * patternCases 정규화 + 구버전(patternSegments) 마이그레이션.
 * 반환의 patternSegments/patternBetSide 는 첫 활성(또는 첫) 경우와 동기화.
 */
export function normalizePatternCases(
  config: Partial<SessionConfig> | null | undefined,
): {
  patternCases: PatternCase[];
  patternSegments: PatternSegment[];
  patternBetSide: 'PLAYER' | 'BANKER' | 'TIE';
} {
  const rawCases = Array.isArray(config?.patternCases) ? config!.patternCases : null;

  let patternCases: PatternCase[];
  if (rawCases && rawCases.length > 0) {
    patternCases = rawCases.map((c, i) => sanitizeCase(c, i + 1));
  } else {
    const legacy = normalizePatternSegments({
      patternSegments: config?.patternSegments,
      patternSequence: config?.patternSequence,
    });
    if (legacy.length > 0) {
      patternCases = [
        sanitizeCase(
          {
            id: 'pc_migrated',
            label: '경우1',
            enabled: true,
            patternSegments: legacy,
            patternBetSide: config?.patternBetSide || 'PLAYER',
          },
          1,
        ),
      ];
    } else if (rawCases && rawCases.length === 0) {
      patternCases = [];
    } else {
      patternCases = defaultPatternCases();
    }
  }

  const primary =
    patternCases.find((c) => c.enabled && c.patternSegments.length > 0) ||
    patternCases[0] ||
    null;

  return {
    patternCases,
    patternSegments: primary?.patternSegments || [],
    patternBetSide: primary?.patternBetSide || 'PLAYER',
  };
}

/** 켜진 경우 중 패턴이 2게임 이상인 것이 하나라도 있으면 OK */
export function patternCasesReady(cases: PatternCase[]): boolean {
  return cases.some((c) => c.enabled && patternTotalGames(c.patternSegments) >= 2);
}

/** 히스토리에 맞는 첫 번째 활성 경우 (우선순위 = 목록 순서) */
export function findMatchingPatternCase(
  recentResults: GameResult[],
  cases: PatternCase[],
): PatternCase | null {
  for (const c of cases) {
    if (!c.enabled) continue;
    if (patternTotalGames(c.patternSegments) < 1) continue;
    if (matchesPattern(recentResults, c.patternSegments)) return c;
  }
  return null;
}

export function formatPatternCaseSummary(c: PatternCase): string {
  return `${c.label}: ${formatPattern(c.patternSegments)} → ${patternSideLabel(c.patternBetSide)}`;
}

export function formatAllPatternCases(cases: PatternCase[]): string {
  const active = cases.filter((c) => c.enabled && c.patternSegments.length > 0);
  if (!active.length) return '(없음)';
  return active.map((c) => formatPatternCaseSummary(c)).join(' · ');
}
