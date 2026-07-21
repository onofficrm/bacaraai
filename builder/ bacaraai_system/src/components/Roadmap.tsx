import { getResultColor } from '../utils/colors';
import { GameResult } from '../types';

interface RoadmapProps {
  data: GameResult[][];
}

interface BigRoadCell {
  result: 'P' | 'B' | 'T';
  ties: number;
  isNewest: boolean;
}

function processBigRoad(data: GameResult[][]): BigRoadCell[][] {
  const flat: { res: GameResult, isNewest: boolean }[] = [];
  for (let i = 0; i < data.length; i++) {
    for (let j = 0; j < data[i].length; j++) {
      flat.push({
        res: data[i][j],
        isNewest: i === data.length - 1 && j === data[i].length - 1
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
        isNewest: isNewest || pendingNewest
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

export default function Roadmap({ data }: RoadmapProps) {
  const processedColumns = processBigRoad(data);
  const rows = 6;
  const cols = 12;

  // We only show the last 12 columns if there are more
  const displayCols = processedColumns.length > cols 
    ? processedColumns.slice(processedColumns.length - cols) 
    : processedColumns;

  return (
    <div className="bg-white p-1 rounded-lg border border-zinc-200 overflow-x-auto custom-scrollbar">
      <div 
        className="grid gap-[1px] bg-zinc-200 min-w-[320px]" 
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: cols }).map((_, colIdx) => (
          <div key={colIdx} className="grid grid-rows-6 gap-[1px]">
            {Array.from({ length: rows }).map((_, rowIdx) => {
              const cell = displayCols[colIdx]?.[rowIdx];
              return (
                <div 
                  key={`${colIdx}-${rowIdx}`} 
                  className="bg-white aspect-square flex items-center justify-center p-[2px] relative"
                >
                  {cell && <ResultIndicator cell={cell} />}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultIndicator({ cell }: { cell: BigRoadCell }) {
  const borderColor = getResultColor(cell.result, 'border');
  const showTieCount = cell.ties > 0 || cell.result === 'T';
  const tieCount = cell.result === 'T' ? Math.max(1, cell.ties) : cell.ties;

  return (
    <div
      className={`w-full h-full rounded-full border-[2px] ${borderColor} flex items-center justify-center relative ${
        cell.isNewest ? 'animate-pulse ring-2 ring-zinc-400/50' : ''
      }`}
    >
      {showTieCount && (
        <span
          className="absolute inset-0 flex items-center justify-center z-10 text-[10px] sm:text-[11px] font-black leading-none text-emerald-500 select-none"
          aria-label={`타이 ${tieCount}회`}
        >
          {tieCount}
        </span>
      )}
    </div>
  );
}
