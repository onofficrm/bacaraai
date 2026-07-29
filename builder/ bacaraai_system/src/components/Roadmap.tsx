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
import { buildBeadPlate, buildBigRoadGrid, ROAD_ROWS } from '../utils/baccaratRoads';

interface RoadmapProps {
  data: GameResult[][];
  /** 있으면 이 순서를 우선 (DB 결과와 1:1) */
  results?: GameResult[];
  size?: 'sm' | 'md' | 'lg';
  /**
   * bead = 한 결과당 한 칸 (DB·통계와 개수 일치) — 기본
   * big = 카지노 빅로드 (타이 합침·연속 열 — 칸 수 ≠ 회차 수)
   */
  variant?: 'bead' | 'big';
}

type BigCell = {
  result: 'P' | 'B';
  ties: number;
  isNewest?: boolean;
};

type BeadCell = {
  result: GameResult;
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
  return `${results.length}:${results[results.length - 1]}:${results.slice(-8).join('')}`;
}

const SIZE = {
  sm: { cell: 22, stroke: 2.25, minCols: 10 },
  md: { cell: 26, stroke: 2.5, minCols: 12 },
  lg: { cell: 32, stroke: 2.75, minCols: 14 },
} as const;

export default function Roadmap({
  data,
  results,
  size = 'md',
  variant = 'bead',
}: RoadmapProps) {
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
      if (variant === 'bead') {
        return buildBeadPlate(flatResults, rows) as Array<Array<BeadCell | null>>;
      }
      return buildBigRoadGrid(flatResults) as Array<Array<BigCell | null>>;
    } catch {
      return [] as Array<Array<BeadCell | BigCell | null>>;
    }
  }, [flatResults, variant, rows]);

  const displayCols = useMemo(() => {
    const dataCols = visualGrid.length > 0 ? visualGrid : [];
    const pad = Math.max(0, minCols - dataCols.length - 2);
    const leftPad = Array.from({ length: pad }, () =>
      Array.from({ length: rows }, () => null as BeadCell | BigCell | null),
    );
    const trail = Array.from({ length: 2 }, () =>
      Array.from({ length: rows }, () => null as BeadCell | BigCell | null),
    );
    // bead 열은 행 수가 6 미만일 수 있음 → 패딩
    const normalized = dataCols.map((col) => {
      const next = [...col];
      while (next.length < rows) next.push(null);
      return next.slice(0, rows);
    });
    return [...leftPad, ...normalized, ...trail];
  }, [visualGrid, minCols, rows]);

  const totalCols = displayCols.length;
  const gridWidth = totalCols * cell + Math.max(0, totalCols - 1);
  const leftPadCount = Math.max(0, minCols - visualGrid.length - 2);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const scrollToLatest = () => {
      const dataEndCol = leftPadCount + visualGrid.length;
      const target = dataEndCol * (cell + 1) - el.clientWidth + cell * 3;
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
      title={
        variant === 'bead'
          ? `결과 ${flatResults.length}회 · 드래그하여 이동`
          : '빅로드 · 드래그하여 좌우로 이동'
      }
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
                        variant === 'bead' ? (
                          <BeadPlateMark
                            cell={cellData as BeadCell}
                            strokeWidth={stroke}
                          />
                        ) : (
                          <BigRoadMark
                            cell={cellData as BigCell}
                            strokeWidth={stroke}
                          />
                        )
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

function BeadPlateMark({
  cell,
  strokeWidth,
}: {
  cell: BeadCell;
  strokeWidth: number;
}) {
  const color =
    cell.result === 'B' ? '#ef4444' : cell.result === 'P' ? '#2563eb' : '#059669';
  const isTie = cell.result === 'T';

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
        {isTie && (
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
    </div>
  );
}

function BigRoadMark({
  cell,
  strokeWidth,
}: {
  cell: BigCell;
  strokeWidth: number;
}) {
  const color = cell.result === 'B' ? '#ef4444' : '#2563eb';
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
