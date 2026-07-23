import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useFxIntensity } from '../hooks/useFxIntensity';

type TickerItem = { id: string; text: string; tone?: 'win' | 'risk' | 'info' };

/** 상단 게임 티커 + 위험 시 화면 가장자리 글로우 */
export default function GameFxChrome({
  riskLevel,
  tickers,
}: {
  riskLevel: 'none' | 'warn' | 'critical';
  tickers: TickerItem[];
}) {
  const { reduced, intensity, enableParticles } = useFxIntensity();
  const [visible, setVisible] = useState<TickerItem[]>([]);

  useEffect(() => {
    if (!tickers.length) return;
    const latest = tickers[tickers.length - 1];
    setVisible((prev) => [...prev.slice(-2), latest]);
    const t = window.setTimeout(() => {
      setVisible((prev) => prev.filter((x) => x.id !== latest.id));
    }, intensity === 'high' ? 4200 : 2800);
    return () => window.clearTimeout(t);
  }, [tickers, intensity]);

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

      <div className="pointer-events-none fixed top-14 left-0 right-0 z-[95] flex flex-col items-center gap-1 px-3">
        <AnimatePresence>
          {visible.map((item) => (
            <motion.div
              key={item.id}
              initial={{ y: -16, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -10, opacity: 0 }}
              className={`max-w-md w-full text-center text-[11px] font-bold px-3 py-1.5 rounded-full border backdrop-blur-md shadow-lg ${
                item.tone === 'win'
                  ? 'bg-emerald-950/80 border-emerald-400/40 text-emerald-200'
                  : item.tone === 'risk'
                    ? 'bg-rose-950/80 border-rose-400/40 text-rose-200'
                    : 'bg-zinc-950/85 border-zinc-500/40 text-zinc-200'
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
