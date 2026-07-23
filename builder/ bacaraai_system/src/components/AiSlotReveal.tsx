import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { getResultLabel } from '../utils/colors';
import type { AiOpinion } from '../types';
import { useFxIntensity } from '../hooks/useFxIntensity';
import { playSfx } from '../audio/sfxEngine';

/** AI 의견 슬롯머신 드롭 연출 */
export default function AiSlotReveal({
  opinion,
  consensus,
  confidence,
}: {
  opinion: AiOpinion;
  consensus: string;
  confidence: number;
}) {
  const { reduced, intensity } = useFxIntensity();
  const [spinning, setSpinning] = useState(false);
  const label = getResultLabel(opinion);
  const isAction = opinion === 'PLAYER' || opinion === 'BANKER';
  const isJackpot = consensus.includes('3/3') && isAction;

  useEffect(() => {
    if (reduced || intensity === 'low') return;
    setSpinning(true);
    playSfx(isJackpot ? 'aiReady' : 'tick', { throttleMs: 600 });
    const t = window.setTimeout(() => setSpinning(false), 520);
    return () => window.clearTimeout(t);
  }, [opinion, consensus, reduced, intensity, isJackpot]);

  const color =
    opinion === 'PLAYER'
      ? 'text-blue-400'
      : opinion === 'BANKER'
        ? 'text-red-400'
        : opinion === 'WAIT' || opinion === 'SKIP'
          ? 'text-zinc-400'
          : 'text-amber-300';

  return (
    <div className="relative min-w-0">
      <div className="overflow-hidden h-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={`${opinion}-${consensus}`}
            className={`text-lg font-bold ${color} ${isJackpot ? 'drop-shadow-[0_0_12px_rgba(251,191,36,0.55)]' : ''}`}
            initial={
              reduced
                ? false
                : spinning
                  ? { y: -28, opacity: 0, filter: 'blur(4px)' }
                  : { y: 16, opacity: 0 }
            }
            animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          >
            {label}
          </motion.p>
        </AnimatePresence>
      </div>
      {isJackpot && (
        <motion.span
          className="absolute -top-2 right-0 text-[9px] font-black tracking-wider text-amber-300 bg-amber-500/15 border border-amber-400/40 px-1.5 py-0.5 rounded"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          3/3 JACKPOT
        </motion.span>
      )}
      {confidence > 0 && (
        <p className="text-[10px] text-zinc-500 mt-0.5">신뢰 {confidence}%</p>
      )}
    </div>
  );
}
