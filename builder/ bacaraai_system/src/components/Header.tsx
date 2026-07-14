import { Activity, LogOut, Maximize, Settings, ShieldAlert, Wallet } from 'lucide-react';
import NotificationCenter from './NotificationCenter';
import { PLATFORM_LINKS } from '../constants';
import useWallet from '../hooks/useWallet';

interface HeaderProps {
  onEmergencyStop?: () => void;
  activeViewLabel?: string;
}

export default function Header({ onEmergencyStop, activeViewLabel }: HeaderProps) {
  const wallet = useWallet();
  const moneyText = new Intl.NumberFormat('ko-KR').format(wallet.balance) + '원';

  return (
    <header className="relative z-[200] h-[68px] bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-6 text-zinc-300 shrink-0">
      {/* Left */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-amber-500">
          <Activity size={24} className="animate-pulse" />
          <h1 className="font-bold text-lg tracking-tight text-white hidden sm:block">바카라 AI 도우미</h1>
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
        {/* Demo Mode Badge */}
        <div className="flex items-center gap-1.5 bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-xs font-bold border border-amber-500/30">
          <Activity size={12} />
          데모 데이터 사용 중
        </div>

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
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-500">마지막 업데이트:</span>
          <span className="text-emerald-400">방금 전</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs sm:text-sm font-bold">
          <Wallet size={14} />
          <span className="hidden xs:inline">가상머니</span>
          <span className="font-mono">{wallet.loading ? '...' : moneyText}</span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-zinc-400">
          <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors" type="button" aria-label="전체 화면"><Maximize size={18} /></button>
          <NotificationCenter />
          <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors" type="button" aria-label="설정"><Settings size={18} /></button>
        </div>
        <a
          href={PLATFORM_LINKS.logout}
          className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white text-sm font-medium border border-zinc-800"
          title="로그아웃"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">로그아웃</span>
        </a>
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
