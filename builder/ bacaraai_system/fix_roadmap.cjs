const fs = require('fs');
let code = fs.readFileSync('src/components/Roadmap.tsx', 'utf8');

code = `import { getResultColor } from '../utils/colors';\n` + code;

code = code.replace(/function ResultIndicator.*?{([\s\S]*?)return/m, `function ResultIndicator({ result, isNewest }: { result: GameResult, isNewest: boolean }) {
  const borderColor = getResultColor(result, 'border');
  const dotColor = getResultColor(result, 'bg');
  
  return`);

code = code.replace(/\$\{bgColor\}/, '${borderColor}');

fs.writeFileSync('src/components/Roadmap.tsx', code);
