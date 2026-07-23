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
  /** full: 선택 팔레트 / mini: 스택 맨 앞 / none: 색만 */
  label = 'full',
}: {
  value: number;
  size?: number;
  className?: string;
  label?: 'full' | 'mini' | 'none';
}) {
  const t = toneFor(value);
  const borderW = size >= 40 ? 3 : 2;
  return (
    <div
      className={`relative rounded-full shadow-lg ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 30% 28%, rgba(255,255,255,0.35), transparent 42%), ${t.fill}`,
        boxShadow: `0 2px 0 ${t.rim}, 0 6px 14px rgba(0,0,0,0.35)`,
        border: `${borderW}px dashed ${t.rim}`,
      }}
    >
      {label !== 'none' && (
        <span
          className={`absolute inset-0 flex items-center justify-center font-black leading-none pointer-events-none ${
            label === 'mini'
              ? 'text-[7px] opacity-90'
              : size >= 44
                ? 'text-[10px]'
                : 'text-[9px]'
          }`}
          style={{
            color: t.text,
            textShadow:
              label === 'mini'
                ? '0 1px 2px rgba(0,0,0,0.45)'
                : undefined,
          }}
        >
          {t.label}
        </span>
      )}
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
  const stageRef = useRef<HTMLDivElement>(null);
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

  const stageRect = () => stageRef.current?.getBoundingClientRect();

  return (
    <div
      ref={stageRef}
      className={`relative isolate bg-zinc-950 border rounded-xl px-3 py-3 overflow-hidden ${borderClassName} ${
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
        {/* 가로 팬 스택 — 칩끼리 살짝 겹침 */}
        <div
          ref={stackRef}
          className="relative h-[52px] shrink-0"
          style={{
            width: Math.max(56, 36 + Math.max(0, visibleStack.length - 1) * 14),
          }}
        >
          <div className="absolute left-2 right-2 bottom-0.5 h-1.5 rounded-full bg-black/35 blur-[1.5px]" />
          <AnimatePresence initial={false}>
            {visibleStack.length === 0 ? (
              <motion.div
                key="empty"
                className="absolute inset-0 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="w-10 h-10 rounded-full border border-dashed border-zinc-700 bg-zinc-900/80" />
              </motion.div>
            ) : (
              visibleStack.map((chip, index) => {
                const isFront = index === visibleStack.length - 1;
                const fanX = index * 14;
                const fanY = Math.abs(index - (visibleStack.length - 1) / 2) * 0.6;
                const fanRot = (index - (visibleStack.length - 1) / 2) * 4;
                return (
                  <motion.div
                    key={chip.id}
                    className="absolute left-0 top-1/2 -translate-y-1/2"
                    style={{ zIndex: index + 1 }}
                    initial={
                      reduce
                        ? false
                        : { x: fanX + 28, y: -18, scale: 0.55, opacity: 0, rotate: fanRot - 20 }
                    }
                    animate={{
                      x: fanX,
                      y: fanY,
                      scale: isFront ? 1 : 0.94,
                      opacity: 1,
                      rotate: fanRot,
                    }}
                    exit={
                      reduce
                        ? { opacity: 0 }
                        : { x: fanX + 12, y: 16, opacity: 0, scale: 0.65, rotate: fanRot + 14 }
                    }
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <ChipDisc
                      value={chip.value}
                      size={isFront ? 42 : 38}
                      label={isFront ? 'mini' : 'none'}
                    />
                  </motion.div>
                );
              })
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

      {/* flying chips — stage 내부 absolute (탭/헤더 위로 뜨지 않음) */}
      <AnimatePresence>
        {flyers.map((f) => {
          const rect = stageRect();
          const ox = rect?.left ?? 0;
          const oy = rect?.top ?? 0;
          return (
            <motion.div
              key={f.id}
              className="pointer-events-none absolute z-[5]"
              style={{ left: 0, top: 0 }}
              initial={{
                x: f.fromX - ox,
                y: f.fromY - oy,
                scale: 1,
                opacity: 1,
                rotate: -20,
              }}
              animate={{
                x: f.toX - ox,
                y: f.toY - oy,
                scale: 0.85,
                opacity: 1,
                rotate: 12,
              }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={{ duration: reduce ? 0.01 : 0.42, ease: [0.2, 0.8, 0.2, 1] }}
              onAnimationComplete={() => onFlyerDone(f.id)}
            >
              <ChipDisc value={f.value} size={36} label="mini" />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export type ChipClickPayload = {
  value: number;
  clientX: number;
  clientY: number;
};

/** 스택 앵커(화면 좌표) — 가로 팬의 맨 앞 칩 위치 */
export function getStackAnchor(el: HTMLElement | null): { x: number; y: number } {
  if (!el) {
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }
  const r = el.getBoundingClientRect();
  return { x: r.right - 28, y: r.top + r.height / 2 - 20 };
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
