const fs = require('fs');
let code = fs.readFileSync('src/components/HistoryDetailModal.tsx', 'utf8');

code = code.replace(/function AiBox\(\{ name, opinion \}\: \{ name\: string, opinion\: AiOpinion \}\) \{[\s\S]*?return \(/m, 
`function AiBox({ name, opinion }: { name: string, opinion: AiOpinion }) {
  const bgClass = getResultColor(opinion, 'bg');
  const textClass = getResultColor(opinion, 'text');
  const borderClass = getResultColor(opinion, 'border');
  const label = getResultLabel(opinion);

  return (`);

code = code.replace(/<div className=\{\`px-3 py-2 rounded-lg border flex flex-col items-center gap-1 \$\{colorClass\}\`\}>/g,
`<div className={\`px-3 py-2 rounded-lg border flex flex-col items-center gap-1 \${bgClass} bg-opacity-20 \${textClass} \${borderClass}\`}>`);

code = code.replace(/<span className="text-sm font-bold">\{opinion\}<\/span>/g, `<span className="text-sm font-bold">{label}</span>`);

fs.writeFileSync('src/components/HistoryDetailModal.tsx', code);
