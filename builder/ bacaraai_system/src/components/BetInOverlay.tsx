import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CHIP_TONES, type StackChip } from './ChipBetStage';
import { playSfx } from '../audio/sfxEngine';
import { useFxIntensity } from '../hooks/useFxIntensity';
import type { TableBetBanner } from '../utils/autoTableEvent';

const DROP_MS = 58;
const MAX_VISUAL_CHIPS = 14;
const DENOMS = [1_000_000, 500_000, 100_000, 50_000, 10_000, 5_000, 1_000] as const;

/** 금액 규모에 따라 쌓일 칩 장수 (1백만 → 12장) */
function betInChipCount(amount: number): number {
  const n = Math.max(0, Math.floor(amount));
  if (n >= 5_000_000) return MAX_VISUAL_CHIPS;
  if (n >= 2_000_000) return 13;
  if (n >= 1_000_000) return 12;
  if (n >= 500_000) return 10;
  if (n >= 200_000) return 8;
  if (n >= 100_000) return 7;
  if (n >= 50_000) return 6;
  if (n >= 20_000) return 5;
  if (n >= 10_000) return 4;
  if (n >= 5_000) return 3;
  return 2;
}

/**
 * 베팅 오버레이용 시각 스택.
 * 큰 단위 1장으로 끝내지 않고, 금액 규모만큼 여러 장을 높이 쌓음.
 */
function amountToBetInStack(amount: number): StackChip[] {
  const n = Math.max(0, Math.floor(amount));
  const count = betInChipCount(n);
  if (n <= 0) {
    return Array.from({ length: 2 }, (_, i) => ({ id: `f${i}`, value: 10_000 }));
  }

  const ideal = Math.max(1_000, Math.round(n / count));
  const unit = [...DENOMS].sort((a, b) => Math.abs(a - ideal) - Math.abs(b - ideal))[0];

  // 근처 단위를 섞어 색이 다른 칩이 쌓이게
  const palette = DENOMS.filter(
    (d) => d <= Math.max(unit * 2, unit) && d >= Math.min(unit, 10_000),
  );
  const use = palette.length > 0 ? palette : [unit];

  return Array.from({ length: count }, (_, i) => {
    // 아래쪽(먼저 쌓임)일수록 큰 칩 비중 ↑
    const value = use[Math.min(i % use.length, use.length - 1)];
    return { id: `bet_${i}_${value}`, value };
  });
}

function MiniChip({
  value,
  size,
  offsetY,
  wobbleX,
  animate,
  delay,
}: {
  value: number;
  size: number;
  offsetY: number;
  wobbleX: number;
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
        marginLeft: -size / 2 + wobbleX,
        bottom: offsetY,
        background: `radial-gradient(circle at 30% 28%, rgba(255,255,255,0.45), transparent 42%), ${tone.fill}`,
        borderColor: tone.rim,
        boxShadow: `0 ${2 + offsetY * 0.04}px 5px rgba(0,0,0,0.4)`,
        zIndex: Math.round(offsetY),
      }}
      initial={animate ? { y: -56, opacity: 0, scale: 0.45, rotate: -18 } : false}
      animate={{ y: 0, opacity: 1, scale: 1, rotate: wobbleX * 0.8 }}
      transition={
        animate
          ? { type: 'spring', stiffness: 560, damping: 15, delay }
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
  const chips = useMemo(() => amountToBetInStack(amount), [amount]);
  const size = compact ? 16 : 20;
  const step = compact ? 2.6 : 3.2;
  const stackH = size + Math.max(0, chips.length - 1) * step + 4;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size + 10, height: Math.max(stackH, size + 8) }}
      aria-hidden
    >
      {chips.map((chip, i) => (
        <MiniChip
          key={chip.id}
          value={chip.value}
          size={size}
          offsetY={i * step}
          wobbleX={(i % 2 === 0 ? -1 : 1) * (i % 3 === 0 ? 1.5 : 0.6)}
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
  const chips = useMemo(() => amountToBetInStack(amount), [amount]);
  const durationMs = chips.length * DROP_MS + 140;
  const displayAmount = useCountUp(amount, animate, durationMs, banner.id);
  const side = banner.side || '';

  useEffect(() => {
    if (!animate || !playAudio) return;
    const timers: number[] = [];
    const list = chips.length > 0 ? chips : [{ id: 'x', value: 10_000 }];

    list.forEach((chip, i) => {
      // 매 칩 + 가끔 heavy 로 무게감
      timers.push(
        window.setTimeout(() => {
          const heavy = chip.value >= 500_000 || i === list.length - 1;
          playSfx(heavy ? 'chipHeavy' : 'chip', { throttleMs: 40 });
        }, 30 + index * 60 + i * DROP_MS),
      );
    });

    timers.push(
      window.setTimeout(() => {
        playSfx('betConfirm', { throttleMs: 450 });
      }, 30 + index * 60 + list.length * DROP_MS + 50),
    );

    return () => timers.forEach((id) => clearTimeout(id));
  }, [animate, playAudio, chips, banner.id, index]);

  return (
    <motion.div
      className="flex items-end gap-2.5"
      initial={animate ? { y: -14, scale: 0.9, opacity: 0, rotate: -8 } : false}
      animate={{ y: 0, scale: 1, opacity: 1, rotate: -6 }}
      transition={{ type: 'spring', stiffness: 340, damping: 18, delay: index * 0.05 }}
    >
      <ChipStack amount={amount} compact={compact} animate={animate} />
      <div className="flex flex-col items-start gap-0.5 pb-0.5">
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
 * 로드맵 위 BET IN — 금액만큼 칩이 높이 쌓이며 카운트업
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
          className={`relative flex ${banners.length > 1 ? 'flex-col gap-2' : ''} items-center`}
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
