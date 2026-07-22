import type { GameResult, PatternSegment } from '../types';
import { playSfx } from '../audio/sfxEngine';
import { formatPattern, patternTotalGames } from '../utils/patternMatch';

const MAX_BEADS = 16;

type Props = {
  segments: PatternSegment[];
  onChange: (next: PatternSegment[]) => void;
  disabled?: boolean;
};

const CHIP: Record<
  GameResult,
  { label: string; idle: string; bead: string }
> = {
  P: {
    label: 'Player',
    idle: 'bg-zinc-950 border-zinc-700 text-blue-400 hover:border-blue-500',
    bead: 'bg-blue-600 text-white border-blue-400',
  },
  B: {
    label: 'Banker',
    idle: 'bg-zinc-950 border-zinc-700 text-red-400 hover:border-red-500',
    bead: 'bg-red-500 text-white border-red-400',
  },
  T: {
    label: 'Tie',
    idle: 'bg-zinc-950 border-zinc-700 text-emerald-400 hover:border-emerald-500',
    bead: 'bg-emerald-500 text-white border-emerald-400',
  },
};

/** 초보자용: P/B/T + 이상 버튼으로 패턴 구성 */
export default function PatternSequenceBuilder({ segments, onChange, disabled }: Props) {
  const total = patternTotalGames(segments);

  const push = (side: GameResult) => {
    if (disabled || total >= MAX_BEADS) return;
    playSfx('chip');
    const next = segments.map((s) => ({ ...s }));
    const last = next[next.length - 1];
    if (last && last.side === side) {
      last.count += 1;
    } else {
      next.push({ side, count: 1, atLeast: false });
    }
    onChange(next);
  };

  const markAtLeast = () => {
    if (disabled || !segments.length) return;
    playSfx('ui');
    const next = segments.map((s) => ({ ...s }));
    const last = next[next.length - 1];
    last.atLeast = true;
    onChange(next);
  };

  const undo = () => {
    if (disabled || !segments.length) return;
    playSfx('ui');
    const next = segments.map((s) => ({ ...s }));
    const last = next[next.length - 1];
    if (last.count > 1) {
      last.count -= 1;
      // 개수를 줄여도 이상 플래그는 유지 (남은 개수 기준 이상)
    } else {
      next.pop();
    }
    onChange(next);
  };

  const clear = () => {
    if (disabled) return;
    playSfx('ui');
    onChange([]);
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 overflow-hidden">
      <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-zinc-300">진입 패턴 (게임처럼 눌러 만드세요)</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            예: Player 4번 누른 뒤 <span className="text-amber-300">이상</span> → Banker 1번
            (플레이어가 8개여도 뱅커 나오면 진입)
          </p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button
            type="button"
            disabled={disabled || !segments.length}
            onClick={undo}
            className="px-2 py-1 rounded-md text-[10px] font-bold border border-zinc-700 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
          >
            하나씩 지우기
          </button>
          <button
            type="button"
            disabled={disabled || !segments.length}
            onClick={clear}
            className="px-2 py-1 rounded-md text-[10px] font-bold border border-zinc-700 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
          >
            전체 삭제
          </button>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-3">
        <div className="min-h-[56px] rounded-lg border border-dashed border-zinc-700 bg-zinc-900/80 px-2 py-2 flex flex-wrap gap-2 items-center">
          {segments.length === 0 ? (
            <span className="text-[11px] text-zinc-600 px-1">
              아직 패턴이 없습니다. Player/Banker/Tie 를 추가하세요.
            </span>
          ) : (
            segments.map((seg, si) => (
              <div
                key={`${seg.side}-${si}-${seg.count}-${seg.atLeast}`}
                className="flex items-center gap-1"
              >
                {Array.from({ length: Math.min(seg.count, 8) }).map((_, bi) => (
                  <span
                    key={bi}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[11px] font-black ${CHIP[seg.side].bead}`}
                  >
                    {seg.side}
                  </span>
                ))}
                {seg.count > 8 && (
                  <span className="text-[10px] text-zinc-500 font-mono">+{seg.count - 8}</span>
                )}
                {seg.atLeast && (
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-black bg-amber-500/20 border border-amber-400/50 text-amber-300">
                    {seg.count}이상
                  </span>
                )}
                {!seg.atLeast && seg.count > 1 && (
                  <span className="text-[10px] text-zinc-500 font-mono">×{seg.count}</span>
                )}
                {si < segments.length - 1 && (
                  <span className="text-zinc-600 text-[10px] mx-0.5">→</span>
                )}
              </div>
            ))
          )}
        </div>

        <p className="text-[11px] text-zinc-400 font-mono">
          {segments.length > 0 ? (
            <>
              <span className="text-zinc-500">읽기: </span>
              {formatPattern(segments)}
              <span className="text-zinc-600"> · 최소 {total}게임</span>
            </>
          ) : (
            <span className="text-zinc-600">
              「이상」을 누르면 방금 넣은 쪽이 그 개수 이상이어도 통과합니다.
            </span>
          )}
        </p>

        <div className="grid grid-cols-4 gap-2">
          {(['P', 'B', 'T'] as GameResult[]).map((r) => (
            <button
              key={r}
              type="button"
              disabled={disabled || total >= MAX_BEADS}
              onClick={() => push(r)}
              className={`min-h-[48px] rounded-xl border-2 text-sm font-bold transition-colors disabled:opacity-40 ${CHIP[r].idle}`}
            >
              {CHIP[r].label}
              <span className="block text-[10px] font-medium opacity-70 mt-0.5">추가</span>
            </button>
          ))}
          <button
            type="button"
            disabled={disabled || !segments.length}
            onClick={markAtLeast}
            className={`min-h-[48px] rounded-xl border-2 text-sm font-bold transition-colors disabled:opacity-40 ${
              segments[segments.length - 1]?.atLeast
                ? 'bg-amber-500 border-amber-300 text-zinc-950'
                : 'bg-zinc-950 border-amber-500/50 text-amber-300 hover:border-amber-400'
            }`}
          >
            이상
            <span className="block text-[10px] font-medium opacity-80 mt-0.5">마지막 구간</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] text-zinc-600 self-center mr-1">빠른 예시</span>
          <ExampleChip
            label="P×4이상 → B"
            disabled={disabled}
            onPick={() =>
              onChange([
                { side: 'P', count: 4, atLeast: true },
                { side: 'B', count: 1, atLeast: false },
              ])
            }
          />
          <ExampleChip
            label="B×4이상 → P"
            disabled={disabled}
            onPick={() =>
              onChange([
                { side: 'B', count: 4, atLeast: true },
                { side: 'P', count: 1, atLeast: false },
              ])
            }
          />
          <ExampleChip
            label="B×4 → P"
            disabled={disabled}
            onPick={() =>
              onChange([
                { side: 'B', count: 4, atLeast: false },
                { side: 'P', count: 1, atLeast: false },
              ])
            }
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
