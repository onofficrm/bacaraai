import { AnimatePresence, motion } from 'motion/react';
import { useFxIntensity } from '../hooks/useFxIntensity';
import {
  autoEventBarClass,
  type AutoTableEvent,
  type AutoTableEventTone,
  type TableBetBanner,
} from '../utils/autoTableEvent';

type Props = {
  event?: AutoTableEvent | null;
  settle?: TableBetBanner | null;
  compact?: boolean;
};

function stampTone(tone: AutoTableEventTone): string {
  switch (tone) {
    case 'risk':
      return 'text-red-200 border-red-400/80 bg-red-950/75';
    case 'hit':
      return 'text-emerald-100 border-emerald-400/80 bg-emerald-950/70';
    case 'miss':
      return 'text-rose-100 border-rose-400/80 bg-rose-950/70';
    case 'ai':
      return 'text-violet-100 border-violet-400/70 bg-violet-950/70';
    case 'pattern':
      return 'text-amber-100 border-amber-400/70 bg-amber-950/70';
    case 'watch':
      return 'text-cyan-100 border-cyan-400/60 bg-cyan-950/65';
    default:
      return 'text-sky-100 border-sky-400/70 bg-zinc-950/70';
  }
}

/**
 * 로드맵 위 상태 스탬프 — 카드 높이를 늘리지 않음
 */
export default function TableEventOverlay({ event = null, settle = null, compact = false }: Props) {
  const { reduced } = useFxIntensity();

  const tone: AutoTableEventTone | null = settle?.tone ?? event?.tone ?? null;
  const badge = settle?.badge ?? event?.badge;
  const label = settle?.label ?? event?.label;
  const betSec = event?.betSec;

  if (!tone || !label) return null;
  // 상시 감시는 레이더/테두리로 충분 — 오버레이 생략
  if (!settle && event?.kind === 'watching') return null;

  const key = settle?.id ?? `${event?.kind}-${label}`;

  return (
    <AnimatePresence>
      <motion.div
        key={key}
        className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded-lg"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div
          className={`absolute inset-0 ${
            tone === 'risk'
              ? 'bg-red-950/35'
              : tone === 'miss'
                ? 'bg-rose-950/25'
                : 'bg-zinc-950/20'
          } backdrop-blur-[1px]`}
        />
        <motion.div
          className={`relative flex flex-col items-center gap-1 -rotate-6 px-1 ${
            compact ? 'max-w-[96%]' : 'max-w-[90%]'
          }`}
          initial={reduced ? false : { scale: 1.2, y: -10, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 360, damping: 18 }}
        >
          {badge && (
            <span
              className={`font-black tracking-widest border-2 px-2.5 py-0.5 rounded-md shadow-lg ${stampTone(tone)} ${
                compact ? 'text-xs' : 'text-sm sm:text-base'
              }`}
            >
              {badge}
            </span>
          )}
          <span
            className={`font-bold text-center px-2 py-1 rounded-md border shadow-md leading-snug ${autoEventBarClass(tone)} ${
              compact ? 'text-[10px]' : 'text-[11px] sm:text-xs'
            }`}
          >
            {label}
            {typeof betSec === 'number' && betSec > 0 && (
              <span
                className={`ml-1.5 font-mono tabular-nums font-black ${
                  betSec <= 10 ? 'animate-pulse' : ''
                }`}
              >
                {betSec}s
              </span>
            )}
          </span>
          {typeof event?.progress === 'number' && event.progress > 0 && (
            <div className="w-24 h-0.5 rounded-full bg-black/50 overflow-hidden mt-0.5">
              <div
                className={`h-full rounded-full transition-[width] duration-200 ease-linear ${
                  tone === 'pattern'
                    ? 'bg-amber-400'
                    : tone === 'ai'
                      ? 'bg-violet-400'
                      : 'bg-sky-400'
                }`}
                style={{ width: `${Math.max(4, Math.round(event.progress * 100))}%` }}
              />
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
