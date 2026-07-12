const fs = require('fs');
let code = fs.readFileSync('src/components/TableCard.tsx', 'utf8');

const replacement = `        <div className="bg-zinc-950 rounded border border-zinc-800/80 p-2 flex justify-between items-center mt-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-zinc-500">최종 참고 의견</span>
            <span className={\`text-sm font-bold \${getOpinionColor(table.ai.finalOpinion)}\`}>
              {getOpinionText(table.ai.finalOpinion)}
            </span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[10px] text-zinc-500 flex items-center gap-1">
              {!['WAIT', 'SKIP', 'PAUSE', 'STOP', 'ERROR', 'DATA_ERROR'].includes(table.ai.finalOpinion) && (
                <span className="text-blue-400 hover:text-blue-300 cursor-pointer" title="과거 데이터 근거 (적중률 62.8%)">데이터 근거</span>
              )}
              참고 금액
            </span>
            <span className="text-sm font-mono font-bold text-zinc-200">
              {['WAIT', 'SKIP', 'PAUSE', 'STOP', 'ERROR', 'DATA_ERROR'].includes(table.ai.finalOpinion) ? '-' : table.ai.recommendedAmount.toLocaleString() + '원'}
            </span>
          </div>
        </div>`;

code = code.replace(/<div className="bg-zinc-950 rounded border border-zinc-800\/80 p-2 flex justify-between items-center mt-1">[\s\S]*?<\/div>\s*<\/div>/, replacement + '\n      </div>');

fs.writeFileSync('src/components/TableCard.tsx', code);
