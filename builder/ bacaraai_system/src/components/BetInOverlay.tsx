import { AnimatePresence, motion } from 'motion/react';
import { amountToStack, CHIP_TONES } from './ChipBetStage';
import type { TableBetBanner } from '../utils/autoTableEvent';

function MiniChip({ value, size = 22, offsetY = 0 }: { value: number; size?: number; offsetY?: number }) {
  const tone =
    CHIP_TONES[value] ||
    ({ fill: '#52525b', rim: '#27272a', text: '#fff', label: '', value } as const);
  return (
    <span
      className="absolute left-1/2 rounded-full border-2 shadow-md"
      style={{
        width: size,
        height: size,
        marginLeft: -size / 2,
        bottom: offsetY,
        background: `radial-gradient(circle at 30% 28%, rgba(255,255,255,0.45), transparent 42%), ${tone.fill}`,
        borderColor: tone.rim,
        boxShadow: `0 ${2 + offsetY * 0.05}px 4px rgba(0,0,0,0.35)`,
      }}
    />
  );
}

function ChipStack({ amount, compact }: { amount: number; compact?: boolean }) {
  const stack = amountToStack(amount).slice(-5);
  const size = compact ? 18 : 22;
  return (
    <div className="relative w-10 h-9 shrink-0" aria-hidden>
      {stack.map((chip, i) => (
        <MiniChip key={chip.id} value={chip.value} size={size} offsetY={i * (compact ? 3 : 4)} />
      ))}
      {stack.length === 0 && <MiniChip value={10000} size={size} offsetY={0} />}
    </div>
  );
}

type Props = {
  banners: TableBetBanner[];
  compact?: boolean;
};

/**
 * 로드맵 위 BET IN — 진행 중 베팅을 칩+금액으로 표시
 */
export default function BetInOverlay({ banners, compact = false }: Props) {
  if (banners.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-zinc-950/25 backdrop-blur-[1px]" />
        <div className={`relative flex ${banners.length > 1 ? 'flex-col gap-1.5' : ''} items-center`}>
          {banners.map((banner, idx) => {
            const amount = banner.amount ?? 0;
            const isAuto = banner.badge.includes('오토');
            return (
              <motion.div
                key={banner.id}
                className="flex items-center gap-2"
                initial={{ y: -18, scale: 0.85, opacity: 0, rotate: -8 }}
                animate={{ y: 0, scale: 1, opacity: 1, rotate: -6 }}
                transition={{ type: 'spring', stiffness: 320, damping: 18, delay: idx * 0.06 }}
              >
                <ChipStack amount={amount} compact={compact} />
                <div className="flex flex-col items-start gap-0.5">
                  <span
                    className={`font-black tracking-widest border-2 px-2 py-0.5 rounded-md bg-black/60 -rotate-0 shadow-lg ${
                      isAuto
                        ? 'text-amber-200 border-amber-400/70'
                        : 'text-sky-100 border-sky-400/70'
                    } ${compact ? 'text-[11px]' : 'text-sm sm:text-base'}`}
                  >
                    BET IN
                  </span>
                  <span
                    className={`font-mono font-bold px-1.5 py-0.5 rounded bg-black/55 border border-white/10 ${
                      compact ? 'text-[10px]' : 'text-[11px] sm:text-xs'
                    } ${isAuto ? 'text-amber-200' : 'text-sky-100'}`}
                  >
                    {banner.badge} · {banner.label}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
