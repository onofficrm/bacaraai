const fs = require('fs');
let code = fs.readFileSync('src/components/DataInsightCenter.tsx', 'utf8');

if (!code.includes('import { getResultColor')) {
  code = `import { getResultColor, getResultLabel } from '../utils/colors';\n` + code;
}

// Fix res === 'P' ? 'bg-blue-500' : res === 'B' ? 'bg-red-500' : 'bg-emerald-500'
code = code.replace(/\$\{res === 'P' \? 'bg-blue-500' \: res === 'B' \? 'bg-red-500' \: 'bg-emerald-500'\}/g, 
`\${getResultColor(res, 'bg')}`);

// Fix p === 'P' ? 'bg-blue-500' : p === 'B' ? 'bg-red-500' : 'bg-emerald-500'
code = code.replace(/\$\{p === 'P' \? 'bg-blue-500' \: p === 'B' \? 'bg-red-500' \: 'bg-emerald-500'\}/g, 
`\${getResultColor(p, 'bg')}`);

// Replace 'P', 'B', 'T' hardcoded logic if any where it makes sense.

fs.writeFileSync('src/components/DataInsightCenter.tsx', code);
