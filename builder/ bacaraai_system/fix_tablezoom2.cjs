const fs = require('fs');
let code = fs.readFileSync('src/components/TableZoomModal.tsx', 'utf8');

code = code.replace(/function AiStatusRow\(\{ name, opinion, conf \}\: \{ name\: string, opinion\: string, conf\: number \}\) \{[\s\S]*?return \(/m, 
`function AiStatusRow({ name, opinion, conf }: { name: string, opinion: string, conf: number }) {
  const color = getResultColor(opinion, 'text');
  const text = getResultLabel(opinion);

  return (`);

fs.writeFileSync('src/components/TableZoomModal.tsx', code);
