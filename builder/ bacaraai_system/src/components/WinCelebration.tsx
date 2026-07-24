import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { formatMoney, type LastBetResult } from '../hooks/useSession';
import { useCountUp } from '../hooks/useCountUp';
import { useFxIntensity } from '../hooks/useFxIntensity';
import { playSfx } from '../audio/sfxEngine';

const WIN_LINES = [
  '흐름이 당신 편입니다',
  '깔끔한 한 판',
  '타이밍이 완벽했습니다',
  '침착한 적중',
];

const BIG_WIN_LINES = [
  '오늘 당신은 불타요',
  '잭팟 그 자체!',
  '숨 막히는 한 판!',
  '럭키 스트라이크!',
];

/** 승리 축하용 강렬 글램 이미지 (public/win-glam) — 고액 위주 */
const BASE = import.meta.env.BASE_URL || '/';
const WIN_IMAGES = [
  `${BASE}win-glam/win-glam-01.jpg`,
  `${BASE}win-glam/win-glam-02.jpg`,
  `${BASE}win-glam/win-glam-03.jpg`,
  `${BASE}win-glam/win-glam-04.jpg`,
  `${BASE}win-glam/win-glam-05.jpg`,
  `${BASE}win-glam/win-glam-06.jpg`,
  `${BASE}win-glam/win-glam-07.jpg`,
  `${BASE}win-glam/win-glam-08.jpg`,
];

const SHOW_MS_NORMAL = 3800;
const SHOW_MS_BIG = 5200;
const FRESH_MS = 20_000;
/** 고액 축하 기준: 순익 50만 이상 또는 베팅 100만 이상 */
const BIG_WIN_PNL = 500_000;
const BIG_WIN_STAKE = 1_000_000;

type Props = {
  result: LastBetResult | null;
  onDismiss: () => void;
};

function isFreshWin(result: LastBetResult | null | undefined): result is LastBetResult {
  if (!result || result.won !== true || !(result.amount > 0)) return false;
  return Date.now() - (result.at || 0) < FRESH_MS;
}

function isBigWin(r: LastBetResult) {
  return r.pnlDelta >= BIG_WIN_PNL || r.amount >= BIG_WIN_STAKE;
}

function sideLabel(side: LastBetResult['side']) {
  if (side === 'BANKER') return 'Banker';
  if (side === 'TIE') return 'Tie';
  return 'Player';
}

/** 승리 축하 — 일반은 정보 중심, 고액은 글램 연출 */
export default function WinCelebration({ result, onDismiss }: Props) {
  const { reduced } = useFxIntensity();
  const [held, setHeld] = useState<LastBetResult | null>(null);
  const [imgReady, setImgReady] = useState(false);
  const shownIdsRef = useRef<Set<string>>(new Set());
  const recentImagesRef = useRef<string[]>([]);
  const dismissTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isFreshWin(result)) return;
    if (shownIdsRef.current.has(result.id)) return;
    shownIdsRef.current.add(result.id);
    setHeld(result);
    setImgReady(false);
    playSfx('win');
  }, [result?.id, result?.won, result?.amount, result?.at, result]);

  const open = Boolean(held);
  const display = held;
  const big = display ? isBigWin(display) : false;
  const isAuto = display?.source === 'auto' || /오토/.test(display?.appliedRule || '');

  const line = useMemo(() => {
    if (!display) return WIN_LINES[0];
    const pool = big ? BIG_WIN_LINES : WIN_LINES;
    return pool[Math.abs(display.at) % pool.length];
  }, [display, big]);

  const imageSrc = useMemo(() => {
    if (!display || !big) return WIN_IMAGES[0];
    const recent = recentImagesRef.current;
    let idx = Math.abs(display.at + display.amount * 7) % WIN_IMAGES.length;
    let pick = WIN_IMAGES[idx];
    if (recent.includes(pick) && WIN_IMAGES.length > 1) {
      for (let i = 1; i < WIN_IMAGES.length; i += 1) {
        const alt = WIN_IMAGES[(idx + i) % WIN_IMAGES.length];
        if (!recent.includes(alt)) {
          pick = alt;
          break;
        }
      }
    }
    return pick;
  }, [display, big]);

  useEffect(() => {
    if (!display || !big || !imageSrc) return;
    const recent = recentImagesRef.current;
    if (recent[recent.length - 1] === imageSrc) return;
    recentImagesRef.current = [...recent, imageSrc].slice(-4);
  }, [display, big, imageSrc]);

  const pnlAnim = useCountUp(display?.pnlDelta ?? 0, {
    enabled: open && !reduced && (display?.pnlDelta ?? 0) > 0,
    durationMs: big ? 900 : 650,
    runKey: display?.id ?? 'win',
  });

  const dismiss = () => {
    if (dismissTimerRef.current) {
      window.clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    setHeld(null);
    onDismiss();
  };

  useEffect(() => {
    if (!open || !display) return;
    if (dismissTimerRef.current) window.clearTimeout(dismissTimerRef.current);
    const ms = big ? SHOW_MS_BIG : SHOW_MS_NORMAL;
    dismissTimerRef.current = window.setTimeout(() => {
      dismissTimerRef.current = null;
      setHeld(null);
      onDismiss();
    }, ms);
    return () => {
      if (dismissTimerRef.current) {
        window.clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, display?.id, big]);

  const particleCount = reduced ? 0 : big ? 28 : 10;

  return (
    <AnimatePresence>
      {open && display && (
        <motion.div
          className="fixed inset-0 z-[400] flex items-center justify-center p-3 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
          role="dialog"
          aria-modal="true"
          aria-label="승리 축하"
        >
          <div
            className={`absolute inset-0 backdrop-blur-md ${
              big
                ? 'bg-gradient-to-b from-rose-950/75 via-black/88 to-black/92'
                : 'bg-gradient-to-b from-zinc-950/80 via-black/90 to-black/95'
            }`}
          />

          {particleCount > 0 && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {Array.from({ length: particleCount }).map((_, i) => (
                <motion.span
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    left: `${4 + ((i * 31) % 92)}%`,
                    top: '-5%',
                    width: 3 + (i % 3),
                    height: 3 + (i % 3),
                    backgroundColor: big
                      ? i % 2 === 0
                        ? '#fbbf24'
                        : '#fb7185'
                      : i % 2 === 0
                        ? '#fde68a'
                        : '#a8a29e',
                    boxShadow: big ? '0 0 6px currentColor' : 'none',
                  }}
                  initial={{ y: 0, opacity: 0.9 }}
                  animate={{ y: '110vh', opacity: 0 }}
                  transition={{
                    duration: 1.8 + (i % 5) * 0.25,
                    delay: (i % 7) * 0.05,
                    ease: 'easeIn',
                  }}
                />
              ))}
            </div>
          )}

          <motion.div
            className={`relative w-full overflow-hidden rounded-2xl border bg-zinc-950/95 shadow-2xl ${
              big
                ? 'max-w-[22rem] border-amber-400/45 shadow-[0_0_48px_rgba(251,191,36,0.22)]'
                : 'max-w-[20rem] border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.55)]'
            }`}
            initial={{ scale: 0.92, y: 28, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`absolute inset-x-0 top-0 z-20 h-px ${
                big
                  ? 'bg-gradient-to-r from-transparent via-amber-300 to-transparent'
                  : 'bg-gradient-to-r from-transparent via-white/25 to-transparent'
              }`}
            />

            {big ? (
              <div className="relative h-[18rem] sm:h-[22rem] overflow-hidden bg-zinc-900">
                <motion.img
                  key={imageSrc}
                  src={imageSrc}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover object-[center_18%]"
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{
                    scale: imgReady ? 1.04 : 1.15,
                    opacity: imgReady ? 1 : 0.4,
                  }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  onLoad={() => setImgReady(true)}
                  onError={() => setImgReady(true)}
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                <div className="absolute left-3 top-3 z-10">
                  <span className="rounded-md border border-amber-300/40 bg-amber-500/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-950">
                    {isAuto ? 'AUTO BIG WIN' : 'BIG WIN'}
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-4 pt-12">
                  <p className="mb-1 text-[1.45rem] font-black leading-tight text-white drop-shadow-lg">
                    {line}
                  </p>
                  <p className="font-mono text-3xl font-black tabular-nums text-amber-300 drop-shadow-lg">
                    {formatMoney(pnlAnim, true)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative px-5 pb-2 pt-6 text-center">
                <span className="inline-flex rounded-md border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200/95">
                  {isAuto ? 'AUTO WIN' : 'WIN'}
                </span>
                <p className="mt-3 text-[1.15rem] font-semibold tracking-tight text-zinc-100">
                  {line}
                </p>
                <p className="mt-2 font-mono text-[2rem] font-black tabular-nums text-amber-300">
                  {formatMoney(pnlAnim, true)}
                </p>
              </div>
            )}

            <div className={`px-5 ${big ? 'pt-3' : 'pt-1'} pb-5 text-center`}>
              <div className="mx-auto grid max-w-[16rem] grid-cols-3 gap-2 rounded-xl border border-white/8 bg-black/40 px-3 py-2.5">
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-zinc-500">테이블</p>
                  <p className="mt-0.5 truncate text-[12px] font-bold text-zinc-200">
                    {display.tableName}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-zinc-500">베팅</p>
                  <p className="mt-0.5 text-[12px] font-bold text-zinc-200">
                    {sideLabel(display.side)}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-zinc-500">금액</p>
                  <p className="mt-0.5 font-mono text-[12px] font-bold tabular-nums text-zinc-200">
                    {formatMoney(display.amount)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={dismiss}
                className={`mt-4 w-full rounded-xl py-3.5 text-sm font-bold tracking-wide transition-[filter,transform] active:scale-[0.99] ${
                  big
                    ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 text-zinc-950 shadow-lg shadow-amber-500/20'
                    : 'border border-white/12 bg-zinc-100 text-zinc-950 hover:brightness-110'
                }`}
              >
                계속하기
              </button>
              <p className="mt-2 text-[10px] text-zinc-600">화면을 탭해도 닫힙니다</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
