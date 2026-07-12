import { Search, FlaskConical, Play, Database } from 'lucide-react';
import { useState } from 'react';

export default function RuleLabTab() {
  const [searchPattern, setSearchPattern] = useState('');
  
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col lg:flex-row gap-6 bg-zinc-950">
      
      {/* Left Col: Backtest Form */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-zinc-300 mb-2">
          <FlaskConical size={20} className="text-amber-500" />
          <h3 className="font-bold">규칙 생성 및 백테스트</h3>
        </div>
        
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-5">
          
          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-zinc-400">발동 조건 패턴 (출현 결과)</label>
              <select className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 outline-none focus:border-amber-500">
                <option>Player 3연속</option>
                <option>Banker 2연속 후 Player</option>
                <option>P B P B 퐁당 패턴</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-zinc-400">AI 모델 합의 (선택)</label>
              <select className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 outline-none focus:border-amber-500">
                <option>GPT 추천 일치</option>
                <option>2개 이상 모델 일치</option>
                <option>모든 모델 만장일치</option>
                <option>조건 없음</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-zinc-400">목표 베팅 대상</label>
              <select className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 outline-none focus:border-amber-500">
                <option>Player</option>
                <option>Banker</option>
                <option>AI 추천 방향</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-zinc-400">테스트 데이터 기준</label>
              <select className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 outline-none focus:border-amber-500">
                <option>과거 1000슈</option>
                <option>과거 500슈</option>
                <option>과거 1개월</option>
              </select>
            </div>
          </div>

          {/* Action */}
          <button className="w-full py-3 mt-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20">
            <Play size={16} />
            가상 시뮬레이션 시작
          </button>

          {/* Dummy Result */}
          <div className="border-t border-zinc-800 pt-5 mt-2">
            <h4 className="text-xs font-bold text-zinc-500 mb-3 uppercase tracking-wider">시뮬레이션 결과 (예상)</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-950 rounded border border-zinc-800 p-3 flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500">조건 발견 횟수</span>
                <span className="text-lg font-mono font-bold text-zinc-300">1,240<span className="text-xs font-sans font-normal ml-0.5">회</span></span>
              </div>
              <div className="bg-zinc-950 rounded border border-zinc-800 p-3 flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500">예상 승률</span>
                <span className="text-lg font-mono font-bold text-emerald-400">54.2<span className="text-xs font-sans font-normal ml-0.5">%</span></span>
              </div>
              <div className="bg-zinc-950 rounded border border-zinc-800 p-3 flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500">기대 수익(마틴적용)</span>
                <span className="text-lg font-mono font-bold text-blue-400">+4.2<span className="text-xs font-sans font-normal ml-0.5">만</span></span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Right Col: Pattern Search */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-zinc-300 mb-2">
          <Search size={20} className="text-blue-400" />
          <h3 className="font-bold">과거 유사 상황 검색기</h3>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-5 flex-1">
          
          <div className="flex flex-col gap-3">
            <label className="text-xs font-medium text-zinc-400">현재 패턴 입력 (P, B, T)</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="예: P B P P"
                value={searchPattern}
                onChange={(e) => setSearchPattern(e.target.value.toUpperCase())}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 font-mono text-sm text-zinc-200 outline-none focus:border-blue-500 transition-colors uppercase tracking-widest"
              />
              <button className="px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors shadow-lg shadow-blue-600/20">
                검색
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              입력한 패턴과 일치하는 과거 데이터베이스(약 3,420만 건)를 스캔하여 다음 결과를 예측합니다.
            </p>
          </div>

          <div className="flex-1 bg-zinc-950 rounded-lg border border-zinc-800 p-4 flex flex-col">
            <div className="flex items-center gap-2 text-zinc-400 mb-4 border-b border-zinc-800/50 pb-3">
              <Database size={14} />
              <span className="text-xs font-bold">검색 결과 통계</span>
            </div>
            
            <div className="flex-1 flex flex-col justify-center gap-6">
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">검색된 일치 표본</span>
                <span className="font-mono font-bold text-zinc-200">14,205 건</span>
              </div>

              <div className="space-y-4">
                {/* Player Stat */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-blue-400">PLAYER 출현 확률</span>
                    <span className="font-mono text-blue-400">45%</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '45%' }}></div>
                  </div>
                </div>

                {/* Banker Stat */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-red-400">BANKER 출현 확률</span>
                    <span className="font-mono text-red-400">55%</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: '55%' }}></div>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-950/20 border border-blue-900/30 rounded text-xs leading-relaxed text-blue-200/70">
                <span className="text-blue-400 font-bold block mb-1">💡 분석가 코멘트</span>
                이 패턴에서는 전통적으로 Banker로 전환되는 경향이 10% 더 높게 나타났습니다.
              </div>

            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
