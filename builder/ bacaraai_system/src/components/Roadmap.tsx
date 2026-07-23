import {
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from 'react';
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

const TRAILING_EMPTY_COLS = 3;
const DRAG_THRESHOLD_PX = 4;

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

function roadmapSignature(data: GameResult[][]): string {
  if (!data.length) return '0';
  const lastCol = data[data.length - 1] || [];
  return `${data.length}:${lastCol.join('')}:${lastCol.length}`;
}

const SIZE = {
  sm: { cell: 22, stroke: 2.25, minCols: 12 },
  md: { cell: 26, stroke: 2.5, minCols: 12 },
  lg: { cell: 32, stroke: 2.75, minCols: 16 },
} as const;

export default function Roadmap({ data, size = 'md' }: RoadmapProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startScroll: number;
    moved: boolean;
  } | null>(null);
  const didDragRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  const processedColumns = processBigRoad(data);
  const { cell, stroke, minCols } = SIZE[size];
  const rows = 6;
  const dataSignature = roadmapSignature(data);

  const trailingEmpty = Array.from({ length: TRAILING_EMPTY_COLS }, () => [] as BigRoadCell[]);
  const withTrailing = [...processedColumns, ...trailingEmpty];
  const totalCols = Math.max(minCols, withTrailing.length);
  const leftPad = totalCols - withTrailing.length;
  const displayCols = [
    ...Array.from({ length: leftPad }, () => [] as BigRoadCell[]),
    ...withTrailing,
  ];

  const gridWidth = totalCols * cell + (totalCols - 1); // 1px gaps

  // 새 결과가 들어올 때만 맨 오른쪽으로 (폴링으로 같은 데이터면 유지)
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollToEnd = () => {
      el.scrollLeft = el.scrollWidth;
    };
    scrollToEnd();
    const raf = window.requestAnimationFrame(scrollToEnd);
    return () => window.cancelAnimationFrame(raf);
  }, [dataSignature, size]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;
    didDragRef.current = false;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    };
    el.setPointerCapture(e.pointerId);
    setDragging(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = scrollRef.current;
    if (!drag || !el || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startX;
    if (!drag.moved && Math.abs(dx) >= DRAG_THRESHOLD_PX) {
      drag.moved = true;
      didDragRef.current = true;
    }
    if (!drag.moved) return;

    el.scrollLeft = drag.startScroll - dx;
    e.preventDefault();
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = scrollRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (el?.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
    setDragging(false);
  };

  const onClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    // 드래그로 스크롤한 경우 상위 카드 선택 클릭 막기
    if (didDragRef.current) {
      e.preventDefault();
      e.stopPropagation();
      didDragRef.current = false;
    }
  };

  return (
    <div
      ref={scrollRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={onClickCapture}
      className={`bg-white rounded-lg border border-zinc-200 overflow-x-auto custom-scrollbar touch-pan-x select-none ${
        dragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={{ touchAction: 'pan-x' }}
      title="드래그하여 좌우로 이동"
    >
      {/* 좌우 여백으로 원이 테두리에 잘리지 않게 */}
      <div className="p-2 sm:p-2.5 min-w-0">
        <div
          className="grid gap-px bg-zinc-200"
          style={{
            width: gridWidth,
            minWidth: '100%',
            gridTemplateColumns: `repeat(${totalCols}, minmax(${cell}px, 1fr))`,
          }}
        >
          {displayCols.map((col, colIdx) => (
            <div
              key={colIdx}
              className="grid gap-px"
              style={{ gridTemplateRows: `repeat(${rows}, minmax(${cell}px, ${cell}px))` }}
            >
              {Array.from({ length: rows }).map((_, rowIdx) => {
                const cellData = col[rowIdx];
                return (
                  <div
                    key={`${colIdx}-${rowIdx}`}
                    className="bg-white flex items-center justify-center relative overflow-visible pointer-events-none"
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
