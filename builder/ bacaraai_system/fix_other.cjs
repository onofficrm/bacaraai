const fs = require('fs');

// 1. Fix RulesTab.tsx
let codeRules = fs.readFileSync('src/components/RulesTab.tsx', 'utf8');
if (!codeRules.includes('import { getResultColor')) {
  codeRules = `import { getResultColor, getResultLabel } from '../utils/colors';\n` + codeRules;
}
codeRules = codeRules.replace(/rule\.targetSide === 'PLAYER' \? 'bg-blue-950\/40 text-blue-400 border-blue-900\/50' \: 'bg-red-950\/40 text-red-400 border-red-900\/50'/g, 
  `\`\${getResultColor(rule.targetSide, 'bg').replace('bg-', 'bg-opacity-20 bg-')} \${getResultColor(rule.targetSide, 'text')} \${getResultColor(rule.targetSide, 'border')}\``);

// Also replace the static 'P' / 'B'
codeRules = codeRules.replace(/\{rule\.targetSide === 'PLAYER' \? 'P' : 'B'\}/g, '{getResultLabel(rule.targetSide)}');

fs.writeFileSync('src/components/RulesTab.tsx', codeRules);

// 2. Fix HistoryTab.tsx
let codeHistory = fs.readFileSync('src/components/HistoryTab.tsx', 'utf8');
codeHistory = codeHistory.replace(/entry\.userSelection === 'PLAYER' \? 'text-blue-400' \: entry\.userSelection === 'BANKER' \? 'text-red-400' \: 'text-zinc-500'/g, 
  `getResultColor(entry.userSelection, 'text')`);

fs.writeFileSync('src/components/HistoryTab.tsx', codeHistory);

