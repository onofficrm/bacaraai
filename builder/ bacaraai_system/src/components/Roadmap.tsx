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
import { buildBeadPlate, ROAD_ROWS } from '../utils/baccaratRoads';

interface RoadmapProps {
  data: GameResult[][];
  /** DB에서 온 결과 배열 — 통계·칸 수의 단일 소스 */
  results?: GameResult[];
  size?: 'sm' | 'md' | 'lg';
}

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
  return `${results.length}:${results.join('')}`;
}

const SIZE = {
  sm: { cell: 22, minCols: 8 },
  md: { cell: 26, minCols: 10 },
  lg: { cell: 32, minCols: 12 },
} as const;

/** 라이브 테이블용 — 결과 1건 = 칸 1개 (빅로드 합침 없음) */
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

  const flatResults = useMemo((): GameResult[] => {
    if (results && results.length > 0) {
      return results.map((r) => {
        const u = String(r).trim().toUpperCase();
        return u === 'P' || u === 'B' || u === 'T' ? u : 'T';
      });
    }
    return flattenRoadmap(data || []);
  }, [results, data]);

  const counts = useMemo(() => {
    let p = 0;
    let b = 0;
    let t = 0;
    for (const r of flatResults) {
      if (r === 'P') p += 1;
      else if (r === 'B') b += 1;
      else t += 1;
    }
    return { p, b, t, n: flatResults.length };
  }, [flatResults]);

  const dataSignature = resultsSignature(flatResults);
  const { cell, minCols } = SIZE[size];
  const rows = ROAD_ROWS;

  const columns = useMemo(() => buildBeadPlate(flatResults, rows), [flatResults, rows]);

  const displayCols = useMemo(() => {
    const pad = Math.max(0, minCols - columns.length);
    const leftPad = Array.from({ length: pad }, () =>
      Array.from({ length: rows }, () => null as (typeof columns)[0][0] | null),
    );
    const normalized = columns.map((col) => {
      const next: Array<(typeof col)[0] | null> = [...col];
      while (next.length < rows) next.push(null);
      return next.slice(0, rows);
    });
    return [...leftPad, ...normalized];
  }, [columns, minCols, rows]);

  const totalCols = displayCols.length;
  const gridWidth = totalCols * cell + Math.max(0, totalCols - 1);
  const leftPadCount = Math.max(0, minCols - columns.length);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollToLatest = () => {
      const dataEndCol = leftPadCount + columns.length;
      const target = dataEndCol * (cell + 1) - el.clientWidth + cell * 2;
      el.scrollLeft = Math.max(0, target);
    };
    scrollToLatest();
    const raf = window.requestAnimationFrame(scrollToLatest);
    return () => window.cancelAnimationFrame(raf);
  }, [dataSignature, size, leftPadCount, columns.length, cell]);

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
    <div className="min-w-0 w-full overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <div
        ref={scrollRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        aria-label={`게임 결과 ${counts.n}회 Player ${counts.p} Banker ${counts.b} Tie ${counts.t}`}
        className={`roadmap-x-scroll p-2 sm:p-2.5 touch-pan-x select-none ${
          dragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{ touchAction: 'pan-x' }}
      >
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
                      {cellData ? <BeadMark result={cellData.result} newest={!!cellData.isNewest} /> : null}
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

function BeadMark({ result, newest }: { result: GameResult; newest: boolean }) {
  const color =
    result === 'B' ? '#ef4444' : result === 'P' ? '#2563eb' : '#059669';
  const label = result === 'B' ? 'B' : result === 'P' ? 'P' : 'T';

  return (
    <div
      className="relative flex items-center justify-center rounded-full border-[2.5px] font-black leading-none"
      style={{
        width: '78%',
        height: '78%',
        borderColor: color,
        color,
        boxShadow: newest ? '0 0 0 1.5px rgba(161,161,170,0.55)' : undefined,
        fontSize: result === 'T' ? '9px' : '10px',
      }}
      aria-label={label}
    >
      {label}
    </div>
  );
}
