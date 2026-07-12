const fs = require('fs');
let code = fs.readFileSync('src/components/RightPanel.tsx', 'utf8');

code = `import { getResultColor, getResultLabel } from '../utils/colors';\n` + code;

code = code.replace(/function ResultDot\(\{ result, isLast \}\: \{ key\?\: React\.Key, result\: GameResult, isLast\: boolean \}\) \{[\s\S]*?return \(/m, 
`function ResultDot({ result, isLast }: { key?: React.Key, result: GameResult, isLast: boolean }) {
  const bgColor = getResultColor(result, 'bg');
  const label = getResultLabel(result);

  return (`);

code = code.replace(/\{result === 'T' \? 'T' \: result === 'P' \? 'P' \: 'B'\}/g, `{label}`);

fs.writeFileSync('src/components/RightPanel.tsx', code);
