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

  // Demo: lossCut -2M, winCut +1M, current +260k → zero at 2/3
  const zeroAt = 66.6;
  const fillWidth = 8.6;

  return (
    <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3">
      {/* One cohesive strip — no ultrawide dead zone / stretched gauge */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Funds block */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 flex flex-col gap-1.5 min-w-[200px]">
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="text-zinc-500 inline-flex items-center gap-0.5">
              시드
              {beginnerMode && <HelpTooltip termId="seed" />}
            </span>
            <span className="text-zinc-200 font-mono">{wallet.loading ? '...' : formatMoney(seed)}</span>
            <span className="text-zinc-700">·</span>
            <span className="text-zinc-500">자금</span>
            <span className="text-white font-mono font-medium">{wallet.loading ? '...' : formatMoney(seed)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500">손익</span>
            <span className="text-emerald-400 font-mono font-bold text-sm">+{formatMoney(260000)}</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-zinc-400 pt-0.5 border-t border-zinc-800/80">
            <span>초기 <span className="text-zinc-300 font-mono">{formatMoney(10000)}</span></span>
            <span className="inline-flex items-center gap-0.5">
              마틴
              {beginnerMode && <HelpTooltip termId="martin" />}
              <span className="text-amber-400 font-mono font-medium ml-0.5">2/8</span>
            </span>
            <span>다음 <span className="text-zinc-200 font-mono">{formatMoney(20000)}</span></span>
          </div>
        </div>

        {/* Cut gauge — fixed readable width, never stretches across the monitor */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 w-full max-w-[420px] sm:w-[420px] flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2 items-end">
            <div>
              <div className="text-[10px] text-zinc-500 mb-1 inline-flex items-center gap-1">
                <Lock size={10} className="text-red-400/80" />
                로스컷
                {beginnerMode && <HelpTooltip termId="losscut" />}
              </div>
              <div className="text-sm font-mono font-bold text-red-400 leading-none tabular-nums">
                -{formatMoney(2000000)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-zinc-500 mb-1">현재</div>
              <div className="text-base font-mono font-bold text-emerald-400 leading-none tabular-nums">
                +{formatMoney(260000)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-zinc-500 mb-1 inline-flex items-center justify-end gap-1 w-full">
                윈컷
                {beginnerMode && <HelpTooltip termId="wincut" />}
              </div>
              <div className="text-sm font-mono font-bold text-blue-400 leading-none tabular-nums">
                +{formatMoney(1000000)}
              </div>
            </div>
          </div>

          <div className="h-2.5 w-full bg-zinc-800 rounded-full relative overflow-hidden">
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-zinc-500 z-10"
              style={{ left: `${zeroAt}%` }}
              title="손익 0"
            />
            <div
              className="absolute h-full bg-emerald-500 rounded-full"
              style={{ left: `${zeroAt}%`, width: `${fillWidth}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-zinc-500 font-mono tabular-nums">
            <span>여유 {formatMoney(2260000)}</span>
            <span>목표까지 {formatMoney(740000)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={onStartSession}
            className="flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors"
          >
            <Play size={15} fill="currentColor" />
            세션 시작
          </button>
          <button
            className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors"
            onClick={() => playSfx('sessionPause')}
            aria-label="일시정지"
          >
            <Pause size={16} />
          </button>
          <button
            className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors"
            onClick={() => playSfx('sessionStop')}
            aria-label="중지"
          >
            <Square size={16} />
          </button>
          <button
            className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors"
            onClick={() => playSfx('ui')}
            aria-label="세션 설정"
          >
            <Settings2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
