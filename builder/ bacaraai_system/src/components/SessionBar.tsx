import { Lock, Play, Pause, Square, Settings2 } from 'lucide-react';
import useWallet from '../hooks/useWallet';
import HelpTooltip from './HelpTooltip';

interface SessionBarProps {
  onStartSession: () => void;
  beginnerMode?: boolean;
}

export default function SessionBar({ onStartSession, beginnerMode = true }: SessionBarProps) {
  const wallet = useWallet();
  const seed = wallet.loading ? 0 : wallet.balance;

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  return (
    <div className="bg-zinc-900 border-b border-zinc-800 p-4">
      {beginnerMode && (
        <p className="text-[11px] text-zinc-500 mb-3 leading-relaxed">
          가상머니는 연습용 시드입니다. 실제 돈이 아니며, 관리자가 지급한 금액 안에서만 시뮬레이션합니다.
        </p>
      )}
      <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
        
        {/* Financial Info Grid */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="flex flex-col">
            <span className="text-zinc-500 text-xs mb-1 inline-flex items-center gap-1">
              시작 시드
              {beginnerMode && <HelpTooltip termId="seed" />}
            </span>
            <span className="text-zinc-300 font-mono text-sm">{wallet.loading ? '불러오는 중...' : formatMoney(seed)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-zinc-500 text-xs mb-1">현재 자금</span>
            <span className="text-white font-mono font-medium text-sm">{wallet.loading ? '...' : formatMoney(seed)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-zinc-500 text-xs mb-1">현재 손익</span>
            <span className="text-emerald-400 font-mono font-bold text-sm">+{formatMoney(260000)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-zinc-500 text-xs mb-1">초기 베팅</span>
            <span className="text-zinc-300 font-mono text-sm">{formatMoney(10000)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-zinc-500 text-xs mb-1 inline-flex items-center gap-1">
              현재 마틴
              {beginnerMode && <HelpTooltip termId="martin" />}
            </span>
            <span className="text-amber-400 font-mono font-medium text-sm">2 / 8단계</span>
          </div>
          <div className="flex flex-col col-span-2">
            <span className="text-zinc-500 text-xs mb-1">다음 참고 금액</span>
            <span className="text-white font-mono font-medium text-sm">{formatMoney(20000)}</span>
          </div>
        </div>

        {/* Progress and Targets */}
        <div className="w-full lg:w-[400px] flex flex-col gap-2">
          <div className="flex justify-between text-xs">
            <div className="flex flex-col gap-0.5">
              <span className="text-zinc-500 inline-flex items-center gap-1">
                로스컷 <Lock size={10} className="inline" />
                {beginnerMode && <HelpTooltip termId="losscut" />}
              </span>
              <span className="text-red-400 font-mono">-{formatMoney(2000000)}</span>
            </div>
            <div className="flex flex-col gap-0.5 text-center">
              <span className="text-zinc-500">현재</span>
              <span className="text-emerald-400 font-mono">+{formatMoney(260000)}</span>
            </div>
            <div className="flex flex-col gap-0.5 text-right">
              <span className="text-zinc-500 inline-flex items-center justify-end gap-1">
                윈컷
                {beginnerMode && <HelpTooltip termId="wincut" />}
              </span>
              <span className="text-blue-400 font-mono">+{formatMoney(1000000)}</span>
            </div>
          </div>
          
          {/* Gauge Bar */}
          <div className="h-2 w-full bg-zinc-800 rounded-full relative overflow-hidden flex">
            <div className="absolute left-[66.6%] top-0 bottom-0 w-[1px] bg-zinc-600 z-10"></div>
            <div 
              className="absolute h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ left: '66.6%', width: '8.6%' }}
            ></div>
          </div>
          
          <div className="flex justify-between text-[10px] text-zinc-500">
            <span>남음: {formatMoney(2260000)}</span>
            <span>남음: {formatMoney(740000)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <button 
            onClick={onStartSession}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 px-4 py-2 rounded-lg font-bold text-sm transition-colors"
          >
            <Play size={16} fill="currentColor" />
            세션 시작
          </button>
          <button className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors">
            <Pause size={18} />
          </button>
          <button className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors">
            <Square size={18} />
          </button>
          <button className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors ml-2">
            <Settings2 size={18} />
          </button>
        </div>

      </div>
    </div>
  );
}
