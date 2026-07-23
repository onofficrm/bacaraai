import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { getResultLabel } from '../utils/colors';
import type { AiOpinion } from '../types';
import { useFxIntensity } from '../hooks/useFxIntensity';
import { playSfx } from '../audio/sfxEngine';

/** 테이블 카드용 컴팩트 AI 슬롯/플립 연출 */
export default function TableAiSlot({
  opinion,
  consensus,
  amountText,
  modeLabel,
  beginnerMode,
  analyzing,
}: {
  opinion: AiOpinion;
  consensus: string;
  amountText: string;
  modeLabel: string;
  beginnerMode: boolean;
  analyzing?: boolean;
}) {
  const { reduced, intensity, enableParticles } = useFxIntensity();
  const [phase, setPhase] = useState<'idle' | 'spin' | 'land'>('idle');
  const [showJackpot, setShowJackpot] = useState(false);

  const isAction = opinion === 'PLAYER' || opinion === 'BANKER';
  const isJackpot = consensus.includes('3/3') && isAction;
  const label = beginnerMode
    ? opinion === 'PLAYER'
      ? 'Player 참고'
      : opinion === 'BANKER'
        ? 'Banker 참고'
        : opinion === 'WAIT' || opinion === 'SKIP'
          ? '관망'
          : getResultLabel(opinion)
    : getResultLabel(opinion);

  const color =
    opinion === 'PLAYER'
      ? 'text-blue-400'
      : opinion === 'BANKER'
        ? 'text-red-400'
        : opinion === 'WAIT' || opinion === 'SKIP'
          ? 'text-zinc-400'
          : 'text-amber-300';

  useEffect(() => {
    if (analyzing || reduced || intensity === 'low') {
      setPhase('idle');
      return;
    }
    setPhase('spin');
    playSfx(isJackpot ? 'aiReady' : 'tick', { throttleMs: 700 });
    const t1 = window.setTimeout(() => setPhase('land'), 280);
    const t2 = window.setTimeout(() => setPhase('idle'), 620);
    if (isJackpot) {
      setShowJackpot(true);
      const t3 = window.setTimeout(() => setShowJackpot(false), 1100);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
        window.clearTimeout(t3);
      };
    }
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [opinion, consensus, analyzing, reduced, intensity, isJackpot]);

  return (
    <div
      className={`relative rounded-lg border px-2.5 py-1.5 overflow-hidden ${
        isJackpot && showJackpot
          ? 'bg-amber-500/10 border-amber-400/50'
          : 'bg-zinc-950/80 border-zinc-800'
      }`}
    >
      {analyzing && !reduced && (
        <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-zinc-950/60 z-[1]">
          {['P', 'B', 'T'].map((ch, i) => (
            <span
              key={ch}
              className="w-5 h-5 rounded text-[9px] font-black flex items-center justify-center bg-zinc-800 text-zinc-400 border border-zinc-700 animate-pulse"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              {ch}
            </span>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showJackpot && (
          <motion.span
            className="absolute top-1 right-1 z-[2] text-[8px] font-black tracking-wider text-amber-300 bg-amber-500/20 border border-amber-400/50 px-1 py-0.5 rounded"
            initial={{ scale: 0.5, opacity: 0, y: -4 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            JACKPOT 3/3
          </motion.span>
        )}
      </AnimatePresence>

      {enableParticles && showJackpot && !reduced && (
        <div className="pointer-events-none absolute inset-0 z-[1]">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute left-1/2 top-1/2 w-1 h-1 rounded-full bg-amber-300"
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{
                x: Math.cos((i / 6) * Math.PI * 2) * 28,
                y: Math.sin((i / 6) * Math.PI * 2) * 14,
                opacity: 0,
              }}
              transition={{ duration: 0.55 }}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 relative z-[2]">
        <div className="flex items-center gap-2 min-w-0 overflow-hidden h-6">
          <span className="text-[9px] text-zinc-500 shrink-0">{modeLabel}</span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={`${opinion}-${consensus}`}
              className={`text-sm font-bold truncate ${color}`}
              initial={
                reduced
                  ? false
                  : phase === 'spin'
                    ? { y: -18, opacity: 0, rotateX: 70 }
                    : { y: 10, opacity: 0 }
              }
              animate={{ y: 0, opacity: 1, rotateX: 0 }}
              exit={{ y: 8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 22 }}
              style={{ transformPerspective: 400 }}
            >
              {label}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[9px] text-zinc-500 leading-none mb-0.5">참고 금액</div>
          <motion.div
            key={amountText}
            className="text-xs font-mono font-bold text-zinc-200 tabular-nums"
            initial={reduced ? false : { y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            {amountText}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
