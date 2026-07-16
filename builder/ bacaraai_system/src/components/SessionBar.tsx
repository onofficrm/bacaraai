import { Lock, Play, Pause, Square, Settings2 } from 'lucide-react';
import useWallet from '../hooks/useWallet';
import HelpTooltip from './HelpTooltip';
import BeginnerFlowSteps from './BeginnerFlowSteps';
import { playSfx } from '../audio/sfxEngine';

interface SessionBarProps {
  onStartSession: () => void;
  beginnerMode?: boolean;
  flowStep?: 1 | 2 | 3;
  selectedTableName?: string | null;
}

export default function SessionBar({
  onStartSession,
  beginnerMode = true,
  flowStep = 1,
  selectedTableName = null,
}: SessionBarProps) {
  const wallet = useWallet();
  const seed = wallet.loading ? 0 : wallet.balance;

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const zeroAt = 66.6;
  const fillWidth = 8.6;

  return (
    <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2.5">
      <div className="flex flex-col gap-2 w-full">
        {beginnerMode && (
          <BeginnerFlowSteps step={flowStep} tableName={selectedTableName} />
        )}

        {/* Row 1: controls + funds */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 w-full">
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

          <div className="h-7 w-px bg-zinc-800 hidden sm:block shrink-0" />

          <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-xs min-w-0">
            <span className="text-zinc-500 inline-flex items-center gap-0.5">
              {beginnerMode ? '연습 자금(시드)' : '시드'}
              {beginnerMode && <HelpTooltip termId="seed" />}
              <span className="text-zinc-200 font-mono ml-1">{wallet.loading ? '...' : formatMoney(seed)}</span>
            </span>
            <span className="text-zinc-500">
              자금
              <span className="text-white font-mono font-medium ml-1">{wallet.loading ? '...' : formatMoney(seed)}</span>
            </span>
            <span className="text-zinc-500">
              손익
              <span className="text-emerald-400 font-mono font-bold ml-1">+{formatMoney(260000)}</span>
            </span>
            <span className="text-zinc-800 hidden md:inline">|</span>
            <span className="text-zinc-500">
              초기 <span className="text-zinc-300 font-mono">{formatMoney(10000)}</span>
            </span>
            <span className="text-zinc-500 inline-flex items-center gap-0.5">
              {beginnerMode ? '금액 단계(마틴)' : '마틴'}
              {beginnerMode && <HelpTooltip termId="martin" />}
              <span className="text-amber-400 font-mono font-medium ml-1">2/8</span>
            </span>
            <span className="text-zinc-500">
              다음 <span className="text-zinc-200 font-mono">{formatMoney(20000)}</span>
            </span>
          </div>
        </div>

        {/* Row 2: full-width cut gauge */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/90 px-3 py-2 w-full">
          <div className="flex items-center gap-3 sm:gap-5 w-full">
            <div className="shrink-0">
              <div className="text-[10px] text-zinc-500 inline-flex items-center gap-1 mb-0.5">
                <Lock size={9} className="text-red-400/80" />
                {beginnerMode ? '손실 한도(로스컷)' : '로스컷'}
                {beginnerMode && <HelpTooltip termId="losscut" />}
              </div>
              <div className="text-sm font-mono font-bold text-red-400 tabular-nums leading-none">
                -{formatMoney(2000000)}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono mt-1 tabular-nums">
                중단까지 {formatMoney(2260000)}
              </div>
            </div>

            <div className="flex-1 min-w-0 flex flex-col gap-1.5 px-1">
              <div className="flex justify-center">
                <div className="text-center">
                  <div className="text-[10px] text-zinc-500 leading-none mb-0.5">현재 손익</div>
                  <div className="text-base font-mono font-bold text-emerald-400 tabular-nums leading-none">
                    +{formatMoney(260000)}
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
              {beginnerMode && (
                <p className="text-center text-[11px] text-teal-400/90">현재 안전 구간입니다</p>
              )}
            </div>

            <div className="shrink-0 text-right">
              <div className="text-[10px] text-zinc-500 inline-flex items-center justify-end gap-1 mb-0.5 w-full">
                {beginnerMode ? '수익 목표(윈컷)' : '윈컷'}
                {beginnerMode && <HelpTooltip termId="wincut" />}
              </div>
              <div className="text-sm font-mono font-bold text-blue-400 tabular-nums leading-none">
                +{formatMoney(1000000)}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono mt-1 tabular-nums">
                목표까지 {formatMoney(740000)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
