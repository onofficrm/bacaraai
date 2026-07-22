import { useEffect, useMemo, useState } from 'react';
import { X, Calculator, Info } from 'lucide-react';
import { playSfx } from '../audio/sfxEngine';
import type { AmountProgressMode, AutoBetStrategy, SessionConfig } from '../types';
import {
  DEFAULT_SESSION_CONFIG,
  formatMoney,
  formatMoneyInput,
  martinRequiredCapital,
  nextBetAmount,
  parseMoneyInput,
  strategyLabel,
  type BetSide,
  type SessionMode,
} from '../hooks/useSession';
import PatternSequenceBuilder from './PatternSequenceBuilder';
import { formatPattern, normalizePatternSegments, patternSideLabel, patternTotalGames } from '../utils/patternMatch';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConfig?: SessionConfig;
  onStart: (mode: SessionMode, config: SessionConfig) => void;
}

const CHIP_PRESETS = [1000, 5000, 10000, 50000, 100000, 500000];
const MIN_CUSTOM_STEPS = 1;
const DEFAULT_CUSTOM_STEPS = 6;
const MAX_CUSTOM_STEPS = 20;

function buildCustomSteps(
  prev: SessionConfig,
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

export default function SessionModal({
  isOpen,
  onClose,
  initialConfig = DEFAULT_SESSION_CONFIG,
  onStart,
}: SessionModalProps) {
  const [config, setConfig] = useState<SessionConfig>(initialConfig);
  const [editStage, setEditStage] = useState(1);

  useEffect(() => {
    if (isOpen) {
      const merged = { ...DEFAULT_SESSION_CONFIG, ...initialConfig };
      const patternSegments =
        merged.patternSegments?.length
          ? merged.patternSegments
          : normalizePatternSegments(merged);
      setConfig({ ...merged, patternSegments });
      setEditStage(1);
    }
  }, [isOpen, initialConfig]);

  const summary = useMemo(() => {
    const targetSeed = config.seed + config.winCut;
    const stopSeed = config.seed + config.lossCut;
    const martinNeed = martinRequiredCapital(config.initialBet, config.maxMartin);
    const customNeed = config.customSteps.reduce((a, b) => a + b, 0);
    const needCapital =
      config.amountMode === 'custom' && customNeed > 0 ? customNeed : martinNeed;
    const canDefend = config.seed >= needCapital;
    const patternOk =
      config.strategy !== 'pattern' || patternTotalGames(config.patternSegments || []) >= 2;
    return { targetSeed, stopSeed, martinNeed, needCapital, canDefend, patternOk };
  }, [config]);

  if (!isOpen) return null;

  const start = (mode: SessionMode) => {
    if (mode === 'live' && !summary.patternOk) return;
    playSfx('sessionStart');
    if (mode === 'shadow') window.setTimeout(() => playSfx('shuffle'), 280);
    onStart(mode, config);
    onClose();
  };

  const setNum = (key: keyof SessionConfig, value: number) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const setStrategy = (strategy: AutoBetStrategy) => {
    playSfx('ui');
    setConfig((prev) => ({ ...prev, strategy }));
  };

  const setAmountMode = (amountMode: AmountProgressMode) => {
    playSfx('ui');
    if (amountMode !== 'custom') {
      setConfig((prev) => ({ ...prev, amountMode }));
      return;
    }
    setConfig((prev) => {
      const len =
        prev.customSteps.length > 0
          ? Math.min(MAX_CUSTOM_STEPS, Math.max(prev.customSteps.length, prev.maxMartin))
          : DEFAULT_CUSTOM_STEPS;
      const steps = buildCustomSteps({ ...prev, maxMartin: len }, len);
      return { ...prev, amountMode, maxMartin: len, customSteps: steps };
    });
    setEditStage(1);
  };

  const setBetSide = (side: BetSide) => {
    playSfx('ui');
    setConfig((prev) => ({ ...prev, patternBetSide: side }));
  };

  const setStepCount = (count: number) => {
    const n = Math.max(MIN_CUSTOM_STEPS, Math.min(MAX_CUSTOM_STEPS, count));
    setConfig((prev) => ({
      ...prev,
      maxMartin: n,
      customSteps: buildCustomSteps(prev, n),
      amountMode: 'custom',
    }));
    setEditStage((s) => Math.min(s, n));
  };

  const setStepAmount = (stage: number, amount: number) => {
    setConfig((prev) => {
      const steps = buildCustomSteps(prev, prev.maxMartin);
      steps[stage - 1] = Math.min(Math.max(0, amount), prev.maxBet);
      return { ...prev, customSteps: steps, amountMode: 'custom' };
    });
  };

  const addChipToStage = (chip: number) => {
    playSfx('chip');
    setConfig((prev) => {
      const steps = buildCustomSteps(prev, prev.maxMartin);
      const cur = steps[editStage - 1] ?? 0;
      steps[editStage - 1] = Math.min(cur + chip, prev.maxBet);
      return { ...prev, customSteps: steps, amountMode: 'custom' };
    });
  };

  const clearStageAmount = () => {
    playSfx('ui');
    setStepAmount(editStage, 0);
  };

  const doubleFromPrev = () => {
    playSfx('chip');
    setConfig((prev) => {
      const steps = buildCustomSteps(prev, prev.maxMartin);
      const base =
        editStage <= 1
          ? prev.initialBet
          : steps[editStage - 2] || prev.initialBet;
      steps[editStage - 1] = Math.min(base * 2, prev.maxBet);
      return { ...prev, customSteps: steps, amountMode: 'custom' };
    });
  };

  const fillMartinLadder = () => {
    playSfx('ui');
    setConfig((prev) => {
      const steps = Array.from({ length: prev.maxMartin }, (_, i) =>
        nextBetAmount(prev.initialBet, i + 1, prev.maxBet),
      );
      return { ...prev, customSteps: steps, amountMode: 'custom' };
    });
  };

  const liveLabel =
    config.strategy === 'pattern'
      ? '오토베팅 시작 (내 패턴으로)'
      : '오토베팅 시작 (AI 추천으로)';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-settings-title"
      >
        <div className="flex-1 p-6 lg:p-8 overflow-y-auto max-h-[90vh]">
          <div className="flex justify-between items-center mb-6">
            <h2 id="session-settings-title" className="text-xl font-bold text-white flex items-center gap-2">
              <SettingsIcon />
              오토베팅 설정
            </h2>
            <button
              type="button"
              onClick={() => {
                playSfx('ui');
                onClose();
              }}
              className="md:hidden text-zinc-400 hover:text-white"
              aria-label="닫기"
            >
              <X size={24} />
            </button>
          </div>

          {/* Strategy */}
          <div className="mb-6">
            <p className="text-xs font-bold text-zinc-400 mb-2">① 언제 베팅할까요?</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setStrategy('ai')}
                className={`py-3 rounded-xl border-2 text-sm font-bold transition-colors ${
                  config.strategy === 'ai'
                    ? 'bg-indigo-600 border-indigo-400 text-white'
                    : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                }`}
              >
                AI 추천대로
                <span className="block text-[10px] font-medium opacity-80 mt-0.5">AI가 말한 테이블·사이드</span>
              </button>
              <button
                type="button"
                onClick={() => setStrategy('pattern')}
                className={`py-3 rounded-xl border-2 text-sm font-bold transition-colors ${
                  config.strategy === 'pattern'
                    ? 'bg-amber-500 border-amber-300 text-zinc-950'
                    : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                }`}
              >
                내가 만든 패턴
                <span className="block text-[10px] font-medium opacity-80 mt-0.5">결과 버튼을 눌러 설정</span>
              </button>
            </div>

            {config.strategy === 'pattern' && (
              <div className="flex flex-col gap-3">
                <PatternSequenceBuilder
                  segments={config.patternSegments || []}
                  onChange={(patternSegments) =>
                    setConfig((prev) => ({ ...prev, patternSegments }))
                  }
                />

                <div>
                  <p className="text-xs font-bold text-zinc-400 mb-2">
                    패턴이 나온 다음 게임에서 베팅할 곳
                  </p>
                  <div className="flex gap-2">
                    {(
                      [
                        { id: 'PLAYER' as const, label: 'Player', cls: 'bg-blue-600 border-blue-400' },
                        { id: 'TIE' as const, label: 'Tie', cls: 'bg-emerald-500 border-emerald-400' },
                        { id: 'BANKER' as const, label: 'Banker', cls: 'bg-red-500 border-red-400' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setBetSide(opt.id)}
                        className={`flex-1 min-h-[44px] rounded-xl border-2 text-sm font-bold transition-colors ${
                          config.patternBetSide === opt.id
                            ? `${opt.cls} text-white`
                            : 'bg-zinc-950 border-zinc-700 text-zinc-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {config.strategy === 'ai' && (
              <p className="text-[11px] text-zinc-500 leading-relaxed rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
                8개 테이블을 감시하다가, AI가 Player/Banker를 추천한 테이블에 자동 베팅합니다.
              </p>
            )}
          </div>

          {/* Amount progress */}
          <div className="mb-6">
            <p className="text-xs font-bold text-zinc-400 mb-2">② 금액은 어떻게 올릴까요?</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setAmountMode('martin')}
                className={`py-3 rounded-xl border-2 text-sm font-bold ${
                  config.amountMode === 'martin'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-zinc-950 border-zinc-700 text-zinc-400'
                }`}
              >
                마틴 (2배씩)
              </button>
              <button
                type="button"
                onClick={() => setAmountMode('custom')}
                className={`py-3 rounded-xl border-2 text-sm font-bold ${
                  config.amountMode === 'custom'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-zinc-950 border-zinc-700 text-zinc-400'
                }`}
              >
                단계별 직접 설정
              </button>
            </div>

            {config.amountMode === 'custom' && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] text-zinc-500">
                    단계마다 금액을 직접 입력하거나, 선택한 단계에 칩을 더하세요.
                  </p>
                  <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                    {config.maxMartin}/{MAX_CUSTOM_STEPS}단
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-0.5">
                  {Array.from({ length: config.maxMartin }, (_, i) => {
                    const stage = i + 1;
                    const amt =
                      config.customSteps[i] ??
                      nextBetAmount(config.initialBet, stage, config.maxBet);
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
                        className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors cursor-pointer ${
                          active
                            ? 'border-amber-400 bg-amber-500/15'
                            : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-600'
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
                          aria-label={`${stage}단 금액`}
                        />
                        <span className="text-[10px] text-zinc-600 shrink-0">원</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={config.maxMartin >= MAX_CUSTOM_STEPS}
                    onClick={() => {
                      playSfx('ui');
                      setStepCount(config.maxMartin + 1);
                      setEditStage(config.maxMartin + 1);
                    }}
                    className="px-3 py-2 rounded-lg border border-amber-500/40 bg-amber-500/10 text-xs font-bold text-amber-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    + 단계 추가
                  </button>
                  <button
                    type="button"
                    disabled={config.maxMartin <= MIN_CUSTOM_STEPS}
                    onClick={() => {
                      playSfx('ui');
                      setStepCount(config.maxMartin - 1);
                    }}
                    className="px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-xs font-bold text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    마지막 단 삭제
                  </button>
                  <button
                    type="button"
                    onClick={fillMartinLadder}
                    className="px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-xs font-bold text-zinc-400 hover:text-zinc-200"
                  >
                    2배 채우기
                  </button>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-2.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold text-zinc-300">
                      {editStage}단에 더하기
                    </p>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={doubleFromPrev}
                        className="px-2 py-1 rounded border border-zinc-700 text-[10px] font-bold text-zinc-300 hover:border-amber-500"
                      >
                        {editStage <= 1 ? '초기×2' : '이전×2'}
                      </button>
                      <button
                        type="button"
                        onClick={clearStageAmount}
                        className="px-2 py-1 rounded border border-zinc-700 text-[10px] font-bold text-zinc-400 hover:border-rose-500 hover:text-rose-300"
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
                        className="px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-950 text-xs font-bold text-zinc-200 hover:border-amber-500 touch-manipulation"
                      >
                        +{formatMoney(v)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <MoneyInput
              label="시작 시드 (원)"
              value={config.seed}
              onChange={(v) => setNum('seed', Math.max(0, v))}
            />
            <MoneyInput
              label="초기 베팅액 (원)"
              value={config.initialBet}
              onChange={(v) => setNum('initialBet', Math.max(1000, v))}
            />
            <MoneyInput
              label="윈컷 (목표 수익)"
              value={config.winCut}
              color="text-blue-400"
              withSign
              onChange={(v) => setNum('winCut', Math.max(0, Math.abs(v)))}
            />
            <MoneyInput
              label="로스컷 (최대 손실)"
              value={config.lossCut}
              color="text-red-400"
              withSign
              onChange={(v) => setNum('lossCut', -Math.abs(v))}
            />

            <div className="col-span-1 sm:col-span-2 border-t border-zinc-800 pt-6 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <NumberInput
                label="최대 마틴/단계"
                value={config.maxMartin}
                min={1}
                max={20}
                onChange={(v) => {
                  playSfx('ui');
                  if (config.amountMode === 'custom') {
                    setStepCount(v);
                  } else {
                    setNum('maxMartin', v);
                  }
                }}
              />
              <MoneyInput
                label="1회 최대 베팅액 (원)"
                value={config.maxBet}
                onChange={(v) => setNum('maxBet', Math.max(config.initialBet, v))}
              />
              <NumberInput
                label="감시 테이블 수 (최대 8)"
                value={config.maxTables}
                min={1}
                max={8}
                onChange={(v) => setNum('maxTables', v)}
              />
              <NumberInput
                label="최대 오토베팅 시간 (분)"
                value={config.maxTime}
                min={10}
                max={480}
                onChange={(v) => setNum('maxTime', v)}
              />
            </div>
          </div>
        </div>

        <div className="w-full md:w-80 bg-zinc-950 p-6 lg:p-8 border-l border-zinc-800 flex flex-col shrink-0">
          <div className="hidden md:flex justify-end mb-6">
            <button
              type="button"
              onClick={() => {
                playSfx('ui');
                onClose();
              }}
              className="text-zinc-500 hover:text-white transition-colors"
              aria-label="닫기"
            >
              <X size={20} />
            </button>
          </div>

          <h3 className="text-sm font-bold text-zinc-400 mb-4 flex items-center gap-2">
            <Calculator size={16} />
            설정 요약
          </h3>

          <div className="flex flex-col gap-4 text-sm flex-1">
            <SummaryRow label="전략" value={strategyLabel(config.strategy)} valueColor="text-amber-300" />
            {config.strategy === 'pattern' && (
              <>
                <SummaryRow
                  label="패턴"
                  value={formatPattern(config.patternSegments || [])}
                  valueColor="text-zinc-200"
                />
                <SummaryRow
                  label="베팅"
                  value={patternSideLabel(config.patternBetSide)}
                  valueColor="text-zinc-200"
                />
              </>
            )}
            <SummaryRow
              label="금액"
              value={config.amountMode === 'custom' ? '단계별 직접' : '마틴 2배'}
            />
            <SummaryRow
              label="목표 시드"
              value={formatMoney(summary.targetSeed)}
              valueColor="text-blue-400"
            />
            <SummaryRow
              label="강제 종료 시드"
              value={formatMoney(summary.stopSeed)}
              valueColor="text-red-400"
            />
            <SummaryRow label="감시" value={`${config.maxTables}개 테이블`} />

            <div
              className={`rounded-lg p-4 mt-2 border ${
                summary.canDefend
                  ? 'bg-amber-950/30 border-amber-900/50'
                  : 'bg-rose-950/30 border-rose-900/50'
              }`}
            >
              <div
                className={`flex items-start gap-2 mb-2 ${
                  summary.canDefend ? 'text-amber-500' : 'text-rose-400'
                }`}
              >
                <Info size={16} className="mt-0.5 shrink-0" />
                <span className="font-medium text-sm">
                  {config.maxMartin}단계 필요 자금
                </span>
              </div>
              <div
                className={`text-2xl font-mono font-bold tracking-tight ${
                  summary.canDefend ? 'text-amber-400' : 'text-rose-400'
                }`}
              >
                {new Intl.NumberFormat('ko-KR').format(summary.needCapital)}
                <span
                  className={`text-sm font-sans ml-1 ${
                    summary.canDefend ? 'text-amber-500/70' : 'text-rose-400/70'
                  }`}
                >
                  원
                </span>
              </div>
              {!summary.patternOk && (
                <p className="text-xs mt-2 text-rose-300">패턴은 최소 2게임 이상 만들어 주세요.</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-8">
            <button
              type="button"
              onClick={() => start('observe')}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
            >
              관망만 (자동 베팅 없음)
            </button>
            <button
              type="button"
              onClick={() => start('shadow')}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-colors shadow-lg shadow-indigo-600/20"
            >
              섀도 모드 (자동 베팅 없음 · 기록용)
            </button>
            <button
              type="button"
              onClick={() => start('live')}
              disabled={!summary.canDefend || !summary.patternOk}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-lg font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-amber-500"
            >
              {liveLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MoneyInput({
  label,
  value,
  onChange,
  color = 'text-white',
  withSign = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color?: string;
  withSign?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      <input
        type="text"
        inputMode="numeric"
        value={formatMoneyInput(value, withSign)}
        onChange={(e) => onChange(parseMoneyInput(e.target.value))}
        className={`bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 font-mono text-sm outline-none focus:border-amber-500 transition-colors ${color}`}
      />
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isNaN(n)) return;
          onChange(Math.max(min, Math.min(max, Math.floor(n))));
        }}
        className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 font-mono text-sm text-white outline-none focus:border-amber-500 transition-colors"
      />
    </div>
  );
}

function SummaryRow({
  label,
  value,
  valueColor = 'text-white',
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-zinc-500 shrink-0">{label}</span>
      <span className={`font-mono font-medium text-right text-xs ${valueColor}`}>{value}</span>
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-amber-500"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
