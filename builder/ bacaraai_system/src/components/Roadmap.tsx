import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { GameResult } from '../types';
import { useFxIntensity } from '../hooks/useFxIntensity';
import { playSfx } from '../audio/sfxEngine';
import {
  buildBigRoadGrid,
  ROAD_ROWS,
} from '../utils/baccaratRoads';

interface RoadmapProps {
  data: GameResult[][];
  /** 있으면 이 순서를 우선 (정확한 빅로드) */
  results?: GameResult[];
  size?: 'sm' | 'md' | 'lg';
}

type Cell = {
  result: 'P' | 'B' | 'T';
  ties: number;
  isNewest?: boolean;
};

const TRAILING_EMPTY_COLS = 3;
const DRAG_THRESHOLD_PX = 4;

function flattenRoadmap(data: GameResult[][]): GameResult[] {
  const out: GameResult[] = [];
  for (const col of data) {
    for (const cell of col) out.push(cell);
  }
  return out;
}

function resultsSignature(results: GameResult[]): string {
  if (!results.length) return '0';
  return `${results.length}:${results.slice(-8).join('')}`;
}

const SIZE = {
  sm: { cell: 22, stroke: 2.25, minCols: 12 },
  md: { cell: 26, stroke: 2.5, minCols: 12 },
  lg: { cell: 32, stroke: 2.75, minCols: 16 },
} as const;

export default function Roadmap({ data, results, size = 'md' }: RoadmapProps) {
  const { reduced } = useFxIntensity();
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startScroll: number;
    moved: boolean;
  } | null>(null);
  const didDragRef = useRef(false);
  const prevSigRef = useRef<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [dropKey, setDropKey] = useState(0);

  const flatResults = useMemo(() => {
    if (results && results.length > 0) return results;
    return flattenRoadmap(data);
  }, [results, data]);

  const dataSignature = resultsSignature(flatResults);
  const { cell, stroke, minCols } = SIZE[size];
  const rows = ROAD_ROWS;

  const visualGrid = useMemo(() => buildBigRoadGrid(flatResults), [flatResults]);

  useLayoutEffect(() => {
    if (prevSigRef.current === null) {
      prevSigRef.current = dataSignature;
      return;
    }
    if (prevSigRef.current !== dataSignature) {
      prevSigRef.current = dataSignature;
      setDropKey((k) => k + 1);
      setDropActive(true);
      if (!reduced) playSfx('tick', { throttleMs: 400 });
      const t = window.setTimeout(() => setDropActive(false), 520);
      return () => window.clearTimeout(t);
    }
  }, [dataSignature, reduced]);

  const trailingEmpty = Array.from({ length: TRAILING_EMPTY_COLS }, () =>
    Array.from({ length: rows }, () => null as Cell | null),
  );
  const withTrailing = [
    ...visualGrid.map((col) => col as Array<Cell | null>),
    ...trailingEmpty,
  ];
  const totalCols = Math.max(minCols, withTrailing.length);
  const leftPad = totalCols - withTrailing.length;
  const displayCols = [
    ...Array.from({ length: leftPad }, () =>
      Array.from({ length: rows }, () => null as Cell | null),
    ),
    ...withTrailing,
  ];

  const gridWidth = totalCols * cell + (totalCols - 1);

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
      <div className="p-2 sm:p-2.5 min-w-0">
        {flatResults.length === 0 ? (
          <div
            className="flex items-center justify-center text-[11px] text-zinc-400 bg-zinc-50 rounded border border-dashed border-zinc-200"
            style={{ height: rows * cell + (rows - 1) }}
          >
            결과 대기 중
          </div>
        ) : (
          <div
            className="grid gap-px bg-zinc-200"
            style={{
              width: gridWidth,
              minWidth: '100%',
              gridTemplateColumns: `repeat(${totalCols}, ${cell}px)`,
            }}
          >
            {displayCols.map((col, colIdx) => (
              <div
                key={colIdx}
                className="grid gap-px"
                style={{ gridTemplateRows: `repeat(${rows}, ${cell}px)` }}
              >
                {Array.from({ length: rows }).map((_, rowIdx) => {
                  const cellData = col[rowIdx];
                  const shouldDrop =
                    Boolean(cellData?.isNewest) && dropActive && !reduced;
                  return (
                    <div
                      key={`${colIdx}-${rowIdx}`}
                      className="bg-white flex items-center justify-center relative overflow-visible pointer-events-none"
                      style={{ width: cell, height: cell }}
                    >
                      {cellData && (
                        <ResultIndicator
                          cell={cellData}
                          strokeWidth={stroke}
                          animateDrop={shouldDrop}
                          dropKey={dropKey}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`
        .roadmap-drop {
          animation: roadmapReelDrop 0.48s cubic-bezier(0.18, 1.25, 0.32, 1) forwards;
          opacity: 1;
        }
        @keyframes roadmapReelDrop {
          0% { transform: translateY(-10px) scale(0.75); opacity: 0.35; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function ResultIndicator({
  cell,
  strokeWidth,
  animateDrop,
  dropKey,
}: {
  cell: Cell;
  strokeWidth: number;
  animateDrop?: boolean;
  dropKey?: number;
}) {
  const strokeClass =
    cell.result === 'B'
      ? 'text-red-500'
      : cell.result === 'P'
        ? 'text-blue-600'
        : 'text-emerald-500';
  const showTieCount = cell.ties > 0 || cell.result === 'T';
  const tieCount = cell.result === 'T' ? Math.max(1, cell.ties) : cell.ties;

  return (
    <div
      className={`relative w-[82%] h-[82%] max-w-full max-h-full ${strokeClass} ${
        cell.isNewest && !animateDrop ? 'animate-pulse' : ''
      } ${animateDrop ? 'roadmap-drop' : ''}`}
      data-drop={animateDrop ? dropKey : undefined}
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
        {animateDrop && cell.ties > 0 && (
          <line
            x1="8"
            y1="24"
            x2="24"
            y2="8"
            stroke="#059669"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        )}
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
