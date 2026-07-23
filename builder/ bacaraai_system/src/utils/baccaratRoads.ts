import type { GameResult } from '../types';

/** 파생로드 색: R=빨강(동형), B=파랑(이형) */
export type RoadColor = 'R' | 'B';

export interface BigRoadCell {
  result: 'P' | 'B';
  ties: number;
  isNewest?: boolean;
}

export interface DerivedCell {
  color: RoadColor;
  isNewest?: boolean;
}

export interface BeadCell {
  result: GameResult;
  isNewest?: boolean;
}

export const ROAD_ROWS = 6;

type LogicalCell = { result: 'P' | 'B'; ties: number };

/** 비드 플레이트: 위→아래 6칸 후 다음 열 */
export function buildBeadPlate(results: GameResult[], rows = ROAD_ROWS): BeadCell[][] {
  const columns: BeadCell[][] = [];
  results.forEach((result, index) => {
    const colIdx = Math.floor(index / rows);
    if (!columns[colIdx]) columns[colIdx] = [];
    columns[colIdx].push({
      result,
      isNewest: index === results.length - 1,
    });
  });
  return columns;
}

/** 논리 빅로드 (열 = 같은 색 연속, 길이 제한 없음) */
export function buildLogicalBigRoad(results: GameResult[]): LogicalCell[][] {
  const cols: LogicalCell[][] = [];
  let pendingTies = 0;

  for (const r of results) {
    if (r === 'T') {
      if (cols.length && cols[cols.length - 1].length) {
        cols[cols.length - 1][cols[cols.length - 1].length - 1].ties += 1;
      } else {
        pendingTies += 1;
      }
      continue;
    }

    const last = cols[cols.length - 1];
    if (!last || last[0].result !== r) {
      cols.push([{ result: r, ties: pendingTies }]);
    } else {
      last.push({ result: r, ties: pendingTies });
    }
    pendingTies = 0;
  }
  return cols;
}

/** 논리 열 → 6행 그리드 (초과분은 드래곤 테일) */
export function logicalBigToVisual(logical: LogicalCell[][]): Array<Array<BigRoadCell | null>> {
  const grid: Array<Array<BigRoadCell | null>> = [];

  const ensureCol = (c: number) => {
    while (grid.length <= c) {
      grid.push(Array.from({ length: ROAD_ROWS }, () => null));
    }
  };

  logical.forEach((col, logicalColIdx) => {
    // 이 논리 열의 시각 시작 열: 첫 행이 비어 있는 가장 왼쪽
    let startCol = 0;
    while (startCol < grid.length && grid[startCol][0] != null) startCol += 1;
    ensureCol(startCol);

    col.forEach((cell, depth) => {
      if (depth < ROAD_ROWS) {
        let c = startCol;
        // 아래로 내려갈 자리가 이미 차 있으면(드물게) 우측
        if (grid[c][depth] != null) {
          c = startCol;
          while (true) {
            ensureCol(c);
            if (grid[c][depth] == null) break;
            c += 1;
          }
        }
        ensureCol(c);
        grid[c][depth] = { result: cell.result, ties: cell.ties };
      } else {
        // 드래곤: 마지막 행에서 오른쪽
        const row = ROAD_ROWS - 1;
        let c = startCol + (depth - (ROAD_ROWS - 1));
        ensureCol(c);
        while (grid[c][row] != null) {
          c += 1;
          ensureCol(c);
        }
        grid[c][row] = { result: cell.result, ties: cell.ties };
      }
    });

    void logicalColIdx;
  });

  // 최신 표시
  for (let c = grid.length - 1; c >= 0; c -= 1) {
    for (let r = ROAD_ROWS - 1; r >= 0; r -= 1) {
      if (grid[c][r]) {
        grid[c][r]!.isNewest = true;
        return grid;
      }
    }
  }
  return grid;
}

export function buildBigRoadGrid(results: GameResult[]): Array<Array<BigRoadCell | null>> {
  return logicalBigToVisual(buildLogicalBigRoad(results));
}

function derivedColor(
  logical: LogicalCell[][],
  col: number,
  row: number,
  lookback: number,
): RoadColor | null {
  if (col < lookback) return null;
  if (col === lookback && row === 0) return null;

  if (row === 0) {
    const prevLen = logical[col - 1]?.length ?? 0;
    const olderLen = logical[col - 1 - lookback]?.length ?? 0;
    return prevLen === olderLen ? 'R' : 'B';
  }

  const mirror = logical[col - lookback];
  if (!mirror) return 'B';
  return row < mirror.length ? 'R' : 'B';
}

/** 파생 색 시퀀스 수집 후 시각 그리드로 배치 */
export function buildDerivedGrid(
  results: GameResult[],
  lookback: 1 | 2 | 3,
): Array<Array<DerivedCell | null>> {
  const logical = buildLogicalBigRoad(results);
  const colors: RoadColor[] = [];

  for (let c = 0; c < logical.length; c += 1) {
    for (let r = 0; r < logical[c].length; r += 1) {
      const color = derivedColor(logical, c, r, lookback);
      if (color) colors.push(color);
    }
  }

  return packColorsToGrid(colors);
}

function packColorsToGrid(colors: RoadColor[]): Array<Array<DerivedCell | null>> {
  // 논리 열로 묶은 뒤 visual 변환
  const logical: Array<Array<{ color: RoadColor }>> = [];
  for (const color of colors) {
    const last = logical[logical.length - 1];
    if (!last || last[0].color !== color) {
      logical.push([{ color }]);
    } else {
      last.push({ color });
    }
  }

  const grid: Array<Array<DerivedCell | null>> = [];
  const ensureCol = (c: number) => {
    while (grid.length <= c) {
      grid.push(Array.from({ length: ROAD_ROWS }, () => null));
    }
  };

  logical.forEach((col) => {
    let startCol = 0;
    while (startCol < grid.length && grid[startCol][0] != null) startCol += 1;
    ensureCol(startCol);

    col.forEach((cell, depth) => {
      if (depth < ROAD_ROWS) {
        let c = startCol;
        ensureCol(c);
        if (grid[c][depth] != null) {
          while (grid[c][depth] != null) {
            c += 1;
            ensureCol(c);
          }
        }
        grid[c][depth] = { color: cell.color };
      } else {
        const row = ROAD_ROWS - 1;
        let c = startCol + (depth - (ROAD_ROWS - 1));
        ensureCol(c);
        while (grid[c][row] != null) {
          c += 1;
          ensureCol(c);
        }
        grid[c][row] = { color: cell.color };
      }
    });
  });

  for (let c = grid.length - 1; c >= 0; c -= 1) {
    for (let r = ROAD_ROWS - 1; r >= 0; r -= 1) {
      if (grid[c][r]) {
        grid[c][r]!.isNewest = true;
        return grid;
      }
    }
  }
  return grid;
}

export function predictNextDerived(results: GameResult[], side: 'P' | 'B') {
  const before = {
    eye: countFilled(buildDerivedGrid(results, 1)),
    small: countFilled(buildDerivedGrid(results, 2)),
    cock: countFilled(buildDerivedGrid(results, 3)),
  };
  const next = [...results, side];
  const afterEye = buildDerivedGrid(next, 1);
  const afterSmall = buildDerivedGrid(next, 2);
  const afterCock = buildDerivedGrid(next, 3);

  return {
    bigEye: countFilled(afterEye) > before.eye ? newestColor(afterEye) : null,
    small: countFilled(afterSmall) > before.small ? newestColor(afterSmall) : null,
    cockroach: countFilled(afterCock) > before.cock ? newestColor(afterCock) : null,
  };
}

function countFilled(grid: Array<Array<DerivedCell | null>>): number {
  let n = 0;
  for (const col of grid) for (const cell of col) if (cell) n += 1;
  return n;
}

function newestColor(grid: Array<Array<DerivedCell | null>>): RoadColor | null {
  for (let c = grid.length - 1; c >= 0; c -= 1) {
    for (let r = ROAD_ROWS - 1; r >= 0; r -= 1) {
      if (grid[c][r]?.isNewest) return grid[c][r]!.color;
    }
  }
  return null;
}

export function countStats(results: GameResult[]) {
  return {
    player: results.filter((r) => r === 'P').length,
    banker: results.filter((r) => r === 'B').length,
    tie: results.filter((r) => r === 'T').length,
    total: results.length,
  };
}
