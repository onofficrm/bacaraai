import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { GameResult } from '../types';
import { playSfx } from '../audio/sfxEngine';
import { buildBigRoadGrid, ROAD_ROWS } from '../utils/baccaratRoads';

interface RoadmapProps {
  data: GameResult[][];
  /** 있으면 이 순서를 우선 (정확한 빅로드) */
  results?: GameResult[];
  size?: 'sm' | 'md' | 'lg';
}

type Cell = {
  result: 'P' | 'B';
  ties: number;
  isNewest?: boolean;
};

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
  return `${results.length}:${results[results.length - 1]}:${results.slice(-6).join('')}`;
}

const SIZE = {
  sm: { cell: 22, stroke: 2.25, minCols: 10 },
  md: { cell: 26, stroke: 2.5, minCols: 12 },
  lg: { cell: 32, stroke: 2.75, minCols: 14 },
} as const;

export default function Roadmap({ data, results, size = 'md' }: RoadmapProps) {
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

  const flatResults = useMemo(() => {
    if (results && results.length > 0) return results;
    return flattenRoadmap(data || []);
  }, [results, data]);

  const dataSignature = resultsSignature(flatResults);
  const { cell, stroke, minCols } = SIZE[size];
  const rows = ROAD_ROWS;

  const visualGrid = useMemo(() => {
    try {
      return buildBigRoadGrid(flatResults) as Array<Array<Cell | null>>;
    } catch {
      return [] as Array<Array<Cell | null>>;
    }
  }, [flatResults]);

  // 데이터 열 + 오른쪽 여유 2열만 (빈 칸으로 스크롤이 밀리지 않게)
  const displayCols = useMemo(() => {
    const dataCols = visualGrid.length > 0 ? visualGrid : [];
    const pad = Math.max(0, minCols - dataCols.length - 2);
    const leftPad = Array.from({ length: pad }, () =>
      Array.from({ length: rows }, () => null as Cell | null),
    );
    const trail = Array.from({ length: 2 }, () =>
      Array.from({ length: rows }, () => null as Cell | null),
    );
    return [...leftPad, ...dataCols, ...trail];
  }, [visualGrid, minCols, rows]);

  const totalCols = displayCols.length;
  const gridWidth = totalCols * cell + Math.max(0, totalCols - 1);
  const leftPadCount = Math.max(0, minCols - visualGrid.length - 2);

  // 새 결과 → 최신 데이터 열이 보이도록 스크롤 (trailing 빈칸이 아니라)
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const scrollToLatest = () => {
      const dataEndCol = leftPadCount + visualGrid.length;
      const target =
        dataEndCol * (cell + 1) - el.clientWidth + cell * 3;
      el.scrollLeft = Math.max(0, target);
    };

    scrollToLatest();
    const raf = window.requestAnimationFrame(scrollToLatest);
    return () => window.cancelAnimationFrame(raf);
  }, [dataSignature, size, leftPadCount, visualGrid.length, cell]);

  useLayoutEffect(() => {
    if (prevSigRef.current === null) {
      prevSigRef.current = dataSignature;
      return;
    }
    if (prevSigRef.current !== dataSignature && flatResults.length > 0) {
      prevSigRef.current = dataSignature;
      playSfx('tick', { throttleMs: 500 });
    } else {
      prevSigRef.current = dataSignature;
    }
  }, [dataSignature, flatResults.length]);

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
      <div className="p-2 sm:p-2.5">
        {flatResults.length === 0 ? (
          <div
            className="flex items-center justify-center text-[11px] text-zinc-400 bg-zinc-50 rounded border border-dashed border-zinc-200"
            style={{ minHeight: rows * cell }}
          >
            결과 대기 중
          </div>
        ) : (
          <div
            className="grid gap-px bg-zinc-200"
            style={{
              width: gridWidth,
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
                  return (
                    <div
                      key={`${colIdx}-${rowIdx}`}
                      className="bg-white flex items-center justify-center"
                      style={{ width: cell, height: cell }}
                    >
                      {cellData ? (
                        <Bead cell={cellData} strokeWidth={stroke} />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** 단순 비드 — 애니메이션/필터 없이 항상 보이게 */
function Bead({ cell, strokeWidth }: { cell: Cell; strokeWidth: number }) {
  const color =
    cell.result === 'B' ? '#ef4444' : cell.result === 'P' ? '#2563eb' : '#059669';
  const showTie = cell.ties > 0;

  return (
    <div className="relative" style={{ width: '82%', height: '82%' }}>
      <svg viewBox="0 0 32 32" className="w-full h-full block" aria-hidden>
        {cell.isNewest && (
          <circle
            cx="16"
            cy="16"
            r="14.5"
            fill="none"
            stroke="#a1a1aa"
            strokeWidth="1.2"
            opacity="0.5"
          />
        )}
        <circle
          cx="16"
          cy="16"
          r="12"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
        />
        {showTie && (
          <line
            x1="9"
            y1="23"
            x2="23"
            y2="9"
            stroke="#059669"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        )}
      </svg>
      {showTie && (
        <span
          className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-emerald-600 leading-none"
          aria-label={`타이 ${cell.ties}회`}
        >
          {cell.ties}
        </span>
      )}
    </div>
  );
}
