const fs = require('fs');
let code = fs.readFileSync('src/components/TableCard.tsx', 'utf8');

code = `import { getResultColor, getResultTextClass, getResultBgClass, getResultLabel, getResultBorderClass } from '../utils/colors';\n` + code;

code = code.replace(/function AiBadge\(\{\s*model,\s*opinion\s*\}\:\s*\{\s*model\:\s*string,\s*opinion\:\s*AiOpinion\s*\}\)\s*\{[\s\S]*?return\s*\(/m, 
`function AiBadge({ model, opinion }: { model: string, opinion: AiOpinion }) {
  const bgClass = getResultColor(opinion, 'bg');
  const textClass = getResultColor(opinion, 'text');
  const borderClass = getResultColor(opinion, 'border');
  const label = getResultLabel(opinion);

  return (`);

code = code.replace(/<div className=\{\`px-1\.5 py-0\.5 rounded border flex items-center gap-1 \$\{colorClass\}\`\}>/g, 
`<div className={\`px-1.5 py-0.5 rounded border flex items-center gap-1 \${bgClass.replace('bg-', 'bg-opacity-20 bg-')} \${textClass} \${borderClass}\`}>`);

code = code.replace(/<span className="font-bold">\{opinion.charAt\(0\)\}<\/span>/g, 
`<span className="font-bold">{label.charAt(0)}</span>`);


code = code.replace(/function getOpinionText\(opinion: AiOpinion\) \{[\s\S]*?\}/m, 
`function getOpinionText(opinion: AiOpinion) {
  return getResultLabel(opinion);
}`);

code = code.replace(/function getOpinionColor\(opinion: AiOpinion\) \{[\s\S]*?\}/m, 
`function getOpinionColor(opinion: AiOpinion) {
  return getResultColor(opinion, 'text');
}`);

fs.writeFileSync('src/components/TableCard.tsx', code);
