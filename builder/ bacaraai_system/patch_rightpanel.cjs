const fs = require('fs');
let code = fs.readFileSync('src/components/RightPanel.tsx', 'utf8');

const replacement = `            <div className="flex justify-between items-center">
              <span className={\`text-2xl font-bold tracking-tight \${getOpinionColor(table.ai.finalOpinion)}\`}>
                {getOpinionText(table.ai.finalOpinion)}
              </span>
              <span className="text-xl font-mono font-bold text-white">
                {['WAIT', 'SKIP', 'PAUSE', 'STOP', 'ERROR', 'DATA_ERROR'].includes(table.ai.finalOpinion) ? '-' : table.ai.recommendedAmount.toLocaleString() + '원'}
              </span>
            </div>
            
            {!['WAIT', 'SKIP', 'PAUSE', 'STOP', 'ERROR', 'DATA_ERROR'].includes(table.ai.finalOpinion) && (
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 mt-1 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-400 flex items-center gap-1.5"><Activity size={12} className="text-amber-500" /> 유사 상황 추천 근거</span>
                  <button className="text-[10px] text-amber-500 hover:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">상세 보기</button>
                </div>
                <div className="flex justify-between items-end">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-zinc-500">과거 적중률 (유사 패턴 4,218건)</span>
                    <span className="text-sm font-bold text-zinc-200">62.8%</span>
                  </div>
                  <div className="flex flex-col gap-0.5 text-right">
                    <span className="text-[10px] text-zinc-500">다음 예상 분포</span>
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="text-blue-400">P:48</span>
                      <span className="text-red-400">B:42</span>
                      <span className="text-emerald-400">T:10</span>
                    </div>
                  </div>
                </div>
              </div>
            )}`;

code = code.replace(`            <div className="flex justify-between items-center">
              <span className={\`text-2xl font-bold tracking-tight \${getOpinionColor(table.ai.finalOpinion)}\`}>
                {getOpinionText(table.ai.finalOpinion)}
              </span>
              <span className="text-xl font-mono font-bold text-white">
                {['WAIT', 'SKIP', 'PAUSE', 'STOP', 'ERROR', 'DATA_ERROR'].includes(table.ai.finalOpinion) ? '-' : table.ai.recommendedAmount.toLocaleString() + '원'}
              </span>
            </div>`, replacement);

fs.writeFileSync('src/components/RightPanel.tsx', code);
