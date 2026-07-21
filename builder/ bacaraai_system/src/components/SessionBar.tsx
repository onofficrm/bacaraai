import { Lock, Play, Pause, Square, Settings2 } from 'lucide-react';
import HelpTooltip from './HelpTooltip';
import { playSfx } from '../audio/sfxEngine';
import type { SessionConfig } from '../types';
import {
  computeGauge,
  formatMoney,
  nextBetAmount,
  type SessionStatus,
} from '../hooks/useSession';

interface SessionBarProps {
  onOpenSettings: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  beginnerMode?: boolean;
  status: SessionStatus;
  config: SessionConfig;
  pnl: number;
  martinStage: number;
}

export default function SessionBar({
  onOpenSettings,
  onPause,
  onResume,
  onStop,
  beginnerMode = true,
  status,
  config,
  pnl,
  martinStage,
}: SessionBarProps) {
  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isActive = isRunning || isPaused;
  const stage = Math.min(Math.max(1, martinStage), config.maxMartin);
  const nextBet = nextBetAmount(config.initialBet, stage, config.maxBet);
  const gauge = computeGauge(pnl, config.lossCut, config.winCut);
  const pnlColor =
    pnl > 0 ? 'text-emerald-400' : pnl < 0 ? 'text-rose-400' : 'text-zinc-300';
  const fillColor =
    pnl >= 0 ? 'bg-emerald-500' : 'bg-rose-500';

  const zoneText =
    gauge.zone === 'hit_win'
      ? '윈컷 도달 — 오토베팅 종료를 권장합니다'
      : gauge.zone === 'hit_loss'
        ? '로스컷 도달 — 즉시 중단하세요'
        : gauge.zone === 'near_win'
          ? '목표에 근접했습니다'
          : gauge.zone === 'near_loss'
            ? '손실 한도에 근접했습니다'
            : '현재 안전 구간입니다';

  return (
    <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2">
      <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3 w-full">
        <div className="flex items-center gap-1.5 shrink-0">
          {!isActive ? (
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 px-3.5 py-2 rounded-lg font-bold text-sm transition-colors"
            >
              <Play size={14} fill="currentColor" />
              오토베팅 시작
            </button>
          ) : isPaused ? (
            <button
              type="button"
              onClick={() => {
                playSfx('sessionStart');
                onResume();
              }}
              className="flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 px-3.5 py-2 rounded-lg font-bold text-sm transition-colors"
            >
              <Play size={14} fill="currentColor" />
              재개
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                playSfx('sessionPause');
                onPause();
              }}
              className="flex items-center justify-center gap-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 px-3.5 py-2 rounded-lg font-bold text-sm transition-colors"
            >
              <Pause size={14} />
              일시정지
            </button>
          )}

          <button
            type="button"
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors disabled:opacity-40"
            onClick={() => {
              if (!isActive) return;
              playSfx('sessionPause');
              if (isRunning) onPause();
              else onResume();
            }}
            disabled={!isActive}
            aria-label={isPaused ? '재개' : '일시정지'}
          >
            {isPaused ? <Play size={15} /> : <Pause size={15} />}
          </button>
          <button
            type="button"
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors disabled:opacity-40"
            onClick={() => {
              if (!isActive) return;
              playSfx('sessionStop');
              onStop();
            }}
            disabled={!isActive}
            aria-label="중지"
          >
            <Square size={15} />
          </button>
          <button
            type="button"
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
            onClick={() => {
              playSfx('ui');
              onOpenSettings();
            }}
            aria-label="오토베팅 설정"
          >
            <Settings2 size={15} />
          </button>
        </div>

        <div className="h-7 w-px bg-zinc-800 hidden lg:block shrink-0" />

        <div className="flex items-center gap-3 text-[11px] whitespace-nowrap shrink-0 overflow-x-auto">
          <span className="text-zinc-500 inline-flex items-center">
            {beginnerMode ? '단계' : '마틴'}
            <span className="text-amber-400 font-mono font-bold ml-1">
              {stage}/{config.maxMartin}
            </span>
          </span>
          <span className="text-zinc-500">
            다음
            <span className="text-zinc-200 font-mono ml-1">{formatMoney(nextBet)}</span>
          </span>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950/90 px-2.5 py-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2.5 w-full">
            <div className="shrink-0">
              <div className="text-[9px] text-zinc-500 inline-flex items-center gap-1 mb-0.5">
                <Lock size={8} className="text-red-400/80" />
                {beginnerMode ? '손실 한도' : '로스컷'}
                {beginnerMode && <HelpTooltip termId="losscut" />}
              </div>
              <div className="text-xs font-mono font-bold text-red-400 tabular-nums leading-none">
                {formatMoney(config.lossCut, true)}
              </div>
              <div className="text-[9px] text-zinc-500 font-mono mt-1 tabular-nums">
                중단까지 {formatMoney(gauge.toLossCut)}
              </div>
            </div>

            <div className="flex-1 min-w-[120px] flex flex-col gap-1 px-1">
              <div className="text-center">
                <span className="text-[9px] text-zinc-500 mr-1">현재 손익</span>
                <span className={`text-xs font-mono font-bold tabular-nums ${pnlColor}`}>
                  {formatMoney(pnl, true)}
                </span>
              </div>
              <div className="h-2 w-full bg-zinc-800 rounded-full relative overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-zinc-500 z-10"
                  style={{ left: `${gauge.zeroAt}%` }}
                  title="손익 0"
                />
                <div
                  className={`absolute h-full rounded-full ${fillColor}`}
                  style={{ left: `${gauge.fillLeft}%`, width: `${Math.max(0.5, gauge.fillWidth)}%` }}
                />
              </div>
              {beginnerMode && (
                <p
                  className={`text-center text-[9px] leading-none ${
                    gauge.zone === 'hit_loss' || gauge.zone === 'near_loss'
                      ? 'text-rose-400/90'
                      : gauge.zone === 'hit_win' || gauge.zone === 'near_win'
                        ? 'text-blue-400/90'
                        : 'text-teal-400/90'
                  }`}
                >
                  {isActive ? zoneText : '오토베팅을 켜면 손익 게이지가 활성화됩니다'}
                </p>
              )}
            </div>

            <div className="shrink-0 text-right">
              <div className="text-[9px] text-zinc-500 inline-flex items-center justify-end gap-1 mb-0.5 w-full">
                {beginnerMode ? '수익 목표' : '윈컷'}
                {beginnerMode && <HelpTooltip termId="wincut" />}
              </div>
              <div className="text-xs font-mono font-bold text-blue-400 tabular-nums leading-none">
                {formatMoney(config.winCut, true)}
              </div>
              <div className="text-[9px] text-zinc-500 font-mono mt-1 tabular-nums">
                목표까지 {formatMoney(gauge.toWinCut)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
