const fs = require('fs');

const code = `import { getResultColor } from '../utils/colors';
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
    <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800 overflow-hidden">
      <div 
        className="grid gap-[1px] bg-zinc-800" 
        style={{ gridTemplateColumns: \`repeat(\${cols}, minmax(0, 1fr))\` }}
      >
        {Array.from({ length: cols }).map((_, colIdx) => (
          <div key={colIdx} className="grid grid-rows-6 gap-[1px]">
            {Array.from({ length: rows }).map((_, rowIdx) => {
              const cell = displayCols[colIdx]?.[rowIdx];
              return (
                <div 
                  key={\`\${colIdx}-\${rowIdx}\`} 
                  className="bg-zinc-950 aspect-square flex items-center justify-center p-0.5 relative"
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
  
  return (
    <div className={\`w-full h-full rounded-full border-[2px] \${borderColor} flex items-center justify-center relative \${cell.isNewest ? 'animate-pulse ring-2 ring-white/20' : ''}\`}>
      {cell.ties > 0 && (
        <div className="absolute w-[120%] h-[2px] bg-emerald-500 -rotate-45 z-10"></div>
      )}
      {cell.result === 'T' && (
        <div className="absolute w-[120%] h-[2px] bg-emerald-500 -rotate-45 z-10"></div>
      )}
    </div>
  );
}
`;

fs.writeFileSync('src/components/Roadmap.tsx', code);
