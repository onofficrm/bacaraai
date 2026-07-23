import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { amountToStack, CHIP_TONES } from './ChipBetStage';
import { playSfx } from '../audio/sfxEngine';
import { useFxIntensity } from '../hooks/useFxIntensity';
import type { TableBetBanner } from '../utils/autoTableEvent';

const DROP_MS = 95;
const MAX_CHIPS = 5;

function MiniChip({
  value,
  size = 22,
  offsetY = 0,
  animate,
  delay,
}: {
  value: number;
  size?: number;
  offsetY?: number;
  animate: boolean;
  delay: number;
}) {
  const tone =
    CHIP_TONES[value] ||
    ({ fill: '#52525b', rim: '#27272a', text: '#fff', label: '', value } as const);
  return (
    <motion.span
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
      initial={animate ? { y: -42, opacity: 0, scale: 0.55, rotate: -12 } : false}
      animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
      transition={
        animate
          ? { type: 'spring', stiffness: 520, damping: 16, delay }
          : { duration: 0 }
      }
    />
  );
}

function ChipStack({
  amount,
  compact,
  animate,
}: {
  amount: number;
  compact?: boolean;
  animate: boolean;
}) {
  const stack = useMemo(() => amountToStack(amount).slice(-MAX_CHIPS), [amount]);
  const size = compact ? 18 : 22;
  const step = compact ? 3 : 4;
  const chips = stack.length > 0 ? stack : [{ id: 'fallback', value: 10000 }];

  return (
    <div className="relative w-10 h-10 shrink-0" aria-hidden>
      {chips.map((chip, i) => (
        <MiniChip
          key={chip.id}
          value={chip.value}
          size={size}
          offsetY={i * step}
          animate={animate}
          delay={i * (DROP_MS / 1000)}
        />
      ))}
    </div>
  );
}

function useCountUp(target: number, enabled: boolean, durationMs: number, runKey: string) {
  const [value, setValue] = useState(enabled ? 0 : target);

  useEffect(() => {
    if (!enabled || target <= 0) {
      setValue(target);
      return;
    }
    setValue(0);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // ease-out cubic — 끝에서 숫자가 빠르게 붙잡는 슬롯 느낌
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled, target, durationMs, runKey]);

  return value;
}

function BetInRow({
  banner,
  compact,
  animate,
  index,
  playAudio,
}: {
  banner: TableBetBanner;
  compact?: boolean;
  animate: boolean;
  index: number;
  playAudio: boolean;
}) {
  const amount = banner.amount ?? 0;
  const isAuto = banner.badge.includes('오토');
  const stackLen = Math.max(1, Math.min(MAX_CHIPS, amountToStack(amount).length || 1));
  const durationMs = stackLen * DROP_MS + 120;
  const displayAmount = useCountUp(amount, animate, durationMs, banner.id);
  const side = banner.side || '';

  useEffect(() => {
    if (!animate || !playAudio) return;
    const timers: number[] = [];
    const stack = amountToStack(amount).slice(-MAX_CHIPS);
    const chips = stack.length > 0 ? stack : [{ id: 'x', value: 10000 }];

    chips.forEach((chip, i) => {
      timers.push(
        window.setTimeout(() => {
          playSfx(chip.value >= 1_000_000 ? 'chipHeavy' : 'chip', { throttleMs: 55 });
        }, 40 + index * 80 + i * DROP_MS),
      );
    });

    timers.push(
      window.setTimeout(() => {
        playSfx('betConfirm', { throttleMs: 450 });
      }, 40 + index * 80 + chips.length * DROP_MS + 40),
    );

    return () => timers.forEach((id) => clearTimeout(id));
  }, [animate, playAudio, amount, banner.id, index]);

  return (
    <motion.div
      className="flex items-center gap-2"
      initial={animate ? { y: -14, scale: 0.9, opacity: 0, rotate: -8 } : false}
      animate={{ y: 0, scale: 1, opacity: 1, rotate: -6 }}
      transition={{ type: 'spring', stiffness: 340, damping: 18, delay: index * 0.05 }}
    >
      <ChipStack amount={amount} compact={compact} animate={animate} />
      <div className="flex flex-col items-start gap-0.5">
        <motion.span
          className={`font-black tracking-widest border-2 px-2 py-0.5 rounded-md bg-black/60 shadow-lg ${
            isAuto ? 'text-amber-200 border-amber-400/70' : 'text-sky-100 border-sky-400/70'
          } ${compact ? 'text-[11px]' : 'text-sm sm:text-base'}`}
          initial={animate ? { scale: 1.25, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 16, delay: animate ? 0.02 : 0 }}
        >
          BET IN
        </motion.span>
        <span
          className={`font-mono font-bold px-1.5 py-0.5 rounded bg-black/55 border border-white/10 tabular-nums ${
            compact ? 'text-[10px]' : 'text-[11px] sm:text-xs'
          } ${isAuto ? 'text-amber-200' : 'text-sky-100'}`}
        >
          {animate
            ? `${banner.badge}${side ? ` · ${side}` : ''} · ${displayAmount.toLocaleString()}원`
            : `${banner.badge} · ${banner.label}`}
        </span>
      </div>
    </motion.div>
  );
}

type Props = {
  banners: TableBetBanner[];
  compact?: boolean;
};

/**
 * 로드맵 위 BET IN — 칩이 한 장씩 떨어지며 금액이 카운트업
 */
export default function BetInOverlay({ banners, compact = false }: Props) {
  const { reduced } = useFxIntensity();
  const runKey = banners.map((b) => b.id).join('|');
  const playedRef = useRef<string | null>(null);
  const [animate, setAnimate] = useState(!reduced);

  useEffect(() => {
    if (reduced) {
      setAnimate(false);
      return;
    }
    // 같은 베팅 키면 재진입 시 즉시 표시 (플립 오버레이 후 등)
    if (playedRef.current === runKey) {
      setAnimate(false);
      return;
    }
    playedRef.current = runKey;
    setAnimate(true);
  }, [runKey, reduced]);

  if (banners.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={runKey}
        className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-zinc-950/25 backdrop-blur-[1px]" />
        <div
          className={`relative flex ${banners.length > 1 ? 'flex-col gap-1.5' : ''} items-center`}
        >
          {banners.map((banner, idx) => (
            <BetInRow
              key={banner.id}
              banner={banner}
              compact={compact}
              animate={animate}
              index={idx}
              playAudio={animate && idx === 0}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
