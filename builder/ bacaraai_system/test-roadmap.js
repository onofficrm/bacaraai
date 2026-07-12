function buildBigRoad(results) {
  const grid = Array.from({ length: 6 }, () => Array.from({ length: 12 }, () => null));
  
  let col = 0;
  let row = 0;
  let lastResult = null;
  
  // To handle dragon tails (turning right)
  // We need to keep track of the logical column and row
  let logicalCol = 0;
  let logicalRow = 0;
  
  for (let i = 0; i < results.length; i++) {
    const res = results[i];
    const isNewest = i === results.length - 1;
    
    if (res === 'T') {
      if (lastResult === null) {
         // Tie before any P or B
         // we can just put a dummy tie or wait.
         // standard is to draw it on the first cell.
         // But let's just keep track of ties before first result.
      } else {
         // find the cell and add tie
      }
      continue;
    }
  }
}
