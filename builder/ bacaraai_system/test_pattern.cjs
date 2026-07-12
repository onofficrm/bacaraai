const fs = require('fs');
let code = fs.readFileSync('src/components/DataInsightCenter.tsx', 'utf8');
if (code.includes('PatternAnalysisTab')) {
  console.log('PatternAnalysisTab is in the file!');
}
