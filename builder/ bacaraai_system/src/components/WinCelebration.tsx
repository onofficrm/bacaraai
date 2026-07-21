import { useEffect, useMemo, useState } from 'react';
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

type Props = {
  result: LastBetResult | null;
  onDismiss: () => void;
};

/** 승리 시 슬롯머신풍 짧은 축하 연출 */
export default function WinCelebration({ result, onDismiss }: Props) {
  const open = Boolean(result && result.won === true && result.amount > 0);
  const [reelDone, setReelDone] = useState(false);

  const line = useMemo(() => {
    if (!result) return WIN_LINES[0];
    const idx = Math.abs(result.at) % WIN_LINES.length;
    return WIN_LINES[idx];
  }, [result]);

  useEffect(() => {
    if (!open || !result) {
      setReelDone(false);
      return;
    }
    setReelDone(false);
    playSfx('win');
    const reelTimer = window.setTimeout(() => setReelDone(true), 900);
    const autoClose = window.setTimeout(() => onDismiss(), 3800);
    return () => {
      window.clearTimeout(reelTimer);
      window.clearTimeout(autoClose);
    };
  }, [open, result?.id, onDismiss, result]);

  return (
    <AnimatePresence>
      {open && result && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
          role="dialog"
          aria-modal="true"
          aria-label="승리 축하"
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Confetti dots */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: 28 }).map((_, i) => (
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
            className="relative w-full max-w-sm rounded-2xl border-2 border-amber-400/60 bg-zinc-950 shadow-2xl shadow-amber-500/20 overflow-hidden"
            initial={{ scale: 0.7, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-600 via-yellow-300 to-amber-600" />

            <div className="px-5 pt-6 pb-5 text-center">
              <p className="text-[11px] font-bold tracking-[0.2em] text-amber-400/90 uppercase mb-2">
                WIN
              </p>

              {/* Slot reels */}
              <div className="mx-auto mb-4 flex justify-center gap-2">
                {['7', '7', '7'].map((sym, i) => (
                  <div
                    key={i}
                    className="w-14 h-16 rounded-lg border border-amber-500/40 bg-zinc-900 overflow-hidden relative shadow-inner"
                  >
                    <motion.div
                      className="absolute inset-x-0 top-0 flex flex-col items-center"
                      initial={{ y: 0 }}
                      animate={
                        reelDone
                          ? { y: -128 }
                          : { y: [-0, -320] }
                      }
                      transition={
                        reelDone
                          ? { type: 'spring', stiffness: 200, damping: 18, delay: i * 0.08 }
                          : {
                              duration: 0.45,
                              repeat: Infinity,
                              ease: 'linear',
                              delay: i * 0.05,
                            }
                      }
                    >
                      {['P', 'B', 'T', '7', '★', '7', 'P', 'B', '7'].map((s, j) => (
                        <span
                          key={j}
                          className={`h-16 flex items-center justify-center text-2xl font-black ${
                            s === '7' ? 'text-amber-300' : 'text-zinc-600'
                          }`}
                        >
                          {s}
                        </span>
                      ))}
                    </motion.div>
                  </div>
                ))}
              </div>

              <motion.h3
                className="text-2xl font-black text-amber-300 mb-1"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.85 }}
              >
                {line}
              </motion.h3>

              <motion.p
                className="text-3xl font-mono font-black text-emerald-400 tabular-nums"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
              >
                {formatMoney(result.pnlDelta, true)}
              </motion.p>

              <p className="mt-2 text-[12px] text-zinc-400">
                {result.tableName} · {result.side === 'BANKER' ? 'Banker' : result.side === 'TIE' ? 'Tie' : 'Player'}
              </p>
              <p className="mt-1 text-[11px] text-zinc-500 line-clamp-2 px-2">{result.message}</p>

              <button
                type="button"
                onClick={onDismiss}
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
