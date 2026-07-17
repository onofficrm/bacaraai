import { useEffect, useMemo, useState } from 'react';
import { X, Calculator, Info } from 'lucide-react';
import { playSfx } from '../audio/sfxEngine';
import type { SessionConfig } from '../types';
import {
  DEFAULT_SESSION_CONFIG,
  formatMoney,
  formatMoneyInput,
  martinRequiredCapital,
  parseMoneyInput,
  type SessionMode,
} from '../hooks/useSession';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConfig?: SessionConfig;
  onStart: (mode: SessionMode, config: SessionConfig) => void;
}

export default function SessionModal({
  isOpen,
  onClose,
  initialConfig = DEFAULT_SESSION_CONFIG,
  onStart,
}: SessionModalProps) {
  const [config, setConfig] = useState<SessionConfig>(initialConfig);

  useEffect(() => {
    if (isOpen) setConfig(initialConfig);
  }, [isOpen, initialConfig]);

  const summary = useMemo(() => {
    const targetSeed = config.seed + config.winCut;
    const stopSeed = config.seed + config.lossCut;
    const martinNeed = martinRequiredCapital(config.initialBet, config.maxMartin);
    const canDefend = config.seed >= martinNeed;
    return { targetSeed, stopSeed, martinNeed, canDefend };
  }, [config]);

  if (!isOpen) return null;

  const start = (mode: SessionMode) => {
    playSfx('sessionStart');
    if (mode === 'shadow') window.setTimeout(() => playSfx('shuffle'), 280);
    onStart(mode, config);
    onClose();
  };

  const setNum = (key: keyof SessionConfig, value: number) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-settings-title"
      >
        <div className="flex-1 p-6 lg:p-8 overflow-y-auto max-h-[90vh]">
          <div className="flex justify-between items-center mb-6">
            <h2 id="session-settings-title" className="text-xl font-bold text-white flex items-center gap-2">
              <SettingsIcon />
              세션 설정
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
                label="최대 마틴 단계"
                value={config.maxMartin}
                min={1}
                max={20}
                onChange={(v) => setNum('maxMartin', v)}
              />
              <MoneyInput
                label="1회 최대 베팅액 (원)"
                value={config.maxBet}
                onChange={(v) => setNum('maxBet', Math.max(config.initialBet, v))}
              />
              <NumberInput
                label="최대 동시 진행 테이블"
                value={config.maxTables}
                min={1}
                max={12}
                onChange={(v) => setNum('maxTables', v)}
              />
              <NumberInput
                label="최대 세션 시간 (분)"
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
                  마틴 {config.maxMartin}단계 필요 자금
                </span>
              </div>
              <div
                className={`text-2xl font-mono font-bold tracking-tight ${
                  summary.canDefend ? 'text-amber-400' : 'text-rose-400'
                }`}
              >
                {new Intl.NumberFormat('ko-KR').format(summary.martinNeed)}
                <span
                  className={`text-sm font-sans ml-1 ${
                    summary.canDefend ? 'text-amber-500/70' : 'text-rose-400/70'
                  }`}
                >
                  원
                </span>
              </div>
              <p
                className={`text-xs mt-2 ${
                  summary.canDefend ? 'text-amber-500/70' : 'text-rose-300/80'
                }`}
              >
                {summary.canDefend
                  ? `현재 설정된 시작 시드로 ${config.maxMartin}단계 마틴게일 방어가 가능합니다.`
                  : `시작 시드가 부족합니다. 시드를 늘리거나 마틴 단계·초기 베팅액을 낮추세요.`}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-8">
            <button
              type="button"
              onClick={() => start('observe')}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
            >
              관찰 모드로 시작
            </button>
            <button
              type="button"
              onClick={() => start('shadow')}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-colors shadow-lg shadow-indigo-600/20"
            >
              섀도 모드로 시작 (가상 시뮬레이션)
            </button>
            <button
              type="button"
              onClick={() => start('live')}
              disabled={!summary.canDefend}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-lg font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-amber-500"
            >
              세션 시작
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
    <div className="flex justify-between items-center">
      <span className="text-zinc-500">{label}</span>
      <span className={`font-mono font-medium ${valueColor}`}>{value}</span>
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
