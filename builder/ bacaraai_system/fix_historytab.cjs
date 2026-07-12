const fs = require('fs');
let code = fs.readFileSync('src/components/HistoryTab.tsx', 'utf8');

if (!code.includes('import { getResultColor')) {
  code = `import { getResultColor, getResultLabel } from '../utils/colors';\n` + code;
}

code = code.replace(/<span className=\{\`inline-flex items-center justify-center w-5 h-5 rounded font-bold text-\[10px\] text-white \$\{entry\.actualResult === 'P' \? 'bg-blue-500' \: entry\.actualResult === 'B' \? 'bg-red-500' \: entry\.actualResult === 'T' \? 'bg-emerald-500' \: 'bg-zinc-700'\}\`\}>\s*\{entry\.actualResult === 'NONE' \? '-' \: entry\.actualResult\}\s*<\/span>/, 
`<span className={\`inline-flex items-center justify-center w-5 h-5 rounded font-bold text-[10px] text-white \${getResultColor(entry.actualResult, 'bg')}\`}>
                    {entry.actualResult === 'NONE' ? '-' : getResultLabel(entry.actualResult)}
                  </span>`);

code = code.replace(/function OpinionDot\(\{ opinion \}\: \{ opinion\: string \}\) \{[\s\S]*?return/m, 
`function OpinionDot({ opinion }: { opinion: string }) {
  const color = getResultColor(opinion, 'bg');
  return`);

fs.writeFileSync('src/components/HistoryTab.tsx', code);
