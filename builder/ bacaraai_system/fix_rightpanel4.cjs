const fs = require('fs');
let code = fs.readFileSync('src/components/RightPanel.tsx', 'utf8');

code = code.replace(/function getOpinionColor\(opinion: AiOpinion\) \{\n  return getResultColor\(opinion, 'text'\);\n\}\n\}/, 
`function getOpinionColor(opinion: AiOpinion) {
  return getResultColor(opinion, 'text');
}`);

fs.writeFileSync('src/components/RightPanel.tsx', code);
