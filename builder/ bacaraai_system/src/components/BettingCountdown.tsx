import { BET_WINDOW_SEC } from '../hooks/useBettingWindow';

type Props = {
  remainingSec: number;
  progress: number;
  hasResult: boolean;
  canPlaceBet: boolean;
  pending?: boolean;
  className?: string;
};

/** 결과 표시 후 30→0 베팅 가능 시간 */
export default function BettingCountdown({
  remainingSec,
  progress,
  hasResult,
  canPlaceBet,
  pending = false,
  className = '',
}: Props) {
  const urgent = canPlaceBet && remainingSec <= 10;
  const closed = hasResult && !canPlaceBet;

  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        canPlaceBet
          ? urgent
            ? 'border-rose-500/40 bg-rose-500/10'
            : 'border-sky-500/35 bg-sky-500/10'
          : closed
            ? 'border-zinc-700 bg-zinc-900/80'
            : 'border-zinc-800 bg-zinc-950'
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <div className="min-w-0">
          <p
            className={`text-[11px] font-bold ${
              canPlaceBet ? (urgent ? 'text-rose-300' : 'text-sky-300') : 'text-zinc-400'
            }`}
          >
            {!hasResult
              ? '결과 대기 중'
              : canPlaceBet
                ? '베팅 가능 시간'
                : pending
                  ? '베팅 마감 · 취소 불가'
                  : '베팅 마감'}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
            {!hasResult
              ? '마지막 결과가 나오면 30초 카운트가 시작됩니다'
              : canPlaceBet
                ? '마지막 결과 기준 · 이 시간 안에만 베팅·취소'
                : pending
                  ? '접수한 베팅은 취소할 수 없습니다. 다음 결과를 기다립니다.'
                  : '다음 결과가 나올 때까지 베팅할 수 없습니다'}
          </p>
        </div>
        <div
          className={`shrink-0 font-mono font-black tabular-nums leading-none ${
            canPlaceBet
              ? urgent
                ? 'text-rose-300 text-3xl'
                : 'text-sky-300 text-3xl'
              : 'text-zinc-600 text-2xl'
          }`}
          aria-live="polite"
          aria-label={canPlaceBet ? `남은 ${remainingSec}초` : '베팅 마감'}
        >
          {canPlaceBet ? remainingSec : '0'}
          <span className="text-sm font-bold ml-0.5 opacity-70">초</span>
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-zinc-950/80 overflow-hidden border border-zinc-800/80">
        <div
          className={`h-full rounded-full transition-[width] duration-200 ease-linear ${
            canPlaceBet
              ? urgent
                ? 'bg-rose-500'
                : 'bg-sky-500'
              : 'bg-zinc-700'
          }`}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      {canPlaceBet && (
        <p className="mt-1.5 text-[10px] text-zinc-500 text-center font-mono">
          {remainingSec}
          {remainingSec > 1
            ? Array.from({ length: Math.min(remainingSec - 1, 8) }, (_, i) => remainingSec - 1 - i)
                .map((n) => `.${n}`)
                .join('')
            : ''}
          {remainingSec > 9 ? '…' : ''} / {BET_WINDOW_SEC}초
        </p>
      )}
    </div>
  );
}
