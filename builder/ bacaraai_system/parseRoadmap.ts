type GameResult = 'P' | 'B' | 'T';

interface BigRoadCell {
  result: 'P' | 'B' | 'T';
  ties: number;
  isNewest: boolean;
}

function processBigRoad(data: GameResult[][]): BigRoadCell[][] {
  // 1. Flatten
  const flat: { res: GameResult, isNewest: boolean }[] = [];
  for (let i = 0; i < data.length; i++) {
    for (let j = 0; j < data[i].length; j++) {
      flat.push({
        res: data[i][j],
        isNewest: i === data.length - 1 && j === data[i].length - 1
      });
    }
  }

  // 2. Build Columns
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
        // Switch column
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
    // only ties
    columns.push([{ result: 'T', ties: pendingTies, isNewest: pendingNewest }]);
  }
  
  return columns;
}

const res = processBigRoad([['P', 'P'], ['T', 'B'], ['B']]);
console.log(JSON.stringify(res, null, 2));
