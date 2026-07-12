const fs = require('fs');
let code = fs.readFileSync('src/components/RightPanel.tsx', 'utf8');
code = code.replace(/import {([^}]+)} from 'lucide-react';/, "import { Activity, $1 } from 'lucide-react';");
fs.writeFileSync('src/components/RightPanel.tsx', code);
