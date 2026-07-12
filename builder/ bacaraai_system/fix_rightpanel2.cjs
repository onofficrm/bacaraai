const fs = require('fs');
let code = fs.readFileSync('src/components/RightPanel.tsx', 'utf8');

code = code.replace(/function getOpinionText\(opinion: AiOpinion\) \{[\s\S]*?\}/m, 
`function getOpinionText(opinion: AiOpinion) {
  return getResultLabel(opinion);
}`);

code = code.replace(/function getOpinionColor\(opinion: AiOpinion\) \{[\s\S]*?\}/m, 
`function getOpinionColor(opinion: AiOpinion) {
  return getResultColor(opinion, 'text');
}`);

fs.writeFileSync('src/components/RightPanel.tsx', code);
