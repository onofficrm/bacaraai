import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import type { GameResult } from '../types';
import {
  ROAD_ROWS,
  buildBeadPlate,
  buildBigRoadGrid,
  buildDerivedGrid,
  countStats,
  predictNextDerived,
  type BigRoadCell,
  type DerivedCell,
  type RoadColor,
} from '../utils/baccaratRoads';

interface BaccaratScoreboardProps {
  results: GameResult[];
}

const TRAILING_EMPTY = 3;
const DRAG_THRESHOLD_PX = 4;

function useDragScroll(depsKey: string) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startScroll: number;
    moved: boolean;
  } | null>(null);
  const didDragRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const toEnd = () => {
      el.scrollLeft = el.scrollWidth;
    };
    toEnd();
    const raf = requestAnimationFrame(toEnd);
    return () => cancelAnimationFrame(raf);
  }, [depsKey]);

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
    if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
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

  return {
    scrollRef,
    dragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onClickCapture,
    },
  };
}

function PadGrid<T>({
  columns,
  trailing = TRAILING_EMPTY,
  minCols,
  rows = ROAD_ROWS,
  cellSize,
  gap = 1,
  renderCell,
}: {
  columns: Array<Array<T | null | undefined>>;
  trailing?: number;
  minCols: number;
  rows?: number;
  cellSize: number;
  gap?: number;
  renderCell: (cell: T | null | undefined, col: number, row: number) => ReactNode;
}) {
  const totalCols = Math.max(minCols, columns.length + trailing);
  const leftPad = Math.max(0, totalCols - columns.length - trailing);
  const width = totalCols * cellSize + (totalCols - 1) * gap;

  return (
    <div
      className="grid bg-zinc-300"
      style={{
        width,
        gap,
        gridTemplateColumns: `repeat(${totalCols}, ${cellSize}px)`,
      }}
    >
      {Array.from({ length: totalCols }).map((_, colIdx) => {
        const dataCol = colIdx - leftPad;
        const col =
          dataCol >= 0 && dataCol < columns.length ? columns[dataCol] : null;
        return (
          <div
            key={colIdx}
            className="grid"
            style={{ gap, gridTemplateRows: `repeat(${rows}, ${cellSize}px)` }}
          >
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <div
                key={rowIdx}
                className="bg-[#f7f7f5] flex items-center justify-center relative"
                style={{ width: cellSize, height: cellSize }}
              >
                {renderCell(col?.[rowIdx], colIdx, rowIdx)}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function derivedTone(color: RoadColor, kind: 'fill' | 'stroke' | 'text') {
  if (color === 'R') {
    return kind === 'fill'
      ? 'bg-red-500'
      : kind === 'stroke'
        ? 'border-red-500 text-red-500'
        : 'text-red-500';
  }
  return kind === 'fill'
    ? 'bg-blue-600'
    : kind === 'stroke'
      ? 'border-blue-600 text-blue-600'
      : 'text-blue-600';
}

function BeadMark({ cell }: { cell: { result: GameResult; isNewest?: boolean } }) {
  const letter = cell.result;
  const fill =
    letter === 'P' ? 'bg-blue-600' : letter === 'B' ? 'bg-red-500' : 'bg-emerald-500';
  return (
    <div
      className={`w-[78%] h-[78%] rounded-full ${fill} flex items-center justify-center text-white text-[10px] font-black ${
        cell.isNewest ? 'ring-2 ring-zinc-400 ring-offset-1' : ''
      }`}
    >
      {letter}
    </div>
  );
}

function BigMark({ cell }: { cell: BigRoadCell }) {
  const stroke = cell.result === 'P' ? 'text-blue-600' : 'text-red-500';
  return (
    <div
      className={`relative w-[78%] h-[78%] ${stroke} ${cell.isNewest ? 'animate-pulse' : ''}`}
    >
      <svg viewBox="0 0 32 32" className="w-full h-full block" aria-hidden>
        <circle
          cx="16"
          cy="16"
          r="11"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
        />
        {cell.ties > 0 && (
          <line
            x1="8"
            y1="24"
            x2="24"
            y2="8"
            stroke="#059669"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        )}
      </svg>
      {cell.ties > 1 && (
        <span className="absolute -top-0.5 -right-0.5 text-[8px] font-black text-emerald-600 leading-none">
          {cell.ties}
        </span>
      )}
    </div>
  );
}

function DerivedMark({
  cell,
  variant,
}: {
  cell: DerivedCell;
  variant: 'eye' | 'small' | 'cockroach';
}) {
  const tone = derivedTone(cell.color, variant === 'small' ? 'fill' : 'stroke');
  if (variant === 'cockroach') {
    return (
      <div className={`w-[70%] h-[70%] flex items-center justify-center ${derivedTone(cell.color, 'text')}`}>
        <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden>
          <line
            x1="5"
            y1="19"
            x2="19"
            y2="5"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }
  if (variant === 'small') {
    return <div className={`w-[55%] h-[55%] rounded-full ${tone}`} />;
  }
  // eye — hollow
  return (
    <div
      className={`w-[62%] h-[62%] rounded-full border-[2px] bg-transparent ${tone}`}
    />
  );
}

function AskIcon({ color, variant }: { color: RoadColor | null; variant: 'eye' | 'small' | 'cockroach' }) {
  if (!color) {
    return <span className="w-3.5 h-3.5 inline-block opacity-20">·</span>;
  }
  return <DerivedMark cell={{ color }} variant={variant} />;
}

export default function BaccaratScoreboard({ results }: BaccaratScoreboardProps) {
  const signature = `${results.length}:${results[results.length - 1] ?? ''}`;

  const beads = useMemo(() => buildBeadPlate(results), [results]);
  const bigGrid = useMemo(() => buildBigRoadGrid(results), [results]);
  const eyeGrid = useMemo(() => buildDerivedGrid(results, 1), [results]);
  const smallGrid = useMemo(() => buildDerivedGrid(results, 2), [results]);
  const cockGrid = useMemo(() => buildDerivedGrid(results, 3), [results]);
  const stats = useMemo(() => countStats(results), [results]);
  const askB = useMemo(() => predictNextDerived(results, 'B'), [results]);
  const askP = useMemo(() => predictNextDerived(results, 'P'), [results]);

  const beadScroll = useDragScroll(`bead:${signature}`);
  const mainScroll = useDragScroll(`main:${signature}`);

  return (
    <div className="rounded-xl border border-zinc-700 overflow-hidden bg-[#ecece8] select-none">
      <div className="flex flex-col lg:flex-row min-h-[280px]">
        {/* Bead plate */}
        <div
          ref={beadScroll.scrollRef}
          {...beadScroll.handlers}
          className={`shrink-0 border-b lg:border-b-0 lg:border-r border-zinc-400 overflow-x-auto custom-scrollbar ${
            beadScroll.dragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{ touchAction: 'pan-x', maxWidth: '100%', width: 'min(100%, 168px)' }}
          title="드래그하여 좌우로 이동"
        >
          <div className="p-1.5">
            <PadGrid
              columns={beads}
              minCols={4}
              cellSize={24}
              renderCell={(cell) => (cell ? <BeadMark cell={cell} /> : null)}
            />
          </div>
        </div>

        {/* Big + derived */}
        <div
          ref={mainScroll.scrollRef}
          {...mainScroll.handlers}
          className={`flex-1 min-w-0 overflow-x-auto custom-scrollbar ${
            mainScroll.dragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{ touchAction: 'pan-x' }}
          title="드래그하여 좌우로 이동"
        >
          <div className="p-1.5 flex flex-col gap-1.5 min-w-max">
            <PadGrid
              columns={bigGrid}
              minCols={16}
              cellSize={22}
              renderCell={(cell) =>
                cell ? <BigMark cell={cell as BigRoadCell} /> : null
              }
            />
            <div className="flex gap-1.5">
              <PadGrid
                columns={eyeGrid}
                minCols={10}
                cellSize={14}
                trailing={2}
                renderCell={(cell) =>
                  cell ? (
                    <DerivedMark cell={cell as DerivedCell} variant="eye" />
                  ) : null
                }
              />
            </div>
            <div className="flex gap-1.5">
              <PadGrid
                columns={smallGrid}
                minCols={8}
                cellSize={14}
                trailing={2}
                renderCell={(cell) =>
                  cell ? (
                    <DerivedMark cell={cell as DerivedCell} variant="small" />
                  ) : null
                }
              />
              <PadGrid
                columns={cockGrid}
                minCols={8}
                cellSize={14}
                trailing={2}
                renderCell={(cell) =>
                  cell ? (
                    <DerivedMark cell={cell as DerivedCell} variant="cockroach" />
                  ) : null
                }
              />
            </div>
          </div>
        </div>

        {/* Stats + ask */}
        <div className="shrink-0 w-full lg:w-[118px] border-t lg:border-t-0 lg:border-l border-zinc-400 bg-[#f3f3ef] flex flex-row lg:flex-col">
          <div className="flex-1 p-2.5 space-y-1.5 text-sm font-bold font-mono">
            <div className="flex justify-between text-red-500">
              <span>B</span>
              <span>{stats.banker}</span>
            </div>
            <div className="flex justify-between text-blue-600">
              <span>P</span>
              <span>{stats.player}</span>
            </div>
            <div className="flex justify-between text-emerald-600">
              <span>T</span>
              <span>{stats.tie}</span>
            </div>
            <div className="flex justify-between text-zinc-700 pt-1 border-t border-zinc-300">
              <span>R</span>
              <span>{stats.total}</span>
            </div>
          </div>

          <div className="w-[112px] lg:w-full border-l lg:border-l-0 lg:border-t border-zinc-400 flex flex-col">
            <div className="flex-1 flex items-center gap-1.5 px-2 py-2 border-b border-zinc-400 bg-white/50">
              <div className="w-7 h-7 rounded-full bg-red-500 text-white text-xs font-black flex items-center justify-center shrink-0">
                B
              </div>
              <div className="flex items-center gap-1 min-w-0">
                <span className="w-3.5 h-3.5 flex items-center justify-center">
                  <AskIcon color={askB.bigEye} variant="eye" />
                </span>
                <span className="w-3.5 h-3.5 flex items-center justify-center">
                  <AskIcon color={askB.small} variant="small" />
                </span>
                <span className="w-3.5 h-3.5 flex items-center justify-center">
                  <AskIcon color={askB.cockroach} variant="cockroach" />
                </span>
              </div>
            </div>
            <div className="flex-1 flex items-center gap-1.5 px-2 py-2 bg-white/50">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                P
              </div>
              <div className="flex items-center gap-1 min-w-0">
                <span className="w-3.5 h-3.5 flex items-center justify-center">
                  <AskIcon color={askP.bigEye} variant="eye" />
                </span>
                <span className="w-3.5 h-3.5 flex items-center justify-center">
                  <AskIcon color={askP.small} variant="small" />
                </span>
                <span className="w-3.5 h-3.5 flex items-center justify-center">
                  <AskIcon color={askP.cockroach} variant="cockroach" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
