import { motion } from 'motion/react';
import type { TableBetBanner } from '../utils/autoTableEvent';

type Props = {
  banner: TableBetBanner;
  compact?: boolean;
};

/**
 * 승리 시 카드 위를 덮는 짧은 플립 연출.
 * 전체 로드맵을 길게 가리지 않도록 1.x초만 유지.
 */
export default function WinFlipOverlay({ banner, compact = false }: Props) {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-30 rounded-xl overflow-hidden"
      style={{ perspective: 900 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-3 text-center
          bg-[radial-gradient(ellipse_at_50%_30%,rgba(52,211,153,0.35),transparent_55%),linear-gradient(160deg,#052e1a_0%,#0a1f14_45%,#14532d_100%)]
          border border-emerald-400/50 shadow-[inset_0_0_40px_rgba(52,211,153,0.2)]"
        initial={{ rotateY: 88, scale: 0.94 }}
        animate={{ rotateY: 0, scale: 1 }}
        exit={{ rotateY: -70, opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        style={{ backfaceVisibility: 'hidden', transformStyle: 'preserve-3d' }}
      >
        <motion.span
          className="text-[10px] font-black tracking-[0.2em] text-emerald-300/90"
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.12 }}
        >
          {banner.badge}
        </motion.span>
        <motion.p
          className={`font-black text-emerald-50 leading-tight ${compact ? 'text-base' : 'text-lg sm:text-xl'}`}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.18 }}
        >
          적중
        </motion.p>
        <motion.p
          className={`font-bold text-emerald-200/95 ${compact ? 'text-[11px]' : 'text-sm'}`}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.24 }}
        >
          {banner.label}
        </motion.p>
        <motion.div
          className="absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.14)_50%,transparent_60%)]"
          initial={{ x: '-60%' }}
          animate={{ x: '120%' }}
          transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
        />
      </motion.div>
    </motion.div>
  );
}
