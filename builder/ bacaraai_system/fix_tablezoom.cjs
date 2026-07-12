const fs = require('fs');
let code = fs.readFileSync('src/components/TableZoomModal.tsx', 'utf8');

if (!code.includes('import { getResultColor')) {
  code = `import { getResultColor, getResultLabel } from '../utils/colors';\n` + code;
}

code = code.replace(/\{table\.stats\.recentResults\.map\(\(res, i\) => \{[\s\S]*?return \(/m, 
`{table.stats.recentResults.map((res, i) => {
                     const bgClass = getResultColor(res, 'bg');
                     const textClass = getResultColor(res, 'text');
                     const borderClass = getResultColor(res, 'border');
                     const bgColor = \`\${bgClass.replace('bg-', 'bg-opacity-20 bg-')} \${textClass} \${borderClass}\`;
                     return (`);

code = code.replace(/<span key=\{i\} className=\{\`w-8 h-8 flex items-center justify-center rounded border font-bold text-sm \$\{bgColor\}\`\}>\s*\{res\}\s*<\/span>/,
`<span key={i} className={\`w-8 h-8 flex items-center justify-center rounded border font-bold text-sm \${bgColor}\`}>
                         {getResultLabel(res)}
                       </span>`);

fs.writeFileSync('src/components/TableZoomModal.tsx', code);
