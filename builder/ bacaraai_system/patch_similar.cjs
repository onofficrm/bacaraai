const fs = require('fs');
let code = fs.readFileSync('src/components/DataInsightCenter.tsx', 'utf8');

const replacement = `function SimilarSituationsTab() {
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex flex-col gap-1.5 mb-6">
          <h3 className="text-xl font-bold text-zinc-200">유사 상황 검색</h3>
          <p className="text-sm text-zinc-400">현재 게임 상황과 유사한 과거 데이터를 확인하고 분석합니다.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 flex flex-col gap-4">
            <h4 className="font-bold text-zinc-300 text-sm">현재 선택된 테이블</h4>
            <div className="bg-zinc-950 border border-amber-500/30 rounded-xl p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h5 className="font-bold text-white">스피드 바카라 A</h5>
                  <span className="text-xs text-zinc-500">BACC-SPD-A • 68회차</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              </div>
              
              <div className="flex flex-col gap-2">
                <span className="text-xs text-zinc-400">최근 흐름 (마지막 5회)</span>
                <div className="flex gap-1">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs text-white bg-blue-500">P</span>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs text-white bg-blue-500">P</span>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs text-white bg-red-500">B</span>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs text-white bg-blue-500">P</span>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs text-white bg-red-500 ring-2 ring-white/20">B</span>
                </div>
              </div>
            </div>
            
            <button className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors">테이블 변경</button>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-4">
            <h4 className="font-bold text-zinc-300 text-sm">유사 과거 상황 분석 결과</h4>
            
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity className="text-amber-500" size={24} />
                  <div>
                    <div className="text-sm text-zinc-400">발견된 과거 유사 사례</div>
                    <div className="text-2xl font-mono font-bold text-zinc-200">4,218<span className="text-sm font-sans font-normal text-zinc-500 ml-1">건</span></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-zinc-400">가장 유력한 다음 결과</div>
                  <div className="text-2xl font-bold text-blue-400">PLAYER</div>
                </div>
              </div>
              
              <div className="h-px bg-zinc-800 w-full"></div>
              
              <div className="flex flex-col gap-4">
                <h5 className="text-sm font-medium text-zinc-300">이후 결과 실제 분포</h5>
                
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-4">
                    <span className="w-16 font-bold text-blue-400">Player</span>
                    <div className="flex-1 h-3 bg-zinc-900 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: '62.8%' }}></div>
                    </div>
                    <span className="w-16 text-right font-mono text-zinc-300">62.8%</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-16 font-bold text-red-400">Banker</span>
                    <div className="flex-1 h-3 bg-zinc-900 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500" style={{ width: '31.2%' }}></div>
                    </div>
                    <span className="w-16 text-right font-mono text-zinc-300">31.2%</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-16 font-bold text-emerald-400">Tie</span>
                    <div className="flex-1 h-3 bg-zinc-900 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: '6.0%' }}></div>
                    </div>
                    <span className="w-16 text-right font-mono text-zinc-300">6.0%</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs px-4 py-3 rounded-lg">
                <Info size={16} className="shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-sm">AI 인사이트</span>
                  <p className="text-blue-400/80 leading-relaxed">
                    과거 4,218건의 유사한 맥락(P-P-B-P-B)에서 다음 결과로 Player가 나온 확률이 62.8%로 상당히 높았습니다. 이 흐름은 전형적인 퐁당 전환 패턴으로 분석됩니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}`;

code = code.replace(/function SimilarSituationsTab\(\) {[\s\S]*?}\n/, replacement + '\n');

fs.writeFileSync('src/components/DataInsightCenter.tsx', code);
