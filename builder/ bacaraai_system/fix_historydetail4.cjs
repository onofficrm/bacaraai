const fs = require('fs');
let code = fs.readFileSync('src/components/HistoryDetailModal.tsx', 'utf8');

code = code.replace(/function getOpinionText\(opinion: AiOpinion\) \{\n  return getResultLabel\(opinion\);\n\}\n\}/, 
`function getOpinionText(opinion: AiOpinion) {
  return getResultLabel(opinion);
}`);

code = code.replace(/function getOpinionColor\(opinion: AiOpinion\) \{\n  return getResultColor\(opinion, 'text'\);\n\}\n\}/, 
`function getOpinionColor(opinion: AiOpinion) {
  return getResultColor(opinion, 'text');
}`);

fs.writeFileSync('src/components/HistoryDetailModal.tsx', code);
