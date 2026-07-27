import { motion } from 'motion/react';

type Props = {
  compact?: boolean;
  /** 관리자 미리보기 */
  label?: string;
};

/** 테이블 셔플 중 — 게임·관리자 공통 오버레이 */
export default function ShuffleOverlay({ compact = false, label = '셔플 중' }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[40] flex items-center justify-center rounded-xl overflow-hidden">
      <div className="absolute inset-0 bg-zinc-950/82 backdrop-blur-[2px]" />
      <motion.div
        className="relative flex flex-col items-center gap-2 px-4 text-center"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
      >
        <motion.div
          className={`rounded-full border-2 border-amber-400/70 border-t-transparent ${
            compact ? 'w-10 h-10' : 'w-14 h-14'
          }`}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
        />
        <p
          className={`font-black tracking-[0.22em] uppercase text-amber-300 ${
            compact ? 'text-[10px]' : 'text-xs sm:text-sm'
          }`}
        >
          {label}
        </p>
        <p className={`text-zinc-400 ${compact ? 'text-[9px]' : 'text-[11px]'}`}>
          새 슈 준비 중입니다
        </p>
      </motion.div>
    </div>
  );
}
