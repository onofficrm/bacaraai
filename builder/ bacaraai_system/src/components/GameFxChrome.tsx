import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useFxIntensity } from '../hooks/useFxIntensity';

type TickerItem = { id: string; text: string; tone?: 'win' | 'risk' | 'info' };

/** 상단 게임 티커 + 위험 시 화면 가장자리 글로우 */
export default function GameFxChrome({
  riskLevel,
  tickers,
  /** 세션바(게이지)가 열려 있으면 그 아래로 내려 겹침 방지 */
  sessionBarVisible = false,
}: {
  riskLevel: 'none' | 'warn' | 'critical';
  tickers: TickerItem[];
  sessionBarVisible?: boolean;
}) {
  const { reduced, intensity, enableParticles } = useFxIntensity();
  const [visible, setVisible] = useState<TickerItem[]>([]);

  useEffect(() => {
    if (!tickers.length) return;
    const latest = tickers[tickers.length - 1];
    setVisible((prev) => {
      if (prev.some((x) => x.id === latest.id)) return prev;
      return [...prev.filter((x) => x.id !== latest.id).slice(-1), latest];
    });
    const t = window.setTimeout(() => {
      setVisible((prev) => prev.filter((x) => x.id !== latest.id));
    }, intensity === 'high' ? 4200 : 2800);
    return () => window.clearTimeout(t);
  }, [tickers, intensity]);

  // Header min-h 68px + (세션바 ≈ 72~96px). 헤더 z-200 위·게이지와 안 겹치게
  const topOffset = sessionBarVisible
    ? 'top-[calc(4.25rem+5.5rem)] sm:top-[calc(4.25rem+4.75rem)]'
    : 'top-[calc(4.25rem+0.5rem)]';

  return (
    <>
      <AnimatePresence>
        {riskLevel !== 'none' && !reduced && (
          <motion.div
            key={riskLevel}
            className="pointer-events-none fixed inset-0 z-[90]"
            initial={{ opacity: 0 }}
            animate={{ opacity: riskLevel === 'critical' ? 0.55 : 0.35 }}
            exit={{ opacity: 0 }}
            style={{
              boxShadow:
                riskLevel === 'critical'
                  ? 'inset 0 0 80px rgba(244,63,94,0.55), inset 0 0 160px rgba(127,29,29,0.35)'
                  : 'inset 0 0 60px rgba(245,158,11,0.35)',
            }}
          />
        )}
      </AnimatePresence>

      <div
        className={`pointer-events-none fixed ${topOffset} right-3 sm:right-4 z-[210] flex flex-col items-end gap-1.5 max-w-[min(20rem,calc(100vw-1.5rem))]`}
      >
        <AnimatePresence>
          {visible.map((item) => (
            <motion.div
              key={item.id}
              initial={{ x: 24, opacity: 0, scale: 0.96 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: 16, opacity: 0 }}
              className={`w-full text-right text-[11px] sm:text-xs font-bold px-3 py-2 rounded-xl border backdrop-blur-md shadow-lg ${
                item.tone === 'win'
                  ? 'bg-emerald-950/90 border-emerald-400/45 text-emerald-200'
                  : item.tone === 'risk'
                    ? 'bg-rose-950/90 border-rose-400/45 text-rose-200'
                    : 'bg-zinc-950/92 border-zinc-500/45 text-zinc-100'
              }`}
            >
              {enableParticles && item.tone === 'win' ? '✦ ' : ''}
              {item.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
