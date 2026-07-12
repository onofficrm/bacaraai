const fs = require('fs');
let code = fs.readFileSync('src/components/HistoryDetailModal.tsx', 'utf8');

if (!code.includes('import { getResultColor')) {
  code = `import { getResultColor, getResultLabel, getResultTextClass, getResultBgClass, getResultBorderClass } from '../utils/colors';\n` + code;
}

code = code.replace(/function ResultBadge\(\{ result \}\: \{ result\: GameResult \| 'NONE' \}\) \{[\s\S]*?return \(/m, 
`function ResultBadge({ result }: { result: GameResult | 'NONE' }) {
  if (result === 'NONE') return <span className="text-zinc-500">-</span>;
  const bgColor = getResultColor(result, 'bg');
  const label = getResultLabel(result);

  return (`);

code = code.replace(/<div className=\{\`w-6 h-6 rounded flex items-center justify-center font-bold text-white \$\{bgColor\}\`\}>\s*\{result\}\s*<\/div>/g, 
`<div className={\`w-6 h-6 rounded flex items-center justify-center font-bold text-white \${bgColor}\`}>
      {label}
    </div>`);

code = code.replace(/function AiOpinionDetail\(\{ model, opinion \}\: \{ model\: string, opinion\: AiOpinion \}\) \{[\s\S]*?return \(/m,
`function AiOpinionDetail({ model, opinion }: { model: string, opinion: AiOpinion }) {
  const bgClass = getResultColor(opinion, 'bg');
  const textClass = getResultColor(opinion, 'text');
  const borderClass = getResultColor(opinion, 'border');
  const label = getResultLabel(opinion);

  return (`);

code = code.replace(/<div className=\{\`px-2 py-1 rounded border flex items-center gap-1\.5 text-xs font-bold \$\{colorClass\}\`\}>/g,
`<div className={\`px-2 py-1 rounded border flex items-center gap-1.5 text-xs font-bold \${bgClass.replace('bg-', 'bg-opacity-20 bg-')} \${textClass} \${borderClass}\`}>`);

code = code.replace(/<span>\{opinion\}<\/span>/g, `<span>{label}</span>`);

fs.writeFileSync('src/components/HistoryDetailModal.tsx', code);
