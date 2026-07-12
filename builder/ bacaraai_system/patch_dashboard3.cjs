const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const banner = `
        {/* Risk Warning Banner */}
        <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-4 flex items-start gap-3 shadow-lg shadow-red-900/20">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
          <div className="flex flex-col gap-1 w-full">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-red-500 text-sm">위험 경고: 로스컷 근접</h3>
              <button className="text-red-400 hover:text-red-300 text-xs font-bold bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded transition-colors">
                긴급 전체 정지
              </button>
            </div>
            <p className="text-red-400/80 text-xs">
              로스컷까지 남은 여유가 20% 이하입니다. 새로운 규칙 발동 및 마틴 진행이 자동으로 제한될 수 있습니다.
            </p>
          </div>
        </div>
`;

code = code.replace('{/* Top KPI Row */}', banner + '\n        {/* Top KPI Row */}');

fs.writeFileSync('src/components/Dashboard.tsx', code);
