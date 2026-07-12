import { Settings, ShieldCheck, Coins, DatabaseZap, Activity, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export default function SystemSettingsTab() {
  const [doubleCheck, setDoubleCheck] = useState(true);
  const [aiLimit, setAiLimit] = useState('1000');
  
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col lg:flex-row gap-6 bg-zinc-950">
      
      {/* Result Double Check Settings */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-zinc-300 mb-2">
          <ShieldCheck size={20} className="text-emerald-500" />
          <h3 className="font-bold">결과 이중검증 (OCR & API)</h3>
        </div>
        
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-5 flex-1">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="font-bold text-zinc-200">화면 판독 이중검증 활성화</span>
              <span className="text-xs text-zinc-500">API 결과와 OCR 결과를 교차 검증하여 오류를 방지합니다.</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={doubleCheck} onChange={(e) => setDoubleCheck(e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 mt-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold mb-2 text-sm">
              <CheckCircle2 size={16} />
              검증 프로세스 동작 중
            </div>
            <ul className="text-xs text-emerald-500/80 space-y-2">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> API 데이터 수신 및 파싱
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> 화면 OCR 판독 진행
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> 두 결과의 일치 여부 확인 후 승인
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* AI Cost Management */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-zinc-300 mb-2">
          <Coins size={20} className="text-amber-500" />
          <h3 className="font-bold">AI API 비용 관리</h3>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-5 flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
              <span className="text-[10px] text-zinc-500 block mb-1">금월 예상 비용</span>
              <span className="text-lg font-mono font-bold text-amber-400">$142.50</span>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
              <span className="text-[10px] text-zinc-500 block mb-1">오늘 호출 횟수</span>
              <span className="text-lg font-mono font-bold text-blue-400">1,204회</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <label className="text-xs font-medium text-zinc-400">일일 API 호출 한도 설정</label>
            <div className="flex items-center gap-3">
              <input 
                type="number" 
                value={aiLimit}
                onChange={(e) => setAiLimit(e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 font-mono text-sm text-zinc-200 outline-none focus:border-amber-500 transition-colors"
              />
              <span className="text-zinc-500 text-sm">회 / 일</span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              설정된 한도 초과 시 AI 분석이 일시 중지되며, 지정된 사용자 규칙에 의해서만 로직이 수행됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* Final Operations UX */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-zinc-300 mb-2">
          <DatabaseZap size={20} className="text-blue-500" />
          <h3 className="font-bold">시스템 상태 및 운영 모니터링</h3>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4 flex-1">
          <div className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
            <div className="flex items-center gap-3">
              <Activity size={16} className="text-emerald-500" />
              <span className="text-sm font-medium text-zinc-300">서버 연결 상태</span>
            </div>
            <span className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> ONLINE
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
            <div className="flex items-center gap-3">
              <DatabaseZap size={16} className="text-blue-500" />
              <span className="text-sm font-medium text-zinc-300">지연 시간 (Latency)</span>
            </div>
            <span className="text-xs font-mono text-blue-400">42ms</span>
          </div>
          
          <div className="mt-auto">
            <button className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium text-sm transition-colors">
              전체 시스템 로그 다운로드
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
