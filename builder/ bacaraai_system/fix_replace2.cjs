const fs = require('fs');

const files = [
  'src/components/TableCard.tsx',
  'src/components/HistoryDetailModal.tsx',
  'src/components/TableZoomModal.tsx',
  'src/components/RulesTab.tsx',
];

files.forEach(file => {
  if(fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    code = code.replace(/\$\{bgClass\} \+ '\/20'/g, "${bgClass} bg-opacity-20");
    fs.writeFileSync(file, code);
  }
});
