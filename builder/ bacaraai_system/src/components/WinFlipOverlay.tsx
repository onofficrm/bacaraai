import { motion } from 'motion/react';
import { useCountUp } from '../hooks/useCountUp';
import { useFxIntensity } from '../hooks/useFxIntensity';
import { formatMoney } from '../hooks/useSession';
import type { TableBetBanner } from '../utils/autoTableEvent';

type Props = {
  banner: TableBetBanner;
  compact?: boolean;
};

/**
 * 승리 시 카드 플립 → 손익 카운트 (~1.5s).
 * 축하 팝업이 닫힌 뒤에만 표시됩니다.
 */
export default function WinFlipOverlay({ banner, compact = false }: Props) {
  const { reduced } = useFxIntensity();
  const pnl = banner.pnl ?? 0;
  const counted = useCountUp(Math.abs(pnl), {
    enabled: !reduced && pnl !== 0,
    durationMs: 520,
    runKey: banner.id,
  });
  const pnlText =
    pnl > 0
      ? `+${formatMoney(counted).replace(/원$/, '')}원`
      : pnl < 0
        ? `−${formatMoney(counted).replace(/원$/, '')}원`
        : banner.label;

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-30 rounded-xl overflow-hidden"
      style={{ perspective: 900 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-3 text-center
          bg-[radial-gradient(ellipse_at_50%_30%,rgba(52,211,153,0.32),transparent_55%),linear-gradient(160deg,#052e1a_0%,#0a1f14_45%,#14532d_100%)]
          border border-emerald-400/45 shadow-[inset_0_0_40px_rgba(52,211,153,0.18)]"
        initial={{ rotateY: 88, scale: 0.94 }}
        animate={{ rotateY: 0, scale: 1 }}
        exit={{ rotateY: -70, opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        style={{ backfaceVisibility: 'hidden', transformStyle: 'preserve-3d' }}
      >
        <motion.span
          className="text-[10px] font-black tracking-[0.22em] text-emerald-300/90"
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {banner.badge}
        </motion.span>
        <motion.p
          className={`font-black text-emerald-50 leading-tight ${compact ? 'text-base' : 'text-lg sm:text-xl'}`}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.16 }}
        >
          적중
        </motion.p>
        <motion.p
          className={`font-mono font-black tabular-nums text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.35)] ${
            compact ? 'text-sm' : 'text-base sm:text-lg'
          }`}
          initial={{ y: 12, opacity: 0, scale: 0.92 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.32, type: 'spring', stiffness: 260, damping: 20 }}
        >
          {pnlText}
        </motion.p>
        {banner.side && (
          <motion.p
            className={`text-emerald-200/80 ${compact ? 'text-[10px]' : 'text-[11px]'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.42 }}
          >
            {banner.side}
          </motion.p>
        )}
        <motion.div
          className="absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.16)_50%,transparent_60%)]"
          initial={{ x: '-60%' }}
          animate={{ x: '120%' }}
          transition={{ duration: 0.65, delay: 0.12, ease: 'easeOut' }}
        />
      </motion.div>
    </motion.div>
  );
}
