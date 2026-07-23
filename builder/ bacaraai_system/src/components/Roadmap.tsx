import {
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { GameResult } from '../types';
import { useFxIntensity } from '../hooks/useFxIntensity';
import { playSfx } from '../audio/sfxEngine';

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
  const [dropKey, setDropKey] = useState(0);

  const processedColumns = processBigRoad(data);
  const { cell, stroke, minCols } = SIZE[size];
  const rows = 6;
  const dataSignature = roadmapSignature(data);

  // 최신 결과 착수 SFX (한 번만)
  useLayoutEffect(() => {
    if (prevSigRef.current === null) {
      prevSigRef.current = dataSignature;
      return;
    }
    if (prevSigRef.current !== dataSignature) {
      prevSigRef.current = dataSignature;
      setDropKey((k) => k + 1);
      if (!reduced) playSfx('tick', { throttleMs: 400 });
    }
  }, [dataSignature, reduced]);

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
                      <ResultIndicator
                        cell={cellData}
                        strokeWidth={stroke}
                        animateDrop={cellData.isNewest && dropKey > 0 && !reduced}
                        dropKey={dropKey}
                        streakLen={
                          cellData.isNewest
                            ? col.filter((c) => c.result === cellData.result).length
                            : 0
                        }
                      />
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
  animateDrop,
  dropKey,
  streakLen,
}: {
  cell: BigRoadCell;
  strokeWidth: number;
  animateDrop?: boolean;
  dropKey?: number;
  streakLen?: number;
}) {
  const strokeClass =
    cell.result === 'B'
      ? 'text-red-500'
      : cell.result === 'P'
        ? 'text-blue-600'
        : 'text-emerald-500';
  const showTieCount = cell.ties > 0 || cell.result === 'T';
  const tieCount = cell.result === 'T' ? Math.max(1, cell.ties) : cell.ties;
  const streakBreak = Boolean(animateDrop && streakLen === 1 && cell.result !== 'T');
  const tieSlash = Boolean(animateDrop && (cell.result === 'T' || cell.ties > 0));

  // SVG로 원을 그려 태블릿/Safari에서 border+rounded-full 클리핑을 피함
  return (
    <div
      key={animateDrop ? `drop-${dropKey}` : undefined}
      className={`relative w-[82%] h-[82%] max-w-full max-h-full ${strokeClass} ${
        cell.isNewest && !animateDrop ? 'animate-pulse' : ''
      } ${animateDrop ? 'roadmap-drop' : ''} ${streakBreak ? 'roadmap-crack' : ''}`}
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
        {tieSlash && (
          <line
            className="roadmap-tie-slash"
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
      <style>{`
        .roadmap-drop {
          animation: roadmapDrop 0.42s cubic-bezier(0.22, 1.2, 0.36, 1) both;
        }
        @keyframes roadmapDrop {
          from { transform: translateY(-10px) scale(0.7); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        .roadmap-crack {
          animation: roadmapCrack 0.45s ease-out both;
        }
        @keyframes roadmapCrack {
          0% { transform: translateX(0); }
          25% { transform: translateX(-2px) rotate(-3deg); }
          50% { transform: translateX(2px) rotate(3deg); }
          100% { transform: translateX(0); }
        }
        .roadmap-tie-slash {
          stroke-dasharray: 24;
          stroke-dashoffset: 24;
          animation: tieSlash 0.35s ease-out forwards;
        }
        @keyframes tieSlash {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
