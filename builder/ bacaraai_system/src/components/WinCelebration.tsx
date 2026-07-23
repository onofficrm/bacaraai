import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { formatMoney, type LastBetResult } from '../hooks/useSession';
import { playSfx } from '../audio/sfxEngine';

const WIN_LINES = [
  '오늘 당신은 불타요',
  '잭팟 그 자체!',
  '숨 막히는 한 판!',
  '이게 바로 흐름!',
  '한 판 더, 미인처럼!',
  '운명의 미소!',
  '완벽한 타이밍!',
  '럭키 스트라이크!',
];

/** 승리 축하용 강렬 글램 이미지 (public/win-glam) */
const BASE = import.meta.env.BASE_URL || '/';
const WIN_IMAGES = [
  `${BASE}win-glam/win-glam-01.jpg`,
  `${BASE}win-glam/win-glam-02.jpg`,
  `${BASE}win-glam/win-glam-03.jpg`,
  `${BASE}win-glam/win-glam-04.jpg`,
  `${BASE}win-glam/win-glam-05.jpg`,
  `${BASE}win-glam/win-glam-06.jpg`,
  `${BASE}win-glam/win-glam-07.jpg`,
  `${BASE}win-glam/win-glam-08.jpg`,
];

const SHOW_MS = 5200;
/** 이보다 오래된 승리는 카드로 표시하지 않음 */
const FRESH_MS = 20_000;

type Props = {
  result: LastBetResult | null;
  onDismiss: () => void;
};

function pickImage(seed: number) {
  return WIN_IMAGES[Math.abs(seed) % WIN_IMAGES.length];
}

function isFreshWin(result: LastBetResult | null | undefined): result is LastBetResult {
  if (!result || result.won !== true || !(result.amount > 0)) return false;
  return Date.now() - (result.at || 0) < FRESH_MS;
}

/** 승리 시 랜덤 강렬 글램 이미지 + 축하 연출 (직접·오토 공통) */
export default function WinCelebration({ result, onDismiss }: Props) {
  const [held, setHeld] = useState<LastBetResult | null>(null);
  const [imgReady, setImgReady] = useState(false);
  const shownIdsRef = useRef<Set<string>>(new Set());
  const dismissTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isFreshWin(result)) return;
    if (shownIdsRef.current.has(result.id)) return;
    shownIdsRef.current.add(result.id);
    setHeld(result);
    setImgReady(false);
    playSfx('win');
  }, [result?.id, result?.won, result?.amount, result?.at, result]);

  const open = Boolean(held);
  const display = held;
  const isAuto = display?.source === 'auto' || /오토/.test(display?.appliedRule || '');

  const line = useMemo(() => {
    if (!display) return WIN_LINES[0];
    return WIN_LINES[Math.abs(display.at) % WIN_LINES.length];
  }, [display]);

  const imageSrc = useMemo(() => {
    if (!display) return WIN_IMAGES[0];
    return pickImage(display.at + display.amount * 7);
  }, [display]);

  const dismiss = () => {
    if (dismissTimerRef.current) {
      window.clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    setHeld(null);
    onDismiss();
  };

  useEffect(() => {
    if (!open || !display) return;
    if (dismissTimerRef.current) window.clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = window.setTimeout(() => {
      dismissTimerRef.current = null;
      setHeld(null);
      onDismiss();
    }, SHOW_MS);
    return () => {
      if (dismissTimerRef.current) {
        window.clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, display?.id]);

  return (
    <AnimatePresence>
      {open && display && (
        <motion.div
          className="fixed inset-0 z-[400] flex items-center justify-center p-3 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
          role="dialog"
          aria-modal="true"
          aria-label="승리 축하"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-rose-950/80 via-black/85 to-black/90 backdrop-blur-md" />

          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: 36 }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute rounded-full"
                style={{
                  left: `${3 + ((i * 29) % 94)}%`,
                  top: '-6%',
                  width: 4 + (i % 4) * 2,
                  height: 4 + (i % 4) * 2,
                  backgroundColor:
                    i % 4 === 0
                      ? '#fb7185'
                      : i % 4 === 1
                        ? '#fbbf24'
                        : i % 4 === 2
                          ? '#f472b6'
                          : '#fde68a',
                  boxShadow: '0 0 8px currentColor',
                }}
                initial={{ y: 0, opacity: 1, rotate: 0 }}
                animate={{
                  y: '115vh',
                  opacity: [1, 1, 0],
                  rotate: 420 + i * 25,
                }}
                transition={{
                  duration: 2 + (i % 6) * 0.3,
                  delay: (i % 9) * 0.06,
                  ease: 'easeIn',
                }}
              />
            ))}
          </div>

          <motion.div
            className="relative w-full max-w-[22rem] rounded-2xl border-2 border-rose-400/50 bg-zinc-950 shadow-[0_0_60px_rgba(244,63,94,0.35)] overflow-hidden"
            initial={{ scale: 0.68, y: 56, rotate: -2 }}
            animate={{ scale: 1, y: 0, rotate: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-rose-600 via-amber-300 to-fuchsia-500 z-20" />

            <div className="relative h-[22rem] sm:h-[26rem] overflow-hidden bg-zinc-900">
              <motion.img
                key={imageSrc}
                src={imageSrc}
                alt=""
                className="absolute inset-0 w-full h-full object-cover object-[center_18%]"
                initial={{ scale: 1.25, opacity: 0 }}
                animate={{
                  scale: imgReady ? 1.05 : 1.2,
                  opacity: imgReady ? 1 : 0.55,
                }}
                transition={{ duration: 0.85, ease: 'easeOut' }}
                onLoad={() => setImgReady(true)}
                onError={() => setImgReady(true)}
                draggable={false}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-rose-950/25 to-transparent" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.55)_100%)]" />

              <motion.div
                className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 z-10"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <span className="text-[10px] font-black tracking-[0.28em] text-rose-100 uppercase px-2.5 py-1 rounded-md bg-rose-600/80 border border-rose-300/40 shadow-lg shadow-rose-500/30">
                  {isAuto ? 'AUTO WIN' : 'HOT WIN'}
                </span>
                <span className="text-[10px] font-bold text-amber-200/90 px-2 py-1 rounded-md bg-black/50 border border-amber-400/30">
                  {isAuto ? '오토 적중' : '★ LUCKY'}
                </span>
              </motion.div>

              <div className="absolute inset-x-0 bottom-0 px-4 pb-4 pt-16 z-10">
                <motion.h3
                  className="text-[1.65rem] leading-tight font-black text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)] mb-1"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28 }}
                >
                  {line}
                </motion.h3>
                <motion.p
                  className="text-3xl font-mono font-black text-amber-300 tabular-nums drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {formatMoney(display.pnlDelta, true)}
                </motion.p>
              </div>
            </div>

            <div className="px-4 pt-3 pb-4 text-center bg-zinc-950">
              <p className="text-[12px] text-zinc-400">
                {isAuto ? '오토 · ' : '직접 · '}
                {display.tableName} ·{' '}
                {display.side === 'BANKER'
                  ? 'Banker'
                  : display.side === 'TIE'
                    ? 'Tie'
                    : 'Player'}
              </p>
              <p className="mt-1 text-[11px] text-zinc-500 line-clamp-2 px-1">{display.message}</p>

              <button
                type="button"
                onClick={dismiss}
                className="mt-4 w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-amber-400 hover:brightness-110 text-zinc-950 text-sm font-black tracking-wide transition-[filter] shadow-lg shadow-rose-500/25"
              >
                계속하기
              </button>
              <p className="mt-2 text-[10px] text-zinc-600">화면을 탭해도 닫힙니다</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
