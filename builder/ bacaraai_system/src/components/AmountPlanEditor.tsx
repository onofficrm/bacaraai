import { useState } from 'react';
import { playSfx } from '../audio/sfxEngine';
import type { AmountProgressMode } from '../types';
import {
  formatMoney,
  formatMoneyInput,
  nextBetAmount,
  parseMoneyInput,
} from '../hooks/useSession';

const CHIP_PRESETS = [1000, 5000, 10000, 50000, 100000, 500000];
const MIN_CUSTOM_STEPS = 1;
const MAX_CUSTOM_STEPS = 20;

export type AmountPlanValue = {
  amountMode: AmountProgressMode;
  initialBet: number;
  maxMartin: number;
  maxBet: number;
  customSteps: number[];
};

type Props = {
  value: AmountPlanValue;
  onChange: (next: AmountPlanValue) => void;
  /** 초기 베팅액 입력 표시 (공통 설정에서는 바깥 MoneyInput 쓸 때 false) */
  showInitialBet?: boolean;
  compact?: boolean;
};

function buildCustomSteps(
  prev: AmountPlanValue,
  length: number,
): number[] {
  const n = Math.max(MIN_CUSTOM_STEPS, Math.min(MAX_CUSTOM_STEPS, length));
  return Array.from({ length: n }, (_, i) => {
    if (prev.customSteps[i] != null) {
      return Math.min(Math.max(0, prev.customSteps[i]!), prev.maxBet);
    }
    if (i > 0) {
      const prevAmt = prev.customSteps[i - 1];
      if (prevAmt != null && prevAmt > 0) {
        return Math.min(prevAmt * 2, prev.maxBet);
      }
    }
    return nextBetAmount(prev.initialBet, i + 1, prev.maxBet);
  });
}

export default function AmountPlanEditor({
  value,
  onChange,
  showInitialBet = true,
  compact = false,
}: Props) {
  const [editStage, setEditStage] = useState(1);

  const patch = (partial: Partial<AmountPlanValue>) => {
    onChange({ ...value, ...partial });
  };

  const setAmountMode = (amountMode: AmountProgressMode) => {
    playSfx('ui');
    if (amountMode !== 'custom') {
      patch({ amountMode });
      return;
    }
    const len =
      value.customSteps.length > 0
        ? Math.min(MAX_CUSTOM_STEPS, Math.max(value.customSteps.length, value.maxMartin))
        : 6;
    patch({
      amountMode,
      maxMartin: len,
      customSteps: buildCustomSteps({ ...value, maxMartin: len }, len),
    });
    setEditStage(1);
  };

  const setStepCount = (n: number) => {
    const steps = buildCustomSteps(value, n);
    patch({
      maxMartin: Math.max(MIN_CUSTOM_STEPS, Math.min(MAX_CUSTOM_STEPS, n)),
      customSteps: steps,
      amountMode: 'custom',
    });
  };

  const setStepAmount = (stage: number, amount: number) => {
    const steps = [...value.customSteps];
    while (steps.length < value.maxMartin) {
      steps.push(nextBetAmount(value.initialBet, steps.length + 1, value.maxBet));
    }
    steps[stage - 1] = Math.min(Math.max(0, amount), value.maxBet);
    patch({ customSteps: steps, amountMode: 'custom' });
  };

  const addChipToStage = (chip: number) => {
    playSfx('ui');
    const cur =
      value.customSteps[editStage - 1] ??
      nextBetAmount(value.initialBet, editStage, value.maxBet);
    setStepAmount(editStage, cur + chip);
  };

  const clearStageAmount = () => {
    playSfx('ui');
    setStepAmount(editStage, 0);
  };

  const doubleFromPrev = () => {
    playSfx('ui');
    const base =
      editStage <= 1
        ? value.initialBet
        : value.customSteps[editStage - 2] || value.initialBet;
    setStepAmount(editStage, Math.min(base * 2, value.maxBet));
  };

  const fillMartinLadder = () => {
    playSfx('ui');
    const steps = Array.from({ length: value.maxMartin }, (_, i) =>
      nextBetAmount(value.initialBet, i + 1, value.maxBet),
    );
    patch({ customSteps: steps, amountMode: 'custom' });
  };

  return (
    <div className={`flex flex-col ${compact ? 'gap-2' : 'gap-3'}`}>
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => setAmountMode('martin')}
          className={`py-2.5 rounded-lg border text-xs font-bold ${
            value.amountMode === 'martin'
              ? 'bg-amber-500/20 border-amber-400 text-amber-200'
              : 'bg-zinc-950 border-zinc-700 text-zinc-400'
          }`}
        >
          마틴 (2배씩)
        </button>
        <button
          type="button"
          onClick={() => setAmountMode('custom')}
          className={`py-2.5 rounded-lg border text-xs font-bold ${
            value.amountMode === 'custom'
              ? 'bg-amber-500/20 border-amber-400 text-amber-200'
              : 'bg-zinc-950 border-zinc-700 text-zinc-400'
          }`}
        >
          단계별 직접 설정
        </button>
      </div>

      {showInitialBet && (
        <div>
          <label className="text-[10px] font-bold text-zinc-500">초기 베팅액</label>
          <input
            type="text"
            inputMode="numeric"
            value={formatMoneyInput(value.initialBet)}
            onChange={(e) =>
              patch({ initialBet: Math.max(1000, parseMoneyInput(e.target.value)) })
            }
            className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-2 text-sm font-mono text-zinc-100 outline-none focus:border-amber-500/50"
          />
        </div>
      )}

      {value.amountMode === 'martin' && (
        <div>
          <label className="text-[10px] font-bold text-zinc-500">최대 마틴 단계</label>
          <input
            type="number"
            min={1}
            max={20}
            value={value.maxMartin}
            onChange={(e) =>
              patch({
                maxMartin: Math.max(1, Math.min(20, Number(e.target.value) || 1)),
              })
            }
            className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-2 text-sm font-mono text-zinc-100 outline-none"
          />
        </div>
      )}

      {value.amountMode === 'custom' && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] text-zinc-500">
              단계마다 금액을 직접 입력하거나, 선택한 단계에 칩을 더하세요.
            </p>
            <span className="text-[10px] font-mono text-zinc-500 shrink-0">
              {value.maxMartin}/{MAX_CUSTOM_STEPS}단
            </span>
          </div>

          <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto custom-scrollbar">
            {Array.from({ length: value.maxMartin }, (_, i) => {
              const stage = i + 1;
              const amt =
                value.customSteps[i] ??
                nextBetAmount(value.initialBet, stage, value.maxBet);
              const active = editStage === stage;
              return (
                <div
                  key={stage}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    playSfx('ui');
                    setEditStage(stage);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setEditStage(stage);
                    }
                  }}
                  className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left cursor-pointer ${
                    active
                      ? 'border-amber-400 bg-amber-500/15'
                      : 'border-zinc-800 bg-zinc-900/60'
                  }`}
                >
                  <span
                    className={`w-10 shrink-0 text-[11px] font-bold ${
                      active ? 'text-amber-200' : 'text-zinc-500'
                    }`}
                  >
                    {stage}단
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatMoneyInput(amt)}
                    onFocus={() => setEditStage(stage)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      setEditStage(stage);
                      setStepAmount(stage, parseMoneyInput(e.target.value));
                    }}
                    className={`flex-1 min-w-0 bg-transparent border-0 outline-none font-mono text-sm ${
                      active ? 'text-amber-100' : 'text-zinc-200'
                    }`}
                  />
                  <span className="text-[10px] text-zinc-600 shrink-0">원</span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={value.maxMartin >= MAX_CUSTOM_STEPS}
              onClick={() => {
                playSfx('ui');
                setStepCount(value.maxMartin + 1);
                setEditStage(value.maxMartin + 1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-[11px] font-bold text-amber-200 disabled:opacity-40"
            >
              + 단계 추가
            </button>
            <button
              type="button"
              disabled={value.maxMartin <= MIN_CUSTOM_STEPS}
              onClick={() => {
                playSfx('ui');
                setStepCount(value.maxMartin - 1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-zinc-700 text-[11px] font-bold text-zinc-300 disabled:opacity-40"
            >
              마지막 단 삭제
            </button>
            <button
              type="button"
              onClick={fillMartinLadder}
              className="px-2.5 py-1.5 rounded-lg border border-zinc-700 text-[11px] font-bold text-zinc-400"
            >
              2배 채우기
            </button>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-2 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold text-zinc-300">{editStage}단에 더하기</p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={doubleFromPrev}
                  className="px-2 py-1 rounded border border-zinc-700 text-[10px] font-bold text-zinc-300"
                >
                  {editStage <= 1 ? '초기×2' : '이전×2'}
                </button>
                <button
                  type="button"
                  onClick={clearStageAmount}
                  className="px-2 py-1 rounded border border-zinc-700 text-[10px] font-bold text-zinc-400"
                >
                  지우기
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CHIP_PRESETS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => addChipToStage(v)}
                  className="px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-zinc-950 text-[11px] font-bold text-zinc-200"
                >
                  +{formatMoney(v)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
