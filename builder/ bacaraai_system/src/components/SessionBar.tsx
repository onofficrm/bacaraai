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

  // Demo: lossCut -2M, winCut +1M, current +260k → zero at 2/3, fill into win side
  const zeroAt = 66.6;
  const fillWidth = 8.6;

  return (
    <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3">
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

        {/* Cut status card + controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 xl:gap-4 shrink-0">
          <div className="w-full sm:w-[340px] xl:w-[380px] rounded-xl border border-zinc-800 bg-zinc-950/80 px-3.5 py-2.5 flex flex-col gap-2">
            <div className="flex justify-between items-end gap-2">
              <div className="min-w-0">
                <div className="text-[10px] text-zinc-500 mb-0.5 inline-flex items-center gap-1">
                  <Lock size={10} className="text-red-400/80" />
                  로스컷
                  {beginnerMode && <HelpTooltip termId="losscut" />}
                </div>
                <div className="text-sm font-mono font-bold text-red-400 leading-none">
                  -{formatMoney(2000000)}
                </div>
              </div>
              <div className="text-center min-w-0">
                <div className="text-[10px] text-zinc-500 mb-0.5">현재 손익</div>
                <div className="text-base font-mono font-bold text-emerald-400 leading-none">
                  +{formatMoney(260000)}
                </div>
              </div>
              <div className="text-right min-w-0">
                <div className="text-[10px] text-zinc-500 mb-0.5 inline-flex items-center justify-end gap-1 w-full">
                  윈컷
                  {beginnerMode && <HelpTooltip termId="wincut" />}
                </div>
                <div className="text-sm font-mono font-bold text-blue-400 leading-none">
                  +{formatMoney(1000000)}
                </div>
              </div>
            </div>

            <div className="h-2.5 w-full bg-zinc-800/90 rounded-full relative overflow-hidden border border-zinc-700/50">
              {/* zero baseline */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-zinc-500 z-10"
                style={{ left: `${zeroAt}%` }}
                title="손익 0"
              />
              <div
                className="absolute h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                style={{ left: `${zeroAt}%`, width: `${fillWidth}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>여유 {formatMoney(2260000)}</span>
              <span className="text-zinc-600">0</span>
              <span>목표까지 {formatMoney(740000)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-center sm:self-auto">
            <button
              onClick={onStartSession}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 px-3.5 py-2 rounded-lg font-bold text-xs transition-colors"
            >
              <Play size={14} fill="currentColor" />
              세션 시작
            </button>
            <button
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
              onClick={() => playSfx('sessionPause')}
              aria-label="일시정지"
            >
              <Pause size={16} />
            </button>
            <button
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
              onClick={() => playSfx('sessionStop')}
              aria-label="중지"
            >
              <Square size={16} />
            </button>
            <button
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
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
