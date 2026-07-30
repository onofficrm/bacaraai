import { useMemo } from 'react';
import { TrendingUp, ShieldCheck, Flag, Sparkles } from 'lucide-react';
import { generateSimWinFeed, type SimFeedItem, type SimFeedKind } from '../utils/simWinFeed';

const KIND_STYLE: Record<
  SimFeedKind,
  { icon: typeof TrendingUp; tint: string; dot: string }
> = {
  win: { icon: TrendingUp, tint: 'text-emerald-400', dot: 'bg-emerald-400' },
  wincut: { icon: Flag, tint: 'text-amber-400', dot: 'bg-amber-400' },
  losscut: { icon: ShieldCheck, tint: 'text-sky-400', dot: 'bg-sky-400' },
  rule: { icon: Sparkles, tint: 'text-zinc-300', dot: 'bg-zinc-400' },
};

function FeedRow({ item }: { item: SimFeedItem }) {
  const style = KIND_STYLE[item.kind];
  const Icon = style.icon;
  return (
    <div className="flex items-start gap-3 px-1 py-2.5 border-b border-zinc-800/60">
      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
      <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${style.tint}`} aria-hidden />
      <p className="text-[13px] leading-snug text-zinc-300">{item.text}</p>
    </div>
  );
}

type SimWinFeedMarqueeProps = {
  /** 보이는 영역 높이 */
  heightClass?: string;
  className?: string;
};

/**
 * 세로 무한 스크롤 시뮬레이션 피드 (A안).
 * prefers-reduced-motion 이면 스크롤 정지 + 상위 N줄만 표시.
 */
export default function SimWinFeedMarquee({
  heightClass = 'h-[280px]',
  className = '',
}: SimWinFeedMarqueeProps) {
  const items = useMemo(() => generateSimWinFeed(28), []);
  const loop = useMemo(() => [...items, ...items], [items]);

  return (
    <div className={`w-full min-w-0 ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase">
            오늘 시뮬레이션 피드
          </span>
        </div>
        <span className="text-[10px] text-zinc-600">연습머니 · 데모</span>
      </div>

      <div
        className={`relative overflow-hidden ${heightClass} mask-[linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]`}
        style={{
          maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)',
        }}
      >
        <div className="sim-win-marquee-track will-change-transform">
          {loop.map((item, idx) => (
            <FeedRow key={`${item.id}-${idx}`} item={item} />
          ))}
        </div>

        {/* reduced motion: 정적 목록 */}
        <div className="sim-win-marquee-static hidden absolute inset-0 overflow-hidden">
          {items.slice(0, 8).map((item) => (
            <FeedRow key={`static-${item.id}`} item={item} />
          ))}
        </div>
      </div>

      <p className="mt-3 text-[11px] text-zinc-600 leading-relaxed">
        ※ 연습·데모 피드이며 실제 수익을 보장하지 않습니다. 닉네임·금액은 마케팅용 가상 데이터입니다.
      </p>

      <style>{`
        @keyframes sim-win-marquee-up {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(0, -50%, 0); }
        }
        .sim-win-marquee-track {
          animation: sim-win-marquee-up 48s linear infinite;
        }
        .sim-win-marquee-track:hover {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .sim-win-marquee-track {
            display: none;
          }
          .sim-win-marquee-static {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
