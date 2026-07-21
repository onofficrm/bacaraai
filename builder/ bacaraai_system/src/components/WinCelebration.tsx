import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { formatMoney, type LastBetResult } from '../hooks/useSession';
import { playSfx } from '../audio/sfxEngine';

const WIN_LINES = [
  '축하합니다!',
  '잭팟 느낌!',
  '멋진 판단이었어요',
  '연속의 흐름!',
  '한 판 더 가볼까요?',
  '오늘의 행운!',
];

/** 승리 축하용 글램 포트레이트 (public/win-glam) */
const BASE = import.meta.env.BASE_URL || '/';
const WIN_IMAGES = [
  `${BASE}win-glam/win-glam-01.jpg`,
  `${BASE}win-glam/win-glam-02.jpg`,
  `${BASE}win-glam/win-glam-03.jpg`,
  `${BASE}win-glam/win-glam-04.jpg`,
  `${BASE}win-glam/win-glam-05.jpg`,
  `${BASE}win-glam/win-glam-06.jpg`,
];

type Props = {
  result: LastBetResult | null;
  onDismiss: () => void;
};

function pickImage(seed: number) {
  const idx = Math.abs(seed) % WIN_IMAGES.length;
  return WIN_IMAGES[idx];
}

/** 승리 시 랜덤 글램 이미지 + 축하 연출 */
export default function WinCelebration({ result, onDismiss }: Props) {
  const [held, setHeld] = useState<LastBetResult | null>(null);
  const shownIdsRef = useRef<Set<string>>(new Set());
  const [imgReady, setImgReady] = useState(false);

  useEffect(() => {
    if (!result || result.won !== true || result.amount <= 0) return;
    if (shownIdsRef.current.has(result.id)) return;
    shownIdsRef.current.add(result.id);
    setHeld(result);
    setImgReady(false);
    playSfx('win');
  }, [result?.id, result?.won, result?.amount, result]);

  const open = Boolean(held);
  const display = held;

  const line = useMemo(() => {
    if (!display) return WIN_LINES[0];
    const idx = Math.abs(display.at) % WIN_LINES.length;
    return WIN_LINES[idx];
  }, [display]);

  const imageSrc = useMemo(() => {
    if (!display) return WIN_IMAGES[0];
    // 같은 승리는 같은 이미지, 다음 승리는 다른 시드로 섞임
    return pickImage(display.at + display.amount);
  }, [display]);

  useEffect(() => {
    if (!open || !display) return;
    const autoClose = window.setTimeout(() => {
      setHeld(null);
      onDismiss();
    }, 4800);
    return () => window.clearTimeout(autoClose);
  }, [open, display?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = () => {
    setHeld(null);
    onDismiss();
  };

  return (
    <AnimatePresence>
      {open && display && (
        <motion.div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
          role="dialog"
          aria-modal="true"
          aria-label="승리 축하"
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: 24 }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute w-2 h-2 rounded-sm"
                style={{
                  left: `${4 + ((i * 37) % 92)}%`,
                  top: '-8%',
                  backgroundColor:
                    i % 3 === 0 ? '#f59e0b' : i % 3 === 1 ? '#34d399' : '#f87171',
                }}
                initial={{ y: 0, opacity: 1, rotate: 0 }}
                animate={{
                  y: '110vh',
                  opacity: [1, 1, 0],
                  rotate: 360 + i * 40,
                }}
                transition={{
                  duration: 2.2 + (i % 5) * 0.25,
                  delay: (i % 7) * 0.08,
                  ease: 'easeIn',
                }}
              />
            ))}
          </div>

          <motion.div
            className="relative w-full max-w-sm rounded-2xl border-2 border-amber-400/60 bg-zinc-950 shadow-2xl shadow-amber-500/30 overflow-hidden"
            initial={{ scale: 0.72, y: 48 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-600 via-yellow-300 to-amber-600 z-10" />

            {/* Hero image */}
            <div className="relative h-56 sm:h-64 overflow-hidden bg-zinc-900">
              <motion.img
                key={imageSrc}
                src={imageSrc}
                alt=""
                className="absolute inset-0 w-full h-full object-cover object-top"
                initial={{ scale: 1.15, opacity: 0 }}
                animate={{ scale: 1, opacity: imgReady ? 1 : 0.4 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                onLoad={() => setImgReady(true)}
                draggable={false}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
              <motion.p
                className="absolute top-3 left-3 text-[10px] font-bold tracking-[0.25em] text-amber-300/95 uppercase px-2 py-1 rounded-md bg-black/45 border border-amber-400/30"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                WIN
              </motion.p>
            </div>

            <div className="px-5 pt-3 pb-5 text-center relative -mt-2">
              <motion.h3
                className="text-2xl font-black text-amber-300 mb-1"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 }}
              >
                {line}
              </motion.h3>

              <motion.p
                className="text-3xl font-mono font-black text-emerald-400 tabular-nums"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {formatMoney(display.pnlDelta, true)}
              </motion.p>

              <p className="mt-2 text-[12px] text-zinc-400">
                {display.tableName} ·{' '}
                {display.side === 'BANKER'
                  ? 'Banker'
                  : display.side === 'TIE'
                    ? 'Tie'
                    : 'Player'}
              </p>
              <p className="mt-1 text-[11px] text-zinc-500 line-clamp-2 px-2">{display.message}</p>

              <button
                type="button"
                onClick={dismiss}
                className="mt-5 w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-sm font-bold transition-colors"
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
