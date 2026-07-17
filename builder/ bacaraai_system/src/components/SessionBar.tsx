import { Lock, Play, Pause, Square, Settings2 } from 'lucide-react';
import HelpTooltip from './HelpTooltip';
import { playSfx } from '../audio/sfxEngine';

interface SessionBarProps {
  onStartSession: () => void;
  beginnerMode?: boolean;
}

export default function SessionBar({
  onStartSession,
  beginnerMode = true,
}: SessionBarProps) {
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const zeroAt = 66.6;
  const fillWidth = 8.6;

  return (
    <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2">
      <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3 w-full">
        {/* Session controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onStartSession}
            className="flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 px-3.5 py-2 rounded-lg font-bold text-sm transition-colors"
          >
            <Play size={14} fill="currentColor" />
            세션 시작
          </button>
          <button
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
            onClick={() => playSfx('sessionPause')}
            aria-label="일시정지"
          >
            <Pause size={15} />
          </button>
          <button
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
            onClick={() => playSfx('sessionStop')}
            aria-label="중지"
          >
            <Square size={15} />
          </button>
          <button
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
            onClick={() => playSfx('ui')}
            aria-label="세션 설정"
          >
            <Settings2 size={15} />
          </button>
        </div>

        <div className="h-7 w-px bg-zinc-800 hidden lg:block shrink-0" />

        {/* Compact session summary */}
        <div className="flex items-center gap-3 text-[11px] whitespace-nowrap shrink-0 overflow-x-auto">
          <span className="text-zinc-500 inline-flex items-center">
            {beginnerMode ? '단계' : '마틴'}
            <span className="text-amber-400 font-mono font-bold ml-1">2/8</span>
          </span>
          <span className="text-zinc-500">
            다음
            <span className="text-zinc-200 font-mono ml-1">{formatMoney(20000)}</span>
          </span>
        </div>

        {/* Compact cut gauge */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/90 px-2.5 py-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2.5 w-full">
            <div className="shrink-0">
              <div className="text-[9px] text-zinc-500 inline-flex items-center gap-1 mb-0.5">
                <Lock size={8} className="text-red-400/80" />
                {beginnerMode ? '손실 한도' : '로스컷'}
                {beginnerMode && <HelpTooltip termId="losscut" />}
              </div>
              <div className="text-xs font-mono font-bold text-red-400 tabular-nums leading-none">
                -{formatMoney(2000000)}
              </div>
              <div className="text-[9px] text-zinc-500 font-mono mt-1 tabular-nums">
                중단까지 {formatMoney(2260000)}
              </div>
            </div>

            <div className="flex-1 min-w-[120px] flex flex-col gap-1 px-1">
              <div className="text-center">
                <span className="text-[9px] text-zinc-500 mr-1">현재 손익</span>
                <span className="text-xs font-mono font-bold text-emerald-400 tabular-nums">
                  +{formatMoney(260000)}
                </span>
              </div>
              <div className="h-2 w-full bg-zinc-800 rounded-full relative overflow-hidden">
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
              {beginnerMode && (
                <p className="text-center text-[9px] leading-none text-teal-400/90">
                  현재 안전 구간입니다
                </p>
              )}
            </div>

            <div className="shrink-0 text-right">
              <div className="text-[9px] text-zinc-500 inline-flex items-center justify-end gap-1 mb-0.5 w-full">
                {beginnerMode ? '수익 목표' : '윈컷'}
                {beginnerMode && <HelpTooltip termId="wincut" />}
              </div>
              <div className="text-xs font-mono font-bold text-blue-400 tabular-nums leading-none">
                +{formatMoney(1000000)}
              </div>
              <div className="text-[9px] text-zinc-500 font-mono mt-1 tabular-nums">
                목표까지 {formatMoney(740000)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
