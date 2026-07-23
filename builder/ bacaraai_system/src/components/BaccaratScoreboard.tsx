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

const BOARD = {
  cell: '#fbfaf6',
  line: '#d8d4cb',
  panel: '#f3f0ea',
  ink: '#1c1917',
};

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
      className="grid rounded-[2px] overflow-hidden"
      style={{
        width,
        gap,
        backgroundColor: BOARD.line,
        gridTemplateColumns: `repeat(${totalCols}, ${cellSize}px)`,
        boxShadow: 'inset 0 0 0 1px rgba(28,25,23,0.06)',
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
                className="flex items-center justify-center relative"
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: BOARD.cell,
                }}
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

function derivedTone(color: RoadColor) {
  return color === 'R'
    ? { fill: '#e11d48', stroke: '#e11d48' }
    : { fill: '#2563eb', stroke: '#2563eb' };
}

function BeadMark({ cell }: { cell: { result: GameResult; isNewest?: boolean } }) {
  const letter = cell.result;
  const fill =
    letter === 'P' ? '#2563eb' : letter === 'B' ? '#e11d48' : '#059669';
  return (
    <div
      className="w-[82%] h-[82%] rounded-full flex items-center justify-center text-white text-[11px] font-bold tracking-tight"
      style={{
        background: `radial-gradient(circle at 30% 28%, rgba(255,255,255,0.35), transparent 45%), ${fill}`,
        boxShadow: cell.isNewest
          ? `0 0 0 2px ${BOARD.cell}, 0 0 0 3.5px ${fill}`
          : '0 1px 2px rgba(0,0,0,0.18)',
      }}
    >
      {letter}
    </div>
  );
}

function BigMark({ cell }: { cell: BigRoadCell }) {
  const stroke = cell.result === 'P' ? '#2563eb' : '#e11d48';
  return (
    <div
      className="relative w-[84%] h-[84%]"
      style={{
        filter: cell.isNewest ? 'drop-shadow(0 0 2px rgba(28,25,23,0.25))' : undefined,
      }}
    >
      <svg viewBox="0 0 32 32" className="w-full h-full block" aria-hidden>
        <circle
          cx="16"
          cy="16"
          r="11.2"
          fill="none"
          stroke={stroke}
          strokeWidth="2.6"
        />
        {cell.ties > 0 && (
          <line
            x1="8"
            y1="24"
            x2="24"
            y2="8"
            stroke="#059669"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
        )}
      </svg>
      {cell.ties > 1 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[10px] h-[10px] px-0.5 rounded-full bg-emerald-600 text-white text-[7px] font-bold leading-[10px] text-center">
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
  const tone = derivedTone(cell.color);
  if (variant === 'cockroach') {
    return (
      <div className="w-[72%] h-[72%] flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden>
          <line
            x1="5"
            y1="19"
            x2="19"
            y2="5"
            stroke={tone.stroke}
            strokeWidth="2.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }
  if (variant === 'small') {
    return (
      <div
        className="w-[52%] h-[52%] rounded-full"
        style={{
          background: tone.fill,
          boxShadow: '0 0.5px 1px rgba(0,0,0,0.2)',
        }}
      />
    );
  }
  return (
    <div
      className="w-[60%] h-[60%] rounded-full bg-transparent"
      style={{ border: `2.2px solid ${tone.stroke}` }}
    />
  );
}

function AskIcon({
  color,
  variant,
}: {
  color: RoadColor | null;
  variant: 'eye' | 'small' | 'cockroach';
}) {
  if (!color) {
    return <span className="w-4 h-4 rounded-sm bg-stone-200/80 inline-block" />;
  }
  return (
    <span className="w-4 h-4 flex items-center justify-center">
      <DerivedMark cell={{ color }} variant={variant} />
    </span>
  );
}

function RoadLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-[9px] font-semibold tracking-[0.14em] uppercase text-stone-500/90">
      {children}
    </span>
  );
}

function StatRow({
  label,
  value,
  color,
  bar,
}: {
  label: string;
  value: number;
  color: string;
  bar: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold" style={{ color }}>
          {label}
        </span>
        <span className="text-[15px] font-bold tabular-nums tracking-tight" style={{ color }}>
          {value}
        </span>
      </div>
      <div className="h-1 rounded-full bg-stone-200/90 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${Math.max(4, Math.min(100, bar))}%`,
            background: color,
            opacity: 0.85,
          }}
        />
      </div>
    </div>
  );
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

  const decisive = Math.max(1, stats.player + stats.banker);
  const beadScroll = useDragScroll(`bead:${signature}`);
  const mainScroll = useDragScroll(`main:${signature}`);

  return (
    <div
      className="rounded-2xl overflow-hidden select-none border border-stone-600/40 shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
      style={{
        background: `linear-gradient(180deg, #2a2a28 0%, #1a1a18 100%)`,
      }}
    >
      {/* Top chrome */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
          <span className="text-[11px] font-semibold text-stone-200 tracking-wide">
            실제 스코어보드
          </span>
        </div>
        <span className="text-[10px] text-stone-500">드래그로 좌우 이동</span>
      </div>

      <div
        className="m-2 rounded-xl overflow-hidden border border-stone-300/60"
        style={{ background: BOARD.panel }}
      >
        <div className="flex flex-col xl:flex-row min-h-[300px]">
          {/* Bead */}
          <div
            ref={beadScroll.scrollRef}
            {...beadScroll.handlers}
            className={`shrink-0 border-b xl:border-b-0 xl:border-r overflow-x-auto scoreboard-scroll ${
              beadScroll.dragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            style={{
              touchAction: 'pan-x',
              borderColor: BOARD.line,
              maxWidth: '100%',
              width: 'min(100%, 196px)',
              background: 'linear-gradient(180deg, #f7f4ee 0%, #efebe3 100%)',
            }}
            title="드래그하여 좌우로 이동"
          >
            <div className="px-2 pt-2 pb-1">
              <RoadLabel>Bead</RoadLabel>
            </div>
            <div className="px-2 pb-2.5">
              <PadGrid
                columns={beads}
                minCols={5}
                cellSize={28}
                renderCell={(cell) => (cell ? <BeadMark cell={cell} /> : null)}
              />
            </div>
          </div>

          {/* Roads */}
          <div
            ref={mainScroll.scrollRef}
            {...mainScroll.handlers}
            className={`flex-1 min-w-0 overflow-x-auto scoreboard-scroll ${
              mainScroll.dragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            style={{
              touchAction: 'pan-x',
              background: 'linear-gradient(180deg, #faf8f3 0%, #f3f0ea 100%)',
            }}
            title="드래그하여 좌우로 이동"
          >
            <div className="p-2.5 flex flex-col gap-2 min-w-max">
              <div className="space-y-1">
                <RoadLabel>Big Road</RoadLabel>
                <PadGrid
                  columns={bigGrid}
                  minCols={18}
                  cellSize={26}
                  renderCell={(cell) =>
                    cell ? <BigMark cell={cell as BigRoadCell} /> : null
                  }
                />
              </div>

              <div className="space-y-1 pt-0.5 border-t border-stone-300/70">
                <RoadLabel>Big Eye Boy</RoadLabel>
                <PadGrid
                  columns={eyeGrid}
                  minCols={14}
                  cellSize={16}
                  trailing={2}
                  renderCell={(cell) =>
                    cell ? <DerivedMark cell={cell as DerivedCell} variant="eye" /> : null
                  }
                />
              </div>

              <div className="flex gap-3 pt-0.5 border-t border-stone-300/70">
                <div className="space-y-1">
                  <RoadLabel>Small Road</RoadLabel>
                  <PadGrid
                    columns={smallGrid}
                    minCols={10}
                    cellSize={16}
                    trailing={2}
                    renderCell={(cell) =>
                      cell ? (
                        <DerivedMark cell={cell as DerivedCell} variant="small" />
                      ) : null
                    }
                  />
                </div>
                <div className="space-y-1">
                  <RoadLabel>Cockroach</RoadLabel>
                  <PadGrid
                    columns={cockGrid}
                    minCols={10}
                    cellSize={16}
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
          </div>

          {/* Side panel */}
          <div
            className="shrink-0 w-full xl:w-[148px] border-t xl:border-t-0 xl:border-l flex flex-row xl:flex-col"
            style={{
              borderColor: BOARD.line,
              background: 'linear-gradient(180deg, #f7f4ee 0%, #ebe6dc 100%)',
            }}
          >
            <div className="flex-1 p-3 space-y-3">
              <RoadLabel>Totals</RoadLabel>
              <StatRow
                label="Banker"
                value={stats.banker}
                color="#e11d48"
                bar={(stats.banker / decisive) * 100}
              />
              <StatRow
                label="Player"
                value={stats.player}
                color="#2563eb"
                bar={(stats.player / decisive) * 100}
              />
              <StatRow
                label="Tie"
                value={stats.tie}
                color="#059669"
                bar={stats.total ? (stats.tie / stats.total) * 100 : 0}
              />
              <div className="pt-2 border-t border-stone-300/80 flex justify-between items-baseline">
                <span className="text-[11px] font-semibold text-stone-500">Rounds</span>
                <span className="text-[15px] font-bold tabular-nums text-stone-800">
                  {stats.total}
                </span>
              </div>
            </div>

            <div
              className="w-[140px] xl:w-full border-l xl:border-l-0 xl:border-t flex flex-col"
              style={{ borderColor: BOARD.line }}
            >
              <div className="px-3 pt-2.5 pb-1">
                <RoadLabel>Next Ask</RoadLabel>
              </div>
              <AskRow side="B" ask={askB} />
              <AskRow side="P" ask={askP} last />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .scoreboard-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(120,113,108,0.45) transparent;
        }
        .scoreboard-scroll::-webkit-scrollbar {
          height: 6px;
        }
        .scoreboard-scroll::-webkit-scrollbar-thumb {
          background: rgba(120,113,108,0.4);
          border-radius: 999px;
        }
        .scoreboard-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>
    </div>
  );
}

function AskRow({
  side,
  ask,
  last = false,
}: {
  side: 'B' | 'P';
  ask: { bigEye: RoadColor | null; small: RoadColor | null; cockroach: RoadColor | null };
  last?: boolean;
}) {
  const fill = side === 'B' ? '#e11d48' : '#2563eb';
  return (
    <div
      className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 ${last ? '' : 'border-b'}`}
      style={{ borderColor: BOARD.line }}
    >
      <div
        className="w-8 h-8 rounded-full text-white text-[12px] font-bold flex items-center justify-center shrink-0"
        style={{
          background: `radial-gradient(circle at 30% 28%, rgba(255,255,255,0.35), transparent 45%), ${fill}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.22)',
        }}
      >
        {side}
      </div>
      <div className="flex items-center gap-1.5 bg-white/55 rounded-lg px-2 py-1.5 border border-stone-300/60">
        <AskIcon color={ask.bigEye} variant="eye" />
        <AskIcon color={ask.small} variant="small" />
        <AskIcon color={ask.cockroach} variant="cockroach" />
      </div>
    </div>
  );
}
