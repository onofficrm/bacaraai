const fs = require('fs');
let code = fs.readFileSync('src/components/DataInsightCenter.tsx', 'utf8');

const newComponents = `
function PatternSearchTab() {
  const [pattern, setPattern] = React.useState([]);

  const addResult = (res) => {
    if (pattern.length < 10) setPattern([...pattern, res]);
  };

  const removeLast = () => {
    setPattern(pattern.slice(0, -1));
  };

  const clearAll = () => {
    setPattern([]);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex flex-col gap-1.5 mb-6">
          <h3 className="text-xl font-bold text-zinc-200">패턴 검색기</h3>
          <p className="text-sm text-zinc-400">Player, Banker, Tie 결과 조합을 입력하여 과거 출현 횟수와 이후 결과 분포를 확인합니다.</p>
          <div className="flex items-start gap-2 mt-2 bg-amber-500/10 border border-amber-500/20 text-amber-500/90 text-xs px-3 py-2 rounded-lg w-fit">
            <Info size={14} className="shrink-0 mt-0.5" />
            <span>검색 결과는 과거 데이터의 분포이며 다음 결과를 보장하지 않습니다.</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Input Area */}
          <div className="flex-1 flex flex-col gap-4">
            <h4 className="font-bold text-zinc-300">시각적 패턴 입력기</h4>
            
            <div className="min-h-[64px] bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex items-center flex-wrap gap-2">
              {pattern.length === 0 ? (
                <span className="text-zinc-500 text-sm">아래 버튼을 눌러 패턴을 입력하세요...</span>
              ) : (
                pattern.map((p, i) => (
                  <React.Fragment key={i}>
                    <span className={\`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white \${p === 'P' ? 'bg-blue-500' : p === 'B' ? 'bg-red-500' : 'bg-emerald-500'}\`}>
                      {p}
                    </span>
                    {i < pattern.length - 1 && <span className="text-zinc-600 font-bold">→</span>}
                  </React.Fragment>
                ))
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => addResult('P')} className="flex-1 py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg font-bold transition-colors">Player</button>
              <button onClick={() => addResult('B')} className="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg font-bold transition-colors">Banker</button>
              <button onClick={() => addResult('T')} className="flex-1 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg font-bold transition-colors">Tie</button>
            </div>
            
            <div className="flex gap-2">
              <button onClick={removeLast} disabled={pattern.length === 0} className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 rounded-lg text-sm font-medium transition-colors">마지막 입력 삭제</button>
              <button onClick={clearAll} disabled={pattern.length === 0} className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 rounded-lg text-sm font-medium transition-colors">전체 초기화</button>
            </div>
          </div>

          {/* Result Area */}
          <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-6">
            <h4 className="font-bold text-zinc-300 mb-6 flex items-center justify-between">
              <span>패턴 검색 결과</span>
              {pattern.length > 0 && <span className="text-xs font-mono text-amber-500 bg-amber-500/10 px-2 py-1 rounded">데이터 1.28M 기준</span>}
            </h4>
            
            {pattern.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-zinc-500 gap-2">
                <BarChart3 size={32} className="opacity-50" />
                <p className="text-sm">패턴을 입력하면 검색 결과가 표시됩니다.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-zinc-400">과거 출현 횟수</span>
                  <span className="text-3xl font-mono font-bold text-zinc-100">{(Math.floor(82430 / Math.pow(1.8, pattern.length))).toLocaleString()}<span className="text-sm text-zinc-500 font-sans ml-1">회</span></span>
                </div>
                
                <div className="flex flex-col gap-3">
                  <span className="text-sm text-zinc-400">이후 결과 분포</span>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <span className="w-4 h-4 rounded bg-blue-500 shrink-0"></span>
                      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: '42%' }}></div>
                      </div>
                      <span className="w-12 text-right font-mono text-sm text-blue-400">42.0%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-4 h-4 rounded bg-red-500 shrink-0"></span>
                      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500" style={{ width: '48%' }}></div>
                      </div>
                      <span className="w-12 text-right font-mono text-sm text-red-400">48.0%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-4 h-4 rounded bg-emerald-500 shrink-0"></span>
                      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: '10%' }}></div>
                      </div>
                      <span className="w-12 text-right font-mono text-sm text-emerald-400">10.0%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SimilarSituationsTab() {
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex flex-col gap-1.5 mb-6">
          <h3 className="text-xl font-bold text-zinc-200">유사 상황 검색</h3>
          <p className="text-sm text-zinc-400">현재 게임 상황과 유사한 과거 데이터를 확인하고 분석합니다.</p>
        </div>
        
        <div className="h-64 border border-dashed border-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 bg-zinc-950">
          <div className="flex flex-col items-center gap-2">
            <Activity size={32} className="opacity-50 mb-2" />
            <p className="font-medium text-zinc-400">선택된 테이블이 없거나 데이터가 부족합니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

code = code.replace(
  `        ) : activeTab === 'analysis' ? (
          <PatternAnalysisTab />
        ) : (`,
  `        ) : activeTab === 'analysis' ? (
          <PatternAnalysisTab />
        ) : activeTab === 'search' ? (
          <PatternSearchTab />
        ) : activeTab === 'similar' ? (
          <SimilarSituationsTab />
        ) : (`
);

fs.writeFileSync('src/components/DataInsightCenter.tsx', code + '\n' + newComponents);
