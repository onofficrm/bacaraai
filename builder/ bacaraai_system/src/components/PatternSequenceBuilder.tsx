import type { GameResult } from '../types';
import { playSfx } from '../audio/sfxEngine';
import { formatPattern } from '../utils/patternMatch';

const MAX_LEN = 12;

type Props = {
  sequence: GameResult[];
  onChange: (next: GameResult[]) => void;
  disabled?: boolean;
};

const CHIP: Record<
  GameResult,
  { label: string; active: string; idle: string; bead: string }
> = {
  P: {
    label: 'Player',
    active: 'bg-blue-600 border-blue-400 text-white',
    idle: 'bg-zinc-950 border-zinc-700 text-blue-400 hover:border-blue-500',
    bead: 'bg-blue-600 text-white border-blue-400',
  },
  B: {
    label: 'Banker',
    active: 'bg-red-500 border-red-400 text-white',
    idle: 'bg-zinc-950 border-zinc-700 text-red-400 hover:border-red-500',
    bead: 'bg-red-500 text-white border-red-400',
  },
  T: {
    label: 'Tie',
    active: 'bg-emerald-500 border-emerald-400 text-white',
    idle: 'bg-zinc-950 border-zinc-700 text-emerald-400 hover:border-emerald-500',
    bead: 'bg-emerald-500 text-white border-emerald-400',
  },
};

/** 초보자용: 결과 버튼을 눌러 패턴을 쌓는 UI (로드맵처럼 구슬로 표시) */
export default function PatternSequenceBuilder({ sequence, onChange, disabled }: Props) {
  const push = (r: GameResult) => {
    if (disabled || sequence.length >= MAX_LEN) return;
    playSfx('chip');
    onChange([...sequence, r]);
  };

  const undo = () => {
    if (disabled || !sequence.length) return;
    playSfx('ui');
    onChange(sequence.slice(0, -1));
  };

  const clear = () => {
    if (disabled || !sequence.length) return;
    playSfx('ui');
    onChange([]);
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 overflow-hidden">
      <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-zinc-300">진입 패턴 (게임처럼 눌러 만드세요)</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            예: Banker 4번 → Player 1번 이면 B를 4번, P를 1번 누르세요
          </p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button
            type="button"
            disabled={disabled || !sequence.length}
            onClick={undo}
            className="px-2 py-1 rounded-md text-[10px] font-bold border border-zinc-700 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
          >
            하나씩 지우기
          </button>
          <button
            type="button"
            disabled={disabled || !sequence.length}
            onClick={clear}
            className="px-2 py-1 rounded-md text-[10px] font-bold border border-zinc-700 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
          >
            전체 삭제
          </button>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-3">
        <div className="min-h-[56px] rounded-lg border border-dashed border-zinc-700 bg-zinc-900/80 px-2 py-2 flex flex-wrap gap-1.5 items-center">
          {sequence.length === 0 ? (
            <span className="text-[11px] text-zinc-600 px-1">아직 패턴이 없습니다. 아래 버튼을 눌러 추가하세요.</span>
          ) : (
            sequence.map((r, i) => (
              <span
                key={`${r}-${i}`}
                className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-black ${CHIP[r].bead}`}
                title={`${i + 1}번째 ${CHIP[r].label}`}
              >
                {r}
              </span>
            ))
          )}
        </div>

        <p className="text-[11px] text-zinc-400 font-mono">
          {sequence.length > 0 ? (
            <>
              <span className="text-zinc-500">읽기: </span>
              {formatPattern(sequence)}
              <span className="text-zinc-600"> · {sequence.length}게임</span>
            </>
          ) : (
            <span className="text-zinc-600">패턴을 만들면 8개 테이블에서 이 모양이 나온 뒤 베팅합니다.</span>
          )}
        </p>

        <div className="flex gap-2">
          {(['P', 'B', 'T'] as GameResult[]).map((r) => (
            <button
              key={r}
              type="button"
              disabled={disabled || sequence.length >= MAX_LEN}
              onClick={() => push(r)}
              className={`flex-1 min-h-[48px] rounded-xl border-2 text-sm font-bold transition-colors disabled:opacity-40 ${CHIP[r].idle}`}
            >
              {CHIP[r].label}
              <span className="block text-[10px] font-medium opacity-70 mt-0.5">추가</span>
            </button>
          ))}
        </div>

        {/* 빠른 예시 */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] text-zinc-600 self-center mr-1">빠른 예시</span>
          <ExampleChip
            label="B×4 → P"
            disabled={disabled}
            onPick={() => onChange(['B', 'B', 'B', 'B', 'P'])}
          />
          <ExampleChip
            label="P×4 → B"
            disabled={disabled}
            onPick={() => onChange(['P', 'P', 'P', 'P', 'B'])}
          />
          <ExampleChip
            label="B P B P"
            disabled={disabled}
            onPick={() => onChange(['B', 'P', 'B', 'P'])}
          />
        </div>
      </div>
    </div>
  );
}

function ExampleChip({
  label,
  onPick,
  disabled,
}: {
  label: string;
  onPick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        playSfx('ui');
        onPick();
      }}
      className="px-2 py-1 rounded-full text-[10px] font-bold border border-zinc-700 text-zinc-400 hover:border-amber-500/50 hover:text-amber-300 disabled:opacity-30"
    >
      {label}
    </button>
  );
}
