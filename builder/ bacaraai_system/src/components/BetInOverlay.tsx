import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CHIP_TONES } from './ChipBetStage';
import { playSfx } from '../audio/sfxEngine';
import { useFxIntensity } from '../hooks/useFxIntensity';
import type { TableBetBanner } from '../utils/autoTableEvent';

const DROP_MS = 48;
const DENOMS = [1_000_000, 500_000, 100_000, 50_000, 10_000, 5_000, 1_000] as const;

type PlacedChip = {
  id: string;
  value: number;
  /** 기둥 인덱스 */
  col: number;
  /** 기둥 안 높이 (0=바닥) */
  level: number;
  /** 전경 기울어진 칩 */
  leanDeg?: number;
  role: 'stack' | 'lean';
  /** 드롭 순서 */
  order: number;
};

/** 금액 → 총 칩 장수 (산처럼 보이도록 넉넉히) */
function betInChipCount(amount: number, compact?: boolean): number {
  const n = Math.max(0, Math.floor(amount));
  let count = 4;
  if (n >= 5_000_000) count = 28;
  else if (n >= 2_000_000) count = 24;
  else if (n >= 1_000_000) count = 22;
  else if (n >= 700_000) count = 18;
  else if (n >= 500_000) count = 16;
  else if (n >= 200_000) count = 14;
  else if (n >= 100_000) count = 12;
  else if (n >= 50_000) count = 10;
  else if (n >= 20_000) count = 8;
  else if (n >= 10_000) count = 6;
  // 모바일: 로드맵 높이에 맞게 장수·기둥 축소
  if (compact) count = Math.max(5, Math.round(count * 0.72));
  return count;
}

function columnCount(amount: number, compact?: boolean): number {
  const n = Math.max(0, Math.floor(amount));
  let cols = 2;
  if (n >= 1_000_000) cols = 5;
  else if (n >= 500_000) cols = 4;
  else if (n >= 100_000) cols = 3;
  if (compact) cols = Math.min(cols, 4);
  return cols;
}

function paletteFor(amount: number, compact?: boolean): number[] {
  const n = Math.max(0, Math.floor(amount));
  const ideal = Math.max(1_000, Math.round(n / Math.max(1, betInChipCount(n, compact))));
  const unit = [...DENOMS].sort((a, b) => Math.abs(a - ideal) - Math.abs(b - ideal))[0];
  const list = DENOMS.filter((d) => d <= Math.max(unit * 5, 100_000) && d >= Math.min(unit, 10_000));
  return list.length > 0 ? [...list] : [unit];
}

/**
 * 여러 기둥 + 전경 기울기 칩으로 "산" 형태의 파일 구성
 */
function buildChipPile(amount: number, compact?: boolean): PlacedChip[] {
  const total = betInChipCount(amount, compact);
  const cols = columnCount(amount, compact);
  const palette = paletteFor(amount, compact);
  const out: PlacedChip[] = [];
  let order = 0;
  let seq = 0;

  const weights = Array.from({ length: cols }, (_, i) => {
    const mid = (cols - 1) / 2;
    return 1.15 - Math.abs(i - mid) * 0.22;
  });
  const wSum = weights.reduce((a, b) => a + b, 0);
  const leanCount = compact
    ? Math.min(2, Math.max(1, Math.floor(cols * 0.6)))
    : Math.min(3, Math.max(2, Math.floor(cols * 0.7)));
  const stackBudget = Math.max(cols * 2, total - leanCount);

  const heights = weights.map((w) => Math.max(2, Math.round((w / wSum) * stackBudget)));
  let hSum = heights.reduce((a, b) => a + b, 0);
  while (hSum > stackBudget && heights.some((h) => h > 2)) {
    const i = heights.indexOf(Math.max(...heights));
    heights[i] -= 1;
    hSum -= 1;
  }
  while (hSum < stackBudget) {
    const mid = Math.floor(cols / 2);
    heights[mid] += 1;
    hSum += 1;
  }

  for (let c = 0; c < cols; c++) {
    for (let level = 0; level < heights[c]; level++) {
      const value = palette[(c + level) % palette.length];
      out.push({
        id: `s${seq++}`,
        value,
        col: c,
        level,
        role: 'stack',
        order: order++,
      });
    }
  }

  const leanAngles = compact ? [-28, 26] : [-36, -16, 24, 38];
  for (let i = 0; i < leanCount; i++) {
    out.push({
      id: `l${seq++}`,
      value: palette[i % palette.length],
      col: Math.min(cols - 1, Math.floor((i / leanCount) * cols)),
      level: 0,
      leanDeg: leanAngles[i % leanAngles.length],
      role: 'lean',
      order: order++,
    });
  }

  return out;
}

function toneOf(value: number) {
  return (
    CHIP_TONES[value] || {
      fill: '#52525b',
      rim: '#27272a',
      text: '#fff',
      label: '',
      value,
    }
  );
}

/** 두께감 있는 카지노 칩 */
function ThickChip({
  value,
  size,
  animate,
  delay,
  style,
  leanDeg = 0,
}: {
  value: number;
  size: number;
  animate: boolean;
  delay: number;
  style: CSSProperties;
  leanDeg?: number;
}) {
  const tone = toneOf(value);
  const thick = Math.max(3, Math.round(size * 0.12));

  return (
    <motion.div
      className="absolute"
      style={{
        width: size,
        height: size,
        ...style,
      }}
      initial={
        animate
          ? { y: -70, opacity: 0, scale: 0.4, rotate: leanDeg - 25 }
          : false
      }
      animate={{
        y: 0,
        opacity: 1,
        scale: 1,
        rotate: leanDeg,
      }}
      transition={
        animate
          ? { type: 'spring', stiffness: 480, damping: 14, delay }
          : { duration: 0 }
      }
    >
      {/* 옆면(두께) */}
      <span
        className="absolute inset-x-0 bottom-0 rounded-full"
        style={{
          height: size * 0.55,
          top: size * 0.42,
          background: `linear-gradient(180deg, ${tone.rim} 0%, ${tone.fill} 40%, ${tone.rim} 100%)`,
          boxShadow: `0 ${thick}px ${thick + 4}px rgba(0,0,0,0.45)`,
        }}
      />
      {/* 윗면 — 금액 텍스트 없음 */}
      <span
        className="absolute inset-0 rounded-full border-[3px]"
        style={{
          background: `
            radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55), transparent 40%),
            radial-gradient(circle at 70% 75%, rgba(0,0,0,0.25), transparent 45%),
            ${tone.fill}
          `,
          borderColor: tone.rim,
          boxShadow: `
            inset 0 0 0 3px rgba(255,255,255,0.2),
            inset 0 0 0 6px ${tone.rim}55,
            0 1px 0 ${tone.rim}
          `,
        }}
      >
        <span
          className="absolute inset-[5px] rounded-full border border-dashed opacity-50"
          style={{ borderColor: 'rgba(255,255,255,0.55)' }}
        />
      </span>
    </motion.div>
  );
}

function ChipPile({
  amount,
  compact,
  animate,
}: {
  amount: number;
  compact?: boolean;
  animate: boolean;
}) {
  const chips = useMemo(() => buildChipPile(amount, compact), [amount, compact]);
  const cols = columnCount(amount, compact);
  // 로드맵(sm≈132px) 안에 들어가도록 — 데스크톱도 과도하게 키우지 않음
  const chipSize = compact ? 20 : 26;
  const colGap = compact ? 12 : 16;
  const stepY = compact ? 3.4 : 4.2;
  const pileW = chipSize + (cols - 1) * colGap + chipSize * 0.5;
  const maxLevel = chips.reduce((m, c) => (c.role === 'stack' ? Math.max(m, c.level) : m), 0);
  const pileH = chipSize * 0.7 + maxLevel * stepY + chipSize * 0.7;

  return (
    <div
      className="relative shrink-0"
      style={{ width: pileW, height: Math.min(pileH, compact ? 88 : 108) }}
      aria-hidden
    >
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-[50%] bg-black/40 blur-md"
        style={{
          bottom: 2,
          width: pileW * 0.85,
          height: chipSize * 0.28,
        }}
      />

      {chips
        .filter((c) => c.role === 'stack')
        .map((chip) => {
          const x = chip.col * colGap + (chip.level % 2 === 0 ? 0 : 1);
          const y = chip.level * stepY;
          return (
            <ThickChip
              key={chip.id}
              value={chip.value}
              size={chipSize}
              animate={animate}
              delay={chip.order * (DROP_MS / 1000)}
              style={{
                left: x,
                bottom: 8 + y,
                zIndex: 10 + chip.col + chip.level,
              }}
            />
          );
        })}

      {chips
        .filter((c) => c.role === 'lean')
        .map((chip, i) => {
          const x =
            i * (chipSize * 0.5) + (cols > 2 ? chipSize * 0.1 : 0) - chipSize * 0.08;
          return (
            <ThickChip
              key={chip.id}
              value={chip.value}
              size={chipSize * 0.9}
              animate={animate}
              delay={chip.order * (DROP_MS / 1000)}
              leanDeg={chip.leanDeg ?? 0}
              style={{
                left: Math.max(-2, Math.min(pileW - chipSize, x)),
                bottom: 0,
                zIndex: 40 + i,
              }}
            />
          );
        })}
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
  const chips = useMemo(() => buildChipPile(amount, compact), [amount, compact]);
  const durationMs = Math.min(1100, chips.length * DROP_MS + 160);
  const displayAmount = useCountUp(amount, animate, durationMs, banner.id);
  const side = banner.side || '';

  useEffect(() => {
    if (!animate || !playAudio) return;
    const timers: number[] = [];
    const list = chips.length > 0 ? chips : [{ order: 0, value: 10_000, id: 'x' } as PlacedChip];

    list.forEach((chip, i) => {
      if (i % 2 !== 0 && i !== list.length - 1) return;
      timers.push(
        window.setTimeout(() => {
          const heavy = chip.value >= 500_000 || i === list.length - 1;
          playSfx(heavy ? 'chipHeavy' : 'chip', { throttleMs: 35 });
        }, 20 + index * 50 + chip.order * DROP_MS),
      );
    });

    timers.push(
      window.setTimeout(() => {
        playSfx('betConfirm', { throttleMs: 450 });
      }, 20 + index * 50 + list.length * DROP_MS + 40),
    );

    return () => timers.forEach((id) => clearTimeout(id));
  }, [animate, playAudio, chips, banner.id, index]);

  return (
    <motion.div
      className="flex items-end gap-1.5 sm:gap-2 max-w-full origin-center"
      initial={animate ? { y: -10, scale: 0.9, opacity: 0, rotate: -6 } : false}
      animate={{ y: 0, scale: compact ? 0.9 : 1, opacity: 1, rotate: -4 }}
      transition={{ type: 'spring', stiffness: 320, damping: 18, delay: index * 0.05 }}
    >
      <ChipPile amount={amount} compact={compact} animate={animate} />
      <div className="flex flex-col items-start gap-0.5 min-w-0 pb-0.5">
        <motion.span
          className={`font-black tracking-widest border-2 px-2 py-0.5 rounded-md bg-black/65 shadow-lg ${
            isAuto ? 'text-amber-200 border-amber-400/70' : 'text-sky-100 border-sky-400/70'
          } ${compact ? 'text-[10px]' : 'text-xs sm:text-sm'}`}
          initial={animate ? { scale: 1.25, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 16, delay: animate ? 0.06 : 0 }}
        >
          BET IN
        </motion.span>
        <span
          className={`font-mono font-bold px-1.5 py-0.5 rounded bg-black/60 border border-white/10 tabular-nums truncate max-w-[11rem] sm:max-w-[14rem] ${
            compact ? 'text-[9px]' : 'text-[10px] sm:text-[11px]'
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
 * 로드맵 위 BET IN — 여러 기둥 칩 산 + 금액 카운트업
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
        className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded-lg px-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-zinc-950/30 backdrop-blur-[1px]" />
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
