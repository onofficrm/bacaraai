const fs = require('fs');
let code = fs.readFileSync('src/components/DataInsightCenter.tsx', 'utf8');

const newComponent = `
function PatternAnalysisTab() {
  const patterns = [
    { rank: 1, pattern: 'P-B-P', name: '한 번씩 교차 후 Player', total: 82430, ratio: '6.4%', month: 6218, trend: '+3.2%', isUp: true, sample: '충분' },
    { rank: 2, pattern: 'B-P-B', name: '한 번씩 교차 후 Banker', total: 81920, ratio: '6.3%', month: 6150, trend: '+2.8%', isUp: true, sample: '충분' },
    { rank: 3, pattern: 'P-P-B', name: '플레이어 2번 후 뱅커', total: 76540, ratio: '5.9%', month: 5820, trend: '-1.2%', isUp: false, sample: '충분' },
    { rank: 4, pattern: 'B-B-P', name: '뱅커 2번 후 플레이어', total: 75210, ratio: '5.8%', month: 5740, trend: '-0.8%', isUp: false, sample: '충분' },
    { rank: 5, pattern: 'P-B-P-B', name: '4연속 퐁당', total: 68320, ratio: '5.3%', month: 5120, trend: '+5.1%', isUp: true, sample: '충분' },
    { rank: 6, pattern: 'B-P-B-P', name: '4연속 퐁당 (B시작)', total: 67950, ratio: '5.2%', month: 5080, trend: '+4.8%', isUp: true, sample: '충분' },
    { rank: 7, pattern: 'P-P-P', name: '플레이어 3연속', total: 62140, ratio: '4.8%', month: 4890, trend: '-2.1%', isUp: false, sample: '충분' },
    { rank: 8, pattern: 'B-B-B', name: '뱅커 3연속', total: 61890, ratio: '4.8%', month: 4810, trend: '-1.5%', isUp: false, sample: '충분' },
    { rank: 9, pattern: 'P-P-B-P', name: 'P-P-B 후 꺾임', total: 45210, ratio: '3.5%', month: 3520, trend: '+1.1%', isUp: true, sample: '보통' },
    { rank: 10, pattern: 'B-B-P-B', name: 'B-B-P 후 꺾임', total: 44850, ratio: '3.4%', month: 3480, trend: '+0.9%', isUp: true, sample: '보통' }
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex flex-col gap-1.5 mb-6">
          <h3 className="text-xl font-bold text-zinc-200">패턴 분석</h3>
          <p className="text-sm text-zinc-400">수집된 게임 결과에서 반복적으로 등장한 결과 조합과 연속 출현 빈도를 분석합니다.</p>
          <div className="flex items-start gap-2 mt-2 bg-amber-500/10 border border-amber-500/20 text-amber-500/90 text-xs px-3 py-2 rounded-lg w-fit">
            <Info size={14} className="shrink-0 mt-0.5" />
            <span>자주 등장한 패턴이 다음에도 반복된다는 의미는 아닙니다.</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <select className="bg-zinc-950 border border-zinc-800 text-sm text-zinc-300 rounded-lg px-3 py-2 outline-none">
            <option>최근 7일</option>
            <option>최근 30일</option>
            <option>최근 90일</option>
            <option>올해</option>
            <option>전체 기간</option>
          </select>
          <select className="bg-zinc-950 border border-zinc-800 text-sm text-zinc-300 rounded-lg px-3 py-2 outline-none">
            <option>특정 테이블 (전체)</option>
            <option>스피드 바카라 A</option>
            <option>라이트닝 바카라</option>
          </select>
          <select className="bg-zinc-950 border border-zinc-800 text-sm text-zinc-300 rounded-lg px-3 py-2 outline-none">
            <option>슈 구간 (전체)</option>
            <option>초반 (1~20)</option>
            <option>중반 (21~40)</option>
            <option>후반 (41~)</option>
          </select>
          <select className="bg-zinc-950 border border-zinc-800 text-sm text-zinc-300 rounded-lg px-3 py-2 outline-none">
            <option>Tie 포함 여부 (제외)</option>
            <option>Tie 포함</option>
          </select>
          <select className="bg-zinc-950 border border-zinc-800 text-sm text-zinc-300 rounded-lg px-3 py-2 outline-none">
            <option>최소 표본 수 (10,000 이상)</option>
            <option>5,000 이상</option>
            <option>1,000 이상</option>
          </select>
        </div>

        <h4 className="font-bold text-zinc-200 mb-4 flex items-center gap-2">
          많이 나온 패턴 TOP 10
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {patterns.map(p => (
            <div key={p.rank} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col relative overflow-hidden group hover:border-zinc-700 transition-colors">
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-zinc-800/50 to-transparent -z-10 group-hover:from-zinc-700/50 transition-colors"></div>
              
              <div className="flex justify-between items-start mb-3">
                <span className="text-2xl font-black text-zinc-800 group-hover:text-zinc-700 transition-colors">{p.rank}위</span>
                <span className={\`text-xs px-2 py-1 rounded font-medium \${p.sample === '충분' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}\`}>
                  표본 {p.sample}
                </span>
              </div>
              
              <div className="flex gap-1.5 mb-2">
                {p.pattern.split('-').map((res, i) => (
                  <span key={i} className={\`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white \${res === 'P' ? 'bg-blue-500' : res === 'B' ? 'bg-red-500' : 'bg-emerald-500'}\`}>
                    {res}
                  </span>
                ))}
              </div>
              
              <p className="text-sm font-medium text-zinc-300 mb-4 h-5">{p.name}</p>
              
              <div className="grid grid-cols-2 gap-y-3 gap-x-2 mt-auto">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-zinc-500">전체 출현</span>
                  <span className="text-sm font-mono text-zinc-200">{p.total.toLocaleString()}회</span>
                </div>
                <div className="flex flex-col gap-0.5 text-right">
                  <span className="text-[10px] text-zinc-500">전체 대비</span>
                  <span className="text-sm font-mono text-zinc-300">{p.ratio}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-zinc-500">최근 30일</span>
                  <span className="text-sm font-mono text-zinc-400">{p.month.toLocaleString()}회</span>
                </div>
                <div className="flex flex-col gap-0.5 text-right">
                  <span className="text-[10px] text-zinc-500">전월 대비</span>
                  <span className={\`text-sm font-mono font-medium \${p.isUp ? 'text-emerald-400' : 'text-red-400'}\`}>
                    {p.trend}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/components/DataInsightCenter.tsx', code + '\n' + newComponent);
