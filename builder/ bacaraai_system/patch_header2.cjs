const fs = require('fs');
const content = `import { Activity, Maximize, Settings, ShieldAlert, User, Wifi } from 'lucide-react';
import NotificationCenter from './NotificationCenter';

interface HeaderProps {
  onEmergencyStop?: () => void;
  activeViewLabel?: string;
}

export default function Header({ onEmergencyStop, activeViewLabel }: HeaderProps) {
  return (
    <header className="h-[68px] bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-6 text-zinc-300 shrink-0">
      {/* Left */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-amber-500">
          <Activity size={24} className="animate-pulse" />
          <h1 className="font-bold text-lg tracking-tight text-white hidden sm:block">AI Baccarat Assistant</h1>
        </div>
        
        {activeViewLabel && (
          <div className="hidden md:flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-sm font-medium">
            <span className="text-zinc-500">현재 페이지:</span>
            <span className="text-zinc-200">{activeViewLabel}</span>
          </div>
        )}

        <select className="bg-zinc-800 text-emerald-400 border border-zinc-700 px-3 py-1.5 rounded-lg text-xs font-bold outline-none cursor-pointer hover:bg-zinc-700 transition-colors">
          <option>관찰 모드</option>
          <option>AI 추천 모드</option>
          <option>섀도 모드</option>
          <option>규칙 시뮬레이션 모드</option>
        </select>
      </div>

      {/* Center - System Status */}
      <div className="hidden xl:flex items-center gap-6 text-sm bg-zinc-900/50 border border-zinc-800/50 px-4 py-1.5 rounded-full">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          <span className="font-bold text-blue-400">세션 진행 중</span>
        </div>
        <div className="h-4 w-[1px] bg-zinc-800"></div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">진행 시간</span>
          <span className="font-mono font-medium text-zinc-200">38분 24초</span>
        </div>
        <div className="h-4 w-[1px] bg-zinc-800"></div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">테이블</span>
          <span className="font-semibold text-zinc-200">8개 연결</span>
        </div>
        <div className="h-4 w-[1px] bg-zinc-800"></div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">활성 규칙</span>
          <span className="font-semibold text-zinc-200">3개</span>
        </div>
        <div className="h-4 w-[1px] bg-zinc-800"></div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">데이터 수집</span>
          <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
            <Wifi size={14} /> 정상
          </span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="hidden sm:flex items-center gap-3 text-zinc-400">
          <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"><Maximize size={18} /></button>
          <NotificationCenter />
          <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"><Settings size={18} /></button>
          <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"><User size={18} /></button>
        </div>
        <button 
          onClick={onEmergencyStop}
          className="flex items-center gap-2 bg-red-950/40 text-red-400 hover:bg-red-900/50 border border-red-900/50 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
        >
          <ShieldAlert size={16} />
          긴급 정지
        </button>
      </div>
    </header>
  );
}
`;
fs.writeFileSync('src/components/Header.tsx', content);
