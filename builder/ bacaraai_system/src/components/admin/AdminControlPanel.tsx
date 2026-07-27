import { AlertTriangle, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import type { AdminAuditRow } from '../../api/adminLive';
import type { TableData } from '../../types';

type Props = {
  table: TableData;
  tableCode: string;
  shuffleActive: boolean;
  busy: boolean;
  audit: AdminAuditRow[];
  onAdd: (result: 'P' | 'B' | 'T') => void;
  onUndo: () => void;
  onNewGame: () => void;
  onToggleShuffle: (active: boolean) => void;
};

const BTNS: { id: 'P' | 'B' | 'T'; label: string; sub: string; cls: string }[] = [
  { id: 'P', label: 'Player', sub: 'P', cls: 'bg-blue-600 hover:bg-blue-500 border-blue-400/50' },
  { id: 'B', label: 'Banker', sub: 'B', cls: 'bg-red-600 hover:bg-red-500 border-red-400/50' },
  { id: 'T', label: 'Tie', sub: 'T', cls: 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400/50' },
];

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    add_result: '결과 추가',
    undo_last: '실행 취소',
    new_game: '새 게임',
    shuffle_on: '셔플 ON',
    shuffle_off: '셔플 OFF',
  };
  return map[action] || action;
}

export default function AdminControlPanel({
  table,
  tableCode,
  shuffleActive,
  busy,
  audit,
  onAdd,
  onUndo,
  onNewGame,
  onToggleShuffle,
}: Props) {
  const round = table.stats.currentRound;
  const nextRound = round + 1;

  const confirmNewGame = () => {
    if (
      window.confirm(
        `${tableCode} 테이블의 현재 슈 기록을 모두 지우고 새 게임을 시작할까요?\n\n게임 화면에도 즉시 반영됩니다.`,
      )
    ) {
      onNewGame();
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/90 p-4 shrink-0">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-amber-400/90">
          라이브 제어
        </p>
        <h2 className="mt-1 text-lg font-bold text-white">{table.name}</h2>
        <p className="mt-1 text-xs text-zinc-400 font-mono">{tableCode}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          <span className="px-2 py-1 rounded-md bg-zinc-800 text-zinc-300">
            {round > 0 ? `${round}회차` : '기록 없음'}
          </span>
          {shuffleActive ? (
            <span className="px-2 py-1 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
              셔플 중
            </span>
          ) : (
            <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
              진행 중
            </span>
          )}
          {table.live?.manualMode ? (
            <span className="px-2 py-1 rounded-md bg-sky-500/10 text-sky-300 border border-sky-500/25">
              수동 모드
            </span>
          ) : null}
        </div>
      </div>

      {shuffleActive ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100 flex gap-2">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <p>
            셔플 중에는 결과를 추가할 수 없습니다. 셔플을 해제한 뒤 <strong>새 게임</strong>을
            시작하세요.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 shrink-0">
          <p className="text-[11px] text-zinc-500 mb-2">
            다음 입력 → <span className="text-zinc-200 font-bold">{nextRound}회차</span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            {BTNS.map((b) => (
              <button
                key={b.id}
                type="button"
                disabled={busy}
                onClick={() => onAdd(b.id)}
                className={`rounded-xl border py-3 px-2 text-center font-bold text-white transition active:scale-[0.98] disabled:opacity-50 ${b.cls}`}
              >
                <span className="block text-sm">{b.label}</span>
                <span className="block text-[10px] opacity-80 mt-0.5">{b.sub}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 shrink-0">
        <button
          type="button"
          disabled={busy || round <= 0}
          onClick={onUndo}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 py-3 text-sm font-bold text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
        >
          <RotateCcw size={16} />
          실행 취소
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={confirmNewGame}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 py-3 text-sm font-bold text-rose-200 hover:bg-rose-500/20 disabled:opacity-40"
        >
          <Trash2 size={16} />
          새 게임
        </button>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => onToggleShuffle(!shuffleActive)}
        className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold transition disabled:opacity-40 ${
          shuffleActive
            ? 'border-amber-400/50 bg-amber-500/20 text-amber-100'
            : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
        }`}
      >
        <Sparkles size={16} />
        {shuffleActive ? '셔플 해제' : '셔플 중 표시'}
      </button>

      <div className="flex-1 min-h-0 rounded-xl border border-zinc-800 bg-zinc-950/40 overflow-hidden flex flex-col">
        <div className="px-3 py-2 border-b border-zinc-800 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
          최근 변경
        </div>
        <ul className="flex-1 overflow-y-auto custom-scrollbar text-[11px] divide-y divide-zinc-800/80">
          {audit.length === 0 ? (
            <li className="px-3 py-4 text-zinc-600">아직 기록 없음</li>
          ) : (
            audit.map((row, i) => (
              <li key={`${row.created_at}-${i}`} className="px-3 py-2.5">
                <div className="flex justify-between gap-2">
                  <span className="font-bold text-zinc-300">{actionLabel(row.action)}</span>
                  <span className="text-zinc-600 shrink-0">{row.created_at?.slice(11, 19)}</span>
                </div>
                {row.detail ? (
                  <p className="text-zinc-500 mt-0.5 font-mono truncate">{row.detail}</p>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
