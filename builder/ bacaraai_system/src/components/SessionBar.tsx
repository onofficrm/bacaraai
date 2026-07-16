import { Lock, Play, Pause, Square, Settings2 } from 'lucide-react';
import useWallet from '../hooks/useWallet';
import HelpTooltip from './HelpTooltip';
import { playSfx } from '../audio/sfxEngine';

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
    <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2.5">
      <div className="flex flex-col xl:flex-row gap-3 xl:gap-4 justify-between items-stretch xl:items-center">
        {/* Compact money + bet meta */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 min-w-0">
          <div className="flex items-center gap-2 rounded-lg bg-zinc-950/70 border border-zinc-800 px-2.5 py-1.5">
            <span className="text-[10px] text-zinc-500 inline-flex items-center gap-0.5">
              시드
              {beginnerMode && <HelpTooltip termId="seed" />}
            </span>
            <span className="text-zinc-300 font-mono text-xs">
              {wallet.loading ? '...' : formatMoney(seed)}
            </span>
            <span className="text-zinc-700">|</span>
            <span className="text-[10px] text-zinc-500">자금</span>
            <span className="text-white font-mono text-xs font-medium">
              {wallet.loading ? '...' : formatMoney(seed)}
            </span>
            <span className="text-zinc-700">|</span>
            <span className="text-[10px] text-zinc-500">손익</span>
            <span className="text-emerald-400 font-mono text-xs font-bold">+{formatMoney(260000)}</span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500">초기</span>
              <span className="text-zinc-300 font-mono">{formatMoney(10000)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 inline-flex items-center gap-0.5">
                마틴
                {beginnerMode && <HelpTooltip termId="martin" />}
              </span>
              <span className="text-amber-400 font-mono font-medium">2/8</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500">다음</span>
              <span className="text-white font-mono font-medium">{formatMoney(20000)}</span>
            </div>
          </div>
        </div>

        {/* Gauge + controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 xl:gap-4 shrink-0">
          <div className="w-full sm:w-[280px] xl:w-[300px] flex flex-col gap-1">
            <div className="flex justify-between text-[10px] leading-none">
              <span className="text-red-400 font-mono inline-flex items-center gap-0.5">
                <Lock size={9} />
                -{formatMoney(2000000)}
                {beginnerMode && <HelpTooltip termId="losscut" />}
              </span>
              <span className="text-emerald-400 font-mono">+{formatMoney(260000)}</span>
              <span className="text-blue-400 font-mono inline-flex items-center gap-0.5">
                +{formatMoney(1000000)}
                {beginnerMode && <HelpTooltip termId="wincut" />}
              </span>
            </div>
            <div className="h-1.5 w-full bg-zinc-800 rounded-full relative overflow-hidden">
              <div className="absolute left-[66.6%] top-0 bottom-0 w-px bg-zinc-600 z-10" />
              <div
                className="absolute h-full bg-emerald-500 rounded-full"
                style={{ left: '66.6%', width: '8.6%' }}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onStartSession}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors"
            >
              <Play size={14} fill="currentColor" />
              세션 시작
            </button>
            <button
              className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
              onClick={() => playSfx('sessionPause')}
              aria-label="일시정지"
            >
              <Pause size={16} />
            </button>
            <button
              className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
              onClick={() => playSfx('sessionStop')}
              aria-label="중지"
            >
              <Square size={16} />
            </button>
            <button
              className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
              onClick={() => playSfx('ui')}
              aria-label="세션 설정"
            >
              <Settings2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
