const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const newImports = `import { Activity, AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, ChevronRight, Clock, Coins, Crosshair, LineChart, ShieldAlert, Target, TrendingDown, TrendingUp, Wifi, Zap, LayoutGrid, Maximize2, Star } from 'lucide-react';`;

code = code.replace(/import { Activity.*? } from 'lucide-react';/, newImports);

const tableStatusArea = `
        {/* Real-time Table Status Area */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mt-2 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="font-bold text-zinc-200 flex items-center gap-2">
              <LayoutGrid size={20} className="text-blue-500" />
              실시간 테이블 현황
            </h3>
            
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select className="bg-zinc-950 border border-zinc-800 text-zinc-300 rounded px-3 py-1.5 outline-none cursor-pointer">
                <option>자동 우선순위 정렬</option>
                <option>테이블 번호순</option>
                <option>즐겨찾기 우선</option>
              </select>
              <button className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded transition-colors">
                전체보기
              </button>
              <button className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded font-medium flex items-center gap-1 transition-colors">
                <Maximize2 size={12} /> 집중 모드
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6 text-xs">
            <button className="bg-zinc-800 text-zinc-200 px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
              전체 <span className="text-zinc-400">8</span>
            </button>
            <button className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
              규칙 발동 <span className="text-blue-300">2</span>
            </button>
            <button className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
              사용자 확인 대기 <span className="text-amber-300">1</span>
            </button>
            <button className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
              마틴 진행 중 <span className="text-purple-300">1</span>
            </button>
            <button className="bg-zinc-800 text-zinc-400 border border-zinc-700 px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
              관망 <span className="text-zinc-500">2</span>
            </button>
            <button className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
              위험 <span className="text-red-300">1</span>
            </button>
            <button className="bg-zinc-950 text-zinc-600 border border-zinc-800 px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
              데이터 오류 <span>0</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Table Mini Card 1 */}
            <div className="bg-zinc-950 border border-blue-500/30 rounded-lg p-3 hover:border-blue-500/60 transition-colors cursor-pointer group">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <Star size={14} className="text-amber-500 fill-amber-500" />
                  <span className="font-bold text-zinc-200 text-sm">스피드 바카라 A</span>
                </div>
                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold">규칙 발동</span>
              </div>
              <div className="flex justify-between items-end">
                <div className="flex gap-0.5">
                  <span className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8px] text-white bg-blue-500">P</span>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8px] text-white bg-blue-500">P</span>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8px] text-white bg-red-500">B</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 block">AI 의견</span>
                  <span className="text-xs font-bold text-blue-400">PLAYER</span>
                </div>
              </div>
            </div>

            {/* Table Mini Card 2 */}
            <div className="bg-zinc-950 border border-amber-500/30 rounded-lg p-3 hover:border-amber-500/60 transition-colors cursor-pointer group">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <Star size={14} className="text-zinc-700" />
                  <span className="font-bold text-zinc-200 text-sm">라이트닝 바카라</span>
                </div>
                <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">확인 대기</span>
              </div>
              <div className="flex justify-between items-end">
                <div className="flex gap-0.5">
                  <span className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8px] text-white bg-red-500">B</span>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8px] text-white bg-red-500">B</span>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8px] text-white bg-blue-500">P</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 block">추천 마틴</span>
                  <span className="text-xs font-bold text-zinc-200">2단계</span>
                </div>
              </div>
            </div>

            {/* Table Mini Card 3 */}
            <div className="bg-zinc-950 border border-purple-500/30 rounded-lg p-3 hover:border-purple-500/60 transition-colors cursor-pointer group">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <Star size={14} className="text-zinc-700" />
                  <span className="font-bold text-zinc-200 text-sm">스피드 바카라 B</span>
                </div>
                <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded font-bold">마틴 진행</span>
              </div>
              <div className="flex justify-between items-end">
                <div className="flex gap-0.5">
                  <span className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8px] text-white bg-blue-500">P</span>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8px] text-white bg-red-500">B</span>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8px] text-white bg-blue-500">P</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 block">현재 단계</span>
                  <span className="text-xs font-bold text-purple-400">3단계 (실패)</span>
                </div>
              </div>
            </div>

            {/* Table Mini Card 4 */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 hover:border-zinc-700 transition-colors cursor-pointer group">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <Star size={14} className="text-zinc-700" />
                  <span className="font-bold text-zinc-200 text-sm">스피드 바카라 C</span>
                </div>
                <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-bold">관망</span>
              </div>
              <div className="flex justify-between items-end">
                <div className="flex gap-0.5">
                  <span className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8px] text-white bg-red-500">B</span>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8px] text-white bg-blue-500">P</span>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8px] text-white bg-emerald-500">T</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 block">AI 의견</span>
                  <span className="text-xs font-bold text-zinc-500">WAIT</span>
                </div>
              </div>
            </div>
            
            {/* Table Mini Card 5 */}
            <div className="bg-zinc-950 border border-red-500/30 rounded-lg p-3 hover:border-red-500/60 transition-colors cursor-pointer group">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <Star size={14} className="text-amber-500 fill-amber-500" />
                  <span className="font-bold text-zinc-200 text-sm">코리안 스피드 A</span>
                </div>
                <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">위험</span>
              </div>
              <div className="flex justify-between items-end">
                <div className="flex gap-0.5">
                  <span className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8px] text-white bg-red-500">B</span>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8px] text-white bg-red-500">B</span>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8px] text-white bg-red-500">B</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 block">연속 실패</span>
                  <span className="text-xs font-bold text-red-400">5회</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}`;

code = code.replace(/<\/div>\s*<\/div>\s*<\/div>\s*\);\s*\}/, tableStatusArea);
code = code.replace(/<h3 className="font-bold text-zinc-200">즉시 확인 필요 테이블<\/h3>/, '<h3 className="font-bold text-zinc-200">지금 확인할 신호</h3>');

fs.writeFileSync('src/components/Dashboard.tsx', code);
