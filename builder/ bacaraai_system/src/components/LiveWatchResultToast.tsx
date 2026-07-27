import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { formatMoney, type LastBetResult } from '../hooks/useSession';
import { playSfx } from '../audio/sfxEngine';

const SHOW_MS = 4200;
const FRESH_MS = 20_000;

type Props = {
  liveTableId: string;
  winCelebration: LastBetResult | null;
  lastManualResult: LastBetResult | null;
  lastAutoResult: LastBetResult | null;
  /** 승리 토스트 닫을 때 — 테이블 플립·오토 HIT 등 기존 흐름 유지 */
  onDismissWin: () => void;
};

function sideLabel(side: LastBetResult['side']) {
  if (side === 'BANKER') return 'Banker';
  if (side === 'TIE') return 'Tie';
  return 'Player';
}

function isFresh(result: LastBetResult | null | undefined): result is LastBetResult {
  if (!result || !(result.amount > 0)) return false;
  return Date.now() - (result.at || 0) < FRESH_MS;
}

/**
 * 라이브 시청 중 결과 알림 — 영상을 가리지 않는 상단 컴팩트 토스트.
 * 승리는 winCelebration 흐름을 이어받고, 패/무는 해당 테이블 최근 정산을 표시.
 */
export default function LiveWatchResultToast({
  liveTableId,
  winCelebration,
  lastManualResult,
  lastAutoResult,
  onDismissWin,
}: Props) {
  const [toast, setToast] = useState<LastBetResult | null>(null);
  const shownRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<number | null>(null);
  const isWinRef = useRef(false);
  const onDismissWinRef = useRef(onDismissWin);
  onDismissWinRef.current = onDismissWin;

  const clearTimer = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const dismiss = () => {
    clearTimer();
    const wasWin = isWinRef.current;
    isWinRef.current = false;
    setToast(null);
    if (wasWin) onDismissWinRef.current();
  };

  useEffect(() => {
    // 1) 승리 축하 — 라이브 중엔 풀스크린 대신 여기로
    if (winCelebration?.won === true && winCelebration.amount > 0) {
      if (shownRef.current.has(winCelebration.id)) return;
      shownRef.current.add(winCelebration.id);
      if (!isFresh(winCelebration)) {
        onDismissWinRef.current();
        return;
      }
      clearTimer();
      isWinRef.current = true;
      setToast(winCelebration);
      playSfx('win');
      return;
    }

    // 2) 패/기타 — 시청 중인 테이블 정산
    const candidates = [lastManualResult, lastAutoResult].filter(
      (r): r is LastBetResult =>
        Boolean(r && r.tableId === liveTableId && r.amount > 0 && r.won !== true),
    );
    const next = candidates
      .filter((r) => !shownRef.current.has(r.id) && isFresh(r))
      .sort((a, b) => b.at - a.at)[0];
    if (!next) return;

    shownRef.current.add(next.id);
    clearTimer();
    isWinRef.current = false;
    setToast(next);
    if (next.won === false) playSfx('loss');
    else playSfx('tick');
  }, [
    liveTableId,
    winCelebration?.id,
    winCelebration?.won,
    winCelebration?.amount,
    winCelebration?.at,
    lastManualResult?.id,
    lastManualResult?.at,
    lastManualResult?.won,
    lastAutoResult?.id,
    lastAutoResult?.at,
    lastAutoResult?.won,
  ]);

  useEffect(() => {
    if (!toast) return;
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      const wasWin = isWinRef.current;
      isWinRef.current = false;
      setToast(null);
      if (wasWin) onDismissWinRef.current();
    }, SHOW_MS);
    return clearTimer;
  }, [toast?.id]);

  useEffect(() => () => clearTimer(), []);

  const won = toast?.won === true;
  const lost = toast?.won === false;
  const tone = won
    ? 'border-emerald-400/50 bg-zinc-950/95 shadow-emerald-900/40'
    : lost
      ? 'border-rose-400/45 bg-zinc-950/95 shadow-rose-900/35'
      : 'border-zinc-500/40 bg-zinc-950/95 shadow-black/40';
  const badge = won
    ? toast?.source === 'auto'
      ? '오토 적중'
      : '적중'
    : lost
      ? toast?.source === 'auto'
        ? '오토 미적중'
        : '미적중'
      : '정산';
  const badgeCls = won
    ? 'text-emerald-300'
    : lost
      ? 'text-rose-300'
      : 'text-zinc-300';

  return createPortal(
    <AnimatePresence>
      {toast ? (
        <motion.div
          key={toast.id}
          className="fixed top-[max(0.75rem,env(safe-area-inset-top))] left-1/2 z-[450] w-[min(94vw,420px)] -translate-x-1/2 pointer-events-auto"
          initial={{ opacity: 0, y: -16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          role="status"
          aria-live="polite"
        >
          <button
            type="button"
            onClick={dismiss}
            className={`w-full rounded-xl border px-3.5 py-3 text-left shadow-2xl backdrop-blur-md touch-manipulation ${tone}`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className={`text-[11px] font-black tracking-wide ${badgeCls}`}>{badge}</span>
              <span className="text-[10px] text-zinc-500">탭하여 닫기</span>
            </div>
            <p className="text-sm font-bold text-zinc-100 leading-snug">
              <span className="truncate">{toast.tableName}</span>
              <span className="text-zinc-600 mx-1.5">·</span>
              <span>{sideLabel(toast.side)}</span>
              <span className="text-zinc-600 mx-1.5">·</span>
              <span
                className={`font-mono tabular-nums ${
                  won ? 'text-amber-300' : lost ? 'text-rose-300' : 'text-zinc-200'
                }`}
              >
                {won || lost
                  ? formatMoney(toast.pnlDelta, true)
                  : formatMoney(toast.amount)}
              </span>
            </p>
            <p className="mt-1 text-[10px] text-zinc-500">
              라이브 시청 중 · 경기 결과는 참고용 중계와 별개입니다
            </p>
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
