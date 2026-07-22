import { GameResult } from '../types';

interface RoadmapProps {
  data: GameResult[][];
  /** 줌/패널용 — 셀을 더 크게 */
  size?: 'sm' | 'md' | 'lg';
}

interface BigRoadCell {
  result: 'P' | 'B' | 'T';
  ties: number;
  isNewest: boolean;
}

function processBigRoad(data: GameResult[][]): BigRoadCell[][] {
  const flat: { res: GameResult; isNewest: boolean }[] = [];
  for (let i = 0; i < data.length; i++) {
    for (let j = 0; j < data[i].length; j++) {
      flat.push({
        res: data[i][j],
        isNewest: i === data.length - 1 && j === data[i].length - 1,
      });
    }
  }

  const columns: BigRoadCell[][] = [];
  let currentCol: BigRoadCell[] = [];
  let currentRes: 'P' | 'B' | null = null;
  let pendingTies = 0;
  let pendingNewest = false;

  for (let i = 0; i < flat.length; i++) {
    const { res, isNewest } = flat[i];

    if (res === 'T') {
      if (currentCol.length > 0) {
        currentCol[currentCol.length - 1].ties++;
        if (isNewest) currentCol[currentCol.length - 1].isNewest = true;
      } else {
        pendingTies++;
        if (isNewest) pendingNewest = true;
      }
    } else {
      if (currentRes !== null && currentRes !== res) {
        columns.push(currentCol);
        currentCol = [];
      }

      currentRes = res as 'P' | 'B';
      currentCol.push({
        result: currentRes,
        ties: pendingTies,
        isNewest: isNewest || pendingNewest,
      });
      pendingTies = 0;
      pendingNewest = false;
    }
  }

  if (currentCol.length > 0) {
    columns.push(currentCol);
  } else if (pendingTies > 0) {
    columns.push([{ result: 'T', ties: pendingTies, isNewest: pendingNewest }]);
  }

  return columns;
}

const SIZE = {
  sm: { cell: 22, stroke: 2.25, cols: 12 },
  md: { cell: 26, stroke: 2.5, cols: 12 },
  lg: { cell: 32, stroke: 2.75, cols: 16 },
} as const;

export default function Roadmap({ data, size = 'md' }: RoadmapProps) {
  const processedColumns = processBigRoad(data);
  const { cell, stroke, cols } = SIZE[size];
  const rows = 6;

  const displayCols =
    processedColumns.length > cols
      ? processedColumns.slice(processedColumns.length - cols)
      : processedColumns;

  const gridWidth = cols * cell + (cols - 1); // 1px gaps

  return (
    <div className="bg-white rounded-lg border border-zinc-200 overflow-x-auto custom-scrollbar touch-pan-x">
      {/* 좌우 여백으로 원이 테두리에 잘리지 않게 */}
      <div className="p-2 sm:p-2.5 min-w-0">
        <div
          className="grid gap-px bg-zinc-200 mx-auto"
          style={{
            width: gridWidth,
            minWidth: '100%',
            gridTemplateColumns: `repeat(${cols}, minmax(${cell}px, 1fr))`,
          }}
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div
              key={colIdx}
              className="grid gap-px"
              style={{ gridTemplateRows: `repeat(${rows}, minmax(${cell}px, ${cell}px))` }}
            >
              {Array.from({ length: rows }).map((_, rowIdx) => {
                const cellData = displayCols[colIdx]?.[rowIdx];
                return (
                  <div
                    key={`${colIdx}-${rowIdx}`}
                    className="bg-white flex items-center justify-center relative overflow-visible"
                    style={{ width: '100%', height: cell }}
                  >
                    {cellData && (
                      <ResultIndicator cell={cellData} strokeWidth={stroke} />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResultIndicator({
  cell,
  strokeWidth,
}: {
  cell: BigRoadCell;
  strokeWidth: number;
}) {
  const strokeClass =
    cell.result === 'B'
      ? 'text-red-500'
      : cell.result === 'P'
        ? 'text-blue-600'
        : 'text-emerald-500';
  const showTieCount = cell.ties > 0 || cell.result === 'T';
  const tieCount = cell.result === 'T' ? Math.max(1, cell.ties) : cell.ties;

  // SVG로 원을 그려 태블릿/Safari에서 border+rounded-full 클리핑을 피함
  return (
    <div
      className={`relative w-[82%] h-[82%] max-w-full max-h-full ${strokeClass} ${
        cell.isNewest ? 'animate-pulse' : ''
      }`}
    >
      <svg
        viewBox="0 0 32 32"
        className="w-full h-full block overflow-visible"
        aria-hidden
      >
        {cell.isNewest && (
          <circle
            cx="16"
            cy="16"
            r="14.5"
            fill="none"
            stroke="#a1a1aa"
            strokeWidth="1.25"
            opacity="0.55"
          />
        )}
        <circle
          cx="16"
          cy="16"
          r="12"
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </svg>
      {showTieCount && (
        <span
          className="absolute inset-0 flex items-center justify-center z-10 text-[9px] sm:text-[10px] font-black leading-none text-emerald-600 select-none"
          aria-label={`타이 ${tieCount}회`}
        >
          {tieCount}
        </span>
      )}
    </div>
  );
}
