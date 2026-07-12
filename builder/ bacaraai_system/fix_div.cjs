const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// I'll just change the end of the file.
code = code.replace(/    <\/div>\n  \);\n\}/, '      </div>\n    </div>\n  );\n}');
fs.writeFileSync('src/components/Dashboard.tsx', code);
