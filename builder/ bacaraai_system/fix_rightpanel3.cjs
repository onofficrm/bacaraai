const fs = require('fs');
let code = fs.readFileSync('src/components/RightPanel.tsx', 'utf8');

code = code.replace(/function getOpinionText\(opinion: AiOpinion\) \{\n  return getResultLabel\(opinion\);\n\}\n\}/, 
`function getOpinionText(opinion: AiOpinion) {
  return getResultLabel(opinion);
}`);

fs.writeFileSync('src/components/RightPanel.tsx', code);
