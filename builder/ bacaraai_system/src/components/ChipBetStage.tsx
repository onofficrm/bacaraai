import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';

export type ChipTone = {
  label: string;
  value: number;
  /** Tailwind-ish solid colors as hex for SVG chips */
  fill: string;
  rim: string;
  text: string;
};

export const CHIP_TONES: Record<number, ChipTone> = {
  1000: { label: '1천', value: 1000, fill: '#e4e4e7', rim: '#a1a1aa', text: '#18181b' },
  5000: { label: '5천', value: 5000, fill: '#dc2626', rim: '#7f1d1d', text: '#fff' },
  10000: { label: '1만', value: 10000, fill: '#2563eb', rim: '#1e3a8a', text: '#fff' },
  50000: { label: '5만', value: 50000, fill: '#059669', rim: '#064e3b', text: '#fff' },
  100000: { label: '10만', value: 100000, fill: '#9333ea', rim: '#581c87', text: '#fff' },
  500000: { label: '50만', value: 500000, fill: '#f59e0b', rim: '#92400e', text: '#1c1917' },
  1000000: { label: '100만', value: 1000000, fill: '#18181b', rim: '#ca8a04', text: '#facc15' },
};

export type StackChip = {
  id: string;
  value: number;
};

type Flyer = {
  id: string;
  value: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

const MAX_STACK = 8;
const DENOMS = [1_000_000, 500_000, 100_000, 50_000, 10_000, 5_000, 1_000];

function toneFor(value: number): ChipTone {
  return (
    CHIP_TONES[value] || {
      label: `${Math.round(value / 1000)}천`,
      value,
      fill: '#52525b',
      rim: '#27272a',
      text: '#fff',
    }
  );
}

/** 금액을 큰 단위부터 칩 스택으로 분해 (표시용, 최대 MAX_STACK) */
export function amountToStack(amount: number): StackChip[] {
  let left = Math.max(0, Math.floor(amount));
  const out: StackChip[] = [];
  let seq = 0;
  for (const d of DENOMS) {
    while (left >= d && out.length < MAX_STACK) {
      out.push({ id: `s${seq++}_${d}`, value: d });
      left -= d;
    }
    if (out.length >= MAX_STACK) break;
  }
  return out;
}

function ChipDisc({
  value,
  size = 44,
  className = '',
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  const t = toneFor(value);
  return (
    <div
      className={`relative rounded-full shadow-lg ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 30% 28%, rgba(255,255,255,0.35), transparent 42%), ${t.fill}`,
        boxShadow: `0 2px 0 ${t.rim}, 0 6px 14px rgba(0,0,0,0.35)`,
        border: `3px dashed ${t.rim}`,
      }}
    >
      <span
        className="absolute inset-0 flex items-center justify-center text-[10px] font-black leading-none"
        style={{ color: t.text }}
      >
        {t.label}
      </span>
    </div>
  );
}

/** 슬롯머신 스타일 금액 카운터 */
function SlotAmount({ amount, highlight }: { amount: number; highlight: boolean }) {
  const reduce = useReducedMotion();
  const text = Math.max(0, amount).toLocaleString('ko-KR');
  const chars = text.split('');

  return (
    <div
      className={`relative flex items-baseline justify-end gap-0.5 overflow-hidden rounded-lg px-1 ${
        highlight ? 'ring-2 ring-amber-400/50' : ''
      }`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {chars.map((ch, i) => (
          <motion.span
            key={`${i}-${ch}-${text.length}`}
            className="inline-block font-mono font-black text-white text-2xl leading-none tabular-nums"
            initial={reduce ? false : { y: -18, opacity: 0, filter: 'blur(4px)' }}
            animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
            exit={reduce ? undefined : { y: 14, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 420,
              damping: 22,
              delay: reduce ? 0 : Math.min(i, 6) * 0.03,
            }}
          >
            {ch}
          </motion.span>
        ))}
      </AnimatePresence>
      <span className="text-zinc-500 text-xs ml-1 shrink-0">원</span>
      {highlight && !reduce && (
        <motion.span
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-amber-300/25 to-transparent"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        />
      )}
    </div>
  );
}

type ChipBetStageProps = {
  amount: number;
  sideLabel: string;
  sideClassName: string;
  borderClassName: string;
  stack: StackChip[];
  flyers: Flyer[];
  onFlyerDone: (id: string) => void;
  celebrating?: boolean;
  burstKey?: number;
  stackAnchorRef?: RefObject<HTMLDivElement | null>;
};

export default function ChipBetStage({
  amount,
  sideLabel,
  sideClassName,
  borderClassName,
  stack,
  flyers,
  onFlyerDone,
  celebrating = false,
  burstKey = 0,
  stackAnchorRef,
}: ChipBetStageProps) {
  const reduce = useReducedMotion();
  const localStackRef = useRef<HTMLDivElement>(null);
  const stackRef = stackAnchorRef || localStackRef;
  const [highlight, setHighlight] = useState(false);
  const prevAmount = useRef(amount);

  useEffect(() => {
    if (amount !== prevAmount.current) {
      setHighlight(true);
      const t = window.setTimeout(() => setHighlight(false), 480);
      prevAmount.current = amount;
      return () => window.clearTimeout(t);
    }
  }, [amount]);

  const visibleStack = useMemo(() => stack.slice(-MAX_STACK), [stack]);

  return (
    <div
      className={`relative bg-zinc-950 border rounded-xl px-3 py-3 overflow-hidden ${borderClassName} ${
        celebrating ? 'shadow-[0_0_28px_rgba(59,130,246,0.35)]' : ''
      }`}
    >
      {/* click burst */}
      <AnimatePresence>
        {burstKey > 0 && !reduce && (
          <motion.div
            key={burstKey}
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55 }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full bg-amber-300"
                initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                animate={{
                  x: Math.cos((i / 8) * Math.PI * 2) * (36 + (i % 3) * 10),
                  y: Math.sin((i / 8) * Math.PI * 2) * (22 + (i % 3) * 8),
                  scale: 0,
                  opacity: 0,
                }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3">
        <div ref={stackRef} className="relative w-[72px] h-[64px] shrink-0">
          <div className="absolute inset-x-0 bottom-0 h-2 rounded-full bg-black/40 blur-[2px]" />
          <AnimatePresence initial={false}>
            {visibleStack.length === 0 ? (
              <motion.div
                key="empty"
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="w-11 h-11 rounded-full border border-dashed border-zinc-700 bg-zinc-900/80" />
              </motion.div>
            ) : (
              visibleStack.map((chip, index) => (
                <motion.div
                  key={chip.id}
                  className="absolute left-1/2 -translate-x-1/2"
                  style={{ zIndex: index + 1 }}
                  initial={
                    reduce
                      ? false
                      : { y: -28, scale: 0.6, opacity: 0, rotate: -18 }
                  }
                  animate={{
                    y: -index * 5,
                    scale: 1,
                    opacity: 1,
                    rotate: (index % 2 === 0 ? -1 : 1) * Math.min(index, 3),
                  }}
                  exit={
                    reduce
                      ? { opacity: 0 }
                      : { y: 24, opacity: 0, scale: 0.7, rotate: 12 }
                  }
                  transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                >
                  <ChipDisc value={chip.value} size={46} />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className={`text-sm font-bold ${sideClassName}`}>{sideLabel}</span>
            {celebrating && (
              <motion.span
                className="text-[10px] font-black tracking-wider text-sky-300 uppercase"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                Bet Ready
              </motion.span>
            )}
          </div>
          <SlotAmount amount={amount} highlight={highlight || celebrating} />
        </div>
      </div>

      {/* flying chips portal layer (relative to stage) */}
      <AnimatePresence>
        {flyers.map((f) => (
          <motion.div
            key={f.id}
            className="pointer-events-none fixed z-[80]"
            style={{ left: 0, top: 0 }}
            initial={{ x: f.fromX, y: f.fromY, scale: 1, opacity: 1, rotate: -20 }}
            animate={{
              x: f.toX,
              y: f.toY,
              scale: 0.85,
              opacity: 1,
              rotate: 12,
            }}
            exit={{ opacity: 0, scale: 0.4 }}
            transition={{ duration: reduce ? 0.01 : 0.42, ease: [0.2, 0.8, 0.2, 1] }}
            onAnimationComplete={() => onFlyerDone(f.id)}
          >
            <ChipDisc value={f.value} size={40} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export type ChipClickPayload = {
  value: number;
  clientX: number;
  clientY: number;
};

/** 스택 앵커(화면 좌표) 계산용 */
export function getStackAnchor(el: HTMLElement | null): { x: number; y: number } {
  if (!el) {
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2 - 20, y: r.top + r.height / 2 - 28 };
}

export function createFlyer(
  value: number,
  from: { x: number; y: number },
  to: { x: number; y: number },
): Flyer {
  return {
    id: `fly_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    value,
    fromX: from.x,
    fromY: from.y,
    toX: to.x,
    toY: to.y,
  };
}

export { type Flyer };
