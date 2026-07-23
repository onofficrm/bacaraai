import { getResultColor, getResultLabel } from '../utils/colors';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Star, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AiOpinion, TableData } from '../types';
import { STATUS_GUIDE } from '../help/glossary';
import Roadmap from './Roadmap';
import TableAiSlot from './TableAiSlot';
import { getBettingRemainingSecForTable } from '../hooks/useBettingWindow';
import { useFxIntensity } from '../hooks/useFxIntensity';
import { playSfx } from '../audio/sfxEngine';
import WinFlipOverlay from './WinFlipOverlay';
import {
  autoEventBarClass,
  autoEventCardClass,
  type AutoTableEvent,
  type TableBetBanner,
} from '../utils/autoTableEvent';

interface TableCardProps {
  table: TableData;
  isSelected?: boolean;
  isFavorite?: boolean;
  beginnerMode?: boolean;
  /** 좁은 화면: 패딩·부수 정보 축소 */
  compact?: boolean;
  autoWatching?: boolean;
  autoLockOn?: boolean;
  autoHit?: boolean;
  /** 오토 베팅 접수됨 */
  autoBetIn?: boolean;
  /** 오토/베팅 실시간 이벤트 (테두리) */
  autoEvent?: AutoTableEvent | null;
  /** 이 테이블 진행 중 베팅 줄 (직접·오토) */
  betBanners?: TableBetBanner[];
  /** 최근 정산 플래시 */
  settleBanner?: TableBetBanner | null;
  onSelect?: (id: string) => void;
  onZoom?: (id: string) => void;
  onToggleFavorite?: (id: string, e: React.MouseEvent) => void;
}

function parseStreakCount(streak: string): number {
  const m = streak.match(/(\d+)\s*연속/);
  return m ? Number(m[1]) : 0;
}

export default function TableCard({
  table,
  isSelected,
  isFavorite,
  beginnerMode = true,
  compact = false,
  autoWatching = false,
  autoLockOn = false,
  autoHit = false,
  autoBetIn = false,
  autoEvent = null,
  betBanners = [],
  settleBanner = null,
  onSelect,
  onZoom,
  onToggleFavorite,
}: TableCardProps) {
  const { reduced, enableRadar, intensity } = useFxIntensity();
  const [hitFlash, setHitFlash] = useState<'P' | 'B' | 'T' | null>(null);
  const [hitBurst, setHitBurst] = useState(0);
  const [betSec, setBetSec] = useState(0);
  const [streakPop, setStreakPop] = useState(false);
  const [streakBreak, setStreakBreak] = useState(false);
  const prevLatestRef = useRef<number | null | undefined>(undefined);
  const prevStreakRef = useRef(table.stats.currentStreak);

  const isPassive = ['WAIT', 'SKIP', 'PAUSE', 'STOP', 'ERROR', 'DATA_ERROR'].includes(
    table.ai.finalOpinion,
  );
  const analyzing = table.status === 'analyzing';
  const ruleFocus = table.status === 'rule_triggered' || table.status === 'waiting_user';
  const streakCount = useMemo(
    () => parseStreakCount(table.stats.currentStreak),
    [table.stats.currentStreak],
  );
  const showStreakBadge = streakCount >= 3;

  useEffect(() => {
    const id = table.live?.latestId ?? null;
    if (prevLatestRef.current === undefined) {
      prevLatestRef.current = id;
      return;
    }
    if (id != null && id !== prevLatestRef.current) {
      const last = table.stats.recentResults[table.stats.recentResults.length - 1];
      if (last === 'P' || last === 'B' || last === 'T') {
        setHitFlash(last);
        setHitBurst((n) => n + 1);
        if (!reduced) playSfx('tick');
        const t = window.setTimeout(() => setHitFlash(null), intensity === 'high' ? 700 : 450);
        prevLatestRef.current = id;
        return () => window.clearTimeout(t);
      }
    }
    prevLatestRef.current = id;
  }, [table.live?.latestId, table.stats.recentResults, reduced, intensity]);

  useEffect(() => {
    const prev = prevStreakRef.current;
    const next = table.stats.currentStreak;
    if (prev === next) return;
    const prevN = parseStreakCount(prev);
    const nextN = parseStreakCount(next);
    if (nextN >= 3 && nextN > prevN) {
      setStreakPop(true);
      if (!reduced) playSfx('ruleTrigger', { throttleMs: 900 });
      const t = window.setTimeout(() => setStreakPop(false), 700);
      prevStreakRef.current = next;
      return () => window.clearTimeout(t);
    }
    if (prevN >= 3 && nextN < prevN) {
      setStreakBreak(true);
      const t = window.setTimeout(() => setStreakBreak(false), 500);
      prevStreakRef.current = next;
      return () => window.clearTimeout(t);
    }
    prevStreakRef.current = next;
  }, [table.stats.currentStreak, reduced]);

  useEffect(() => {
    if (!table.live) {
      setBetSec(0);
      return;
    }
    const tick = () => setBetSec(getBettingRemainingSecForTable(table));
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [table]);

  const lastResult = table.stats.recentResults[table.stats.recentResults.length - 1] ?? null;
  const lastResultLabel =
    lastResult === 'P' ? 'P' : lastResult === 'B' ? 'B' : lastResult === 'T' ? 'T' : null;

  const flashClass =
    hitFlash === 'P'
      ? 'ring-2 ring-blue-400 shadow-[0_0_24px_rgba(59,130,246,0.45)]'
      : hitFlash === 'B'
        ? 'ring-2 ring-red-400 shadow-[0_0_24px_rgba(248,113,113,0.45)]'
        : hitFlash === 'T'
          ? 'ring-2 ring-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.4)]'
          : '';

  let cardClass =
    `bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all group rounded-xl flex flex-col relative cursor-pointer overflow-hidden ${
      compact ? 'p-2.5 gap-2' : 'p-3 sm:p-3.5 gap-2.5'
    } `;
  const hasBetMarker = betBanners.length > 0 || Boolean(settleBanner);
  // 진행 중 베팅/정산이 선택 테두리보다 우선 — 어디에 걸었는지 유지
  if (isSelected && !hasBetMarker && !autoEvent) {
    cardClass +=
      ' ring-2 ring-amber-500 border-amber-500/60 shadow-lg shadow-amber-900/20 selected-pulse ';
  } else if (isSelected && (hasBetMarker || autoEvent)) {
    cardClass += ' selected-pulse ';
  }
  if (ruleFocus && !autoEvent && !hasBetMarker) {
    cardClass += ' border-amber-400/70 rule-focus-pulse scale-[1.01] ';
  } else if (table.status === 'risk_blocked' && !autoEvent) {
    cardClass += ' border-red-900/50 ';
  }
  if (autoEvent) {
    cardClass += autoEventCardClass(autoEvent, reduced);
  } else if (autoLockOn) {
    cardClass += ' ring-2 ring-sky-400/80 shadow-[0_0_20px_rgba(56,189,248,0.35)] ';
  }
  if (flashClass) cardClass += ` ${flashClass} `;

  const betProgress = betSec > 0 ? betSec / 30 : 0;
  const amountText = isPassive
    ? '-'
    : table.ai.recommendedAmount > 0
      ? `${table.ai.recommendedAmount.toLocaleString()}원`
      : '-';
  const aiModeLabel = table.ai.autoBetAllowed
    ? '자동'
    : table.ai.shadowMode
      ? '참고'
      : 'AI';

  const streakTone = table.stats.currentStreak.includes('Player')
    ? 'text-blue-400 border-blue-400/40 bg-blue-500/10'
    : table.stats.currentStreak.includes('Banker')
      ? 'text-red-400 border-red-400/40 bg-red-500/10'
      : 'text-emerald-400 border-emerald-400/40 bg-emerald-500/10';

  const particleCount = intensity === 'high' ? 10 : intensity === 'medium' ? 6 : 0;
  const showWinFlip = Boolean(settleBanner && settleBanner.tone === 'hit' && !reduced);
  const showMissFlash = Boolean(settleBanner && settleBanner.tone === 'miss');
  const winFlipIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!showWinFlip || !settleBanner) return;
    if (winFlipIdRef.current === settleBanner.id) return;
    winFlipIdRef.current = settleBanner.id;
    playSfx('win', { throttleMs: 1200 });
  }, [showWinFlip, settleBanner]);

  return (
    <div
      className={`${cardClass}${showMissFlash && !reduced ? ' auto-event-shake' : ''}`}
      onClick={() => onSelect?.(table.id)}
      style={showWinFlip ? { perspective: 900 } : undefined}
    >
      <AnimatePresence>
        {showWinFlip && settleBanner && (
          <WinFlipOverlay key={settleBanner.id} banner={settleBanner} compact={compact} />
        )}
      </AnimatePresence>
      {betSec > 0 && (
        <div
          className="pointer-events-none absolute inset-0 rounded-xl z-[1]"
          style={{
            boxShadow: `inset 0 0 0 2px rgba(56,189,248,${0.25 + betProgress * 0.55})`,
          }}
        />
      )}

      {autoWatching && enableRadar && !reduced && autoEvent?.kind === 'watching' && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl z-[1] opacity-30">
          <div className="absolute inset-[-40%] auto-radar-sweep bg-[conic-gradient(from_0deg,transparent_0deg,rgba(34,211,238,0.32)_40deg,transparent_80deg)]" />
        </div>
      )}

      {autoEvent && autoEvent.tone === 'ai' && !reduced && (
        <div className="pointer-events-none absolute inset-0 z-[1] rounded-xl bg-[radial-gradient(ellipse_at_50%_0%,rgba(167,139,250,0.14),transparent_55%)]" />
      )}
      {autoEvent && autoEvent.tone === 'pattern' && !reduced && (
        <div className="pointer-events-none absolute inset-0 z-[1] rounded-xl bg-[radial-gradient(ellipse_at_50%_0%,rgba(251,191,36,0.14),transparent_55%)]" />
      )}

      {/* 결과 히트 미니 파티클 */}
      <AnimatePresence>
        {hitBurst > 0 && intensity !== 'low' && !reduced && hitFlash && (
          <motion.div
            key={hitBurst}
            className="pointer-events-none absolute inset-0 z-[15]"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65 }}
          >
            {Array.from({ length: particleCount }).map((_, i) => (
              <motion.span
                key={i}
                className={`absolute left-1/2 top-[42%] w-1.5 h-1.5 rounded-full ${
                  hitFlash === 'P'
                    ? 'bg-blue-400'
                    : hitFlash === 'B'
                      ? 'bg-red-400'
                      : 'bg-emerald-400'
                }`}
                initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                animate={{
                  x: Math.cos((i / particleCount) * Math.PI * 2) * (30 + (i % 3) * 8),
                  y: Math.sin((i / particleCount) * Math.PI * 2) * (18 + (i % 3) * 6),
                  scale: 0,
                  opacity: 0,
                }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {autoBetIn && !autoHit && (
          <motion.div
            className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.span
              className="absolute w-7 h-7 rounded-full bg-amber-400 border-2 border-amber-200 shadow-lg"
              initial={{ y: -40, x: 30, scale: 0.4, opacity: 0 }}
              animate={{ y: 0, x: 0, scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 16 }}
            />
            <motion.span
              className="text-lg font-black tracking-widest text-sky-200 border-2 border-sky-400/70 px-2.5 py-0.5 rounded-md bg-black/55 -rotate-6"
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              BET IN
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {autoHit && (
          <motion.div
            className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0, scale: 1.2, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: -6 }}
            exit={{ opacity: 0 }}
          >
            <span className="text-2xl font-black tracking-widest text-amber-300 border-4 border-amber-400/80 px-3 py-1 rounded-lg bg-black/50 shadow-[0_0_30px_rgba(251,191,36,0.5)] -rotate-6">
              AUTO HIT
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {autoLockOn && !autoBetIn && !autoEvent && (
        <div className="absolute top-2 right-10 z-10 text-[9px] font-black tracking-wider text-sky-300 bg-sky-500/15 border border-sky-400/40 px-1.5 py-0.5 rounded animate-pulse">
          LOCK ON
        </div>
      )}

      {ruleFocus && !reduced && !autoEvent && (
        <div className="pointer-events-none absolute inset-0 z-[1] rule-gold-wave rounded-xl" />
      )}

      {table.status === 'risk_blocked' && !autoEvent && (
        <div className="absolute inset-0 rounded-xl overflow-hidden bg-red-950/20 backdrop-blur-[1px] z-10 flex items-center justify-center">
          <motion.div
            className="bg-zinc-900 border border-red-900 text-red-400 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 shadow-lg"
            initial={reduced ? false : { x: -4 }}
            animate={reduced ? undefined : { x: [0, -3, 3, -2, 0] }}
            transition={{ duration: 0.35 }}
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            위험 한도 차단됨
          </motion.div>
        </div>
      )}

      <div className={`relative z-[2] flex flex-col ${compact ? 'gap-1.5' : 'gap-2'}`}>
        <AnimatePresence mode="popLayout">
          {settleBanner && !showWinFlip && (
            <motion.div
              key={settleBanner.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.18 }}
              className={`rounded-lg border px-2 py-1.5 flex items-center gap-1.5 min-w-0 ${autoEventBarClass(settleBanner.tone)}`}
            >
              <span className="shrink-0 text-[9px] font-black tracking-wide px-1 py-0.5 rounded bg-black/25 border border-white/10">
                {settleBanner.badge}
              </span>
              <span className="min-w-0 flex-1 text-[10px] sm:text-[11px] font-bold truncate leading-tight">
                {settleBanner.label}
              </span>
            </motion.div>
          )}

          {!settleBanner &&
            betBanners.map((banner) => (
              <motion.div
                key={banner.id}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -2 }}
                transition={{ duration: 0.18 }}
                className={`rounded-lg border px-2 py-1.5 flex items-center gap-1.5 min-w-0 ${autoEventBarClass(banner.tone)}`}
              >
                <span className="shrink-0 text-[9px] font-black tracking-wide px-1 py-0.5 rounded bg-black/25 border border-white/10">
                  {banner.badge}
                </span>
                <span className="min-w-0 flex-1 text-[10px] sm:text-[11px] font-bold truncate leading-tight">
                  {banner.label}
                </span>
                {banner.hint && (
                  <span className="shrink-0 text-[9px] font-bold opacity-80">{banner.hint}</span>
                )}
              </motion.div>
            ))}

          {!settleBanner &&
            betBanners.length === 0 &&
            autoEvent &&
            autoEvent.kind !== 'pending' && (
              <motion.div
                key={`${autoEvent.kind}-${autoEvent.label}`}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -2 }}
                transition={{ duration: 0.18 }}
                className={`rounded-lg border px-2 py-1 flex items-center gap-1.5 min-w-0 ${autoEventBarClass(autoEvent.tone)}`}
              >
                {autoEvent.badge && (
                  <span className="shrink-0 text-[9px] font-black tracking-wide px-1 py-0.5 rounded bg-black/25 border border-white/10">
                    {autoEvent.badge}
                  </span>
                )}
                <span className="min-w-0 flex-1 text-[10px] sm:text-[11px] font-bold truncate leading-tight">
                  {autoEvent.label}
                </span>
                {typeof autoEvent.betSec === 'number' && autoEvent.betSec > 0 && (
                  <span
                    className={`shrink-0 font-mono tabular-nums text-[10px] font-black ${
                      autoEvent.betSec <= 10 ? 'animate-pulse' : ''
                    }`}
                  >
                    {autoEvent.betSec}s
                  </span>
                )}
              </motion.div>
            )}
        </AnimatePresence>

        {!settleBanner &&
          betBanners.length === 0 &&
          autoEvent &&
          typeof autoEvent.progress === 'number' &&
          autoEvent.progress > 0 && (
          <div className="h-0.5 rounded-full bg-zinc-950/80 overflow-hidden -mt-1">
            <div
              className={`h-full rounded-full transition-[width] duration-200 ease-linear ${
                autoEvent.tone === 'pattern'
                  ? 'bg-amber-400'
                  : autoEvent.tone === 'ai'
                    ? 'bg-violet-400'
                    : 'bg-sky-400'
              }`}
              style={{ width: `${Math.max(4, Math.round(autoEvent.progress * 100))}%` }}
            />
          </div>
        )}

        <div className="flex justify-between items-start gap-2">
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className={`font-bold text-zinc-100 ${compact ? 'text-sm' : ''}`}>{table.name}</h3>
              {isSelected && (
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
                  선택됨
                </span>
              )}
              {(betBanners.length > 0 || autoEvent?.kind === 'pending') && (
                <span className="text-[9px] font-black tracking-wide text-sky-300 bg-sky-500/15 border border-sky-400/40 px-1.5 py-0.5 rounded">
                  베팅 대기
                </span>
              )}
              {ruleFocus && (
                <span className="text-[9px] font-black tracking-wide text-amber-300 bg-amber-500/15 border border-amber-400/40 px-1.5 py-0.5 rounded">
                  RULE
                </span>
              )}
              {!beginnerMode && !compact && (
                <span className="text-xs text-zinc-500 font-mono">{table.gameCode}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {table.live ? (
                <>
                  <span
                    title={table.live.error || 'DB 결과를 2초마다 확인합니다.'}
                    className={`text-[10px] px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${
                      table.live.connected
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : table.live.loading
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          : 'bg-red-500/10 text-red-400 border-red-500/30'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full bg-current ${
                        table.live.connected || table.live.loading ? 'animate-pulse' : ''
                      }`}
                    />
                    {table.live.connected ? 'LIVE' : table.live.loading ? '연결 중' : '연결 오류'}
                  </span>
                  {!compact && table.live.gameNo != null && (
                    <span className="text-[10px] font-mono text-zinc-500">G{table.live.gameNo}</span>
                  )}
                  {compact && table.live.gameNo != null && (
                    <span className="text-[10px] font-mono text-zinc-500">G{table.live.gameNo}</span>
                  )}
                </>
              ) : (
                <StatusBadge status={table.status} />
              )}

              {lastResultLabel && (
                <span
                  title={`마지막 결과 ${getResultLabel(lastResult!)}`}
                  className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black text-white border ${getResultColor(lastResult!, 'bg')} ${getResultColor(lastResult!, 'border')}`}
                >
                  {lastResultLabel}
                </span>
              )}

              {table.live && betSec > 0 ? (
                <span
                  title="베팅 가능 남은 시간"
                  className={`inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 font-mono tabular-nums ${
                    betSec <= 10
                      ? 'text-[10px] font-bold text-rose-300 border-rose-500/40 bg-rose-500/10 animate-pulse'
                      : 'text-[10px] font-bold text-sky-300 border-sky-500/35 bg-sky-500/10'
                  }`}
                >
                  <span className="opacity-70 font-sans text-[9px]">BET</span>
                  {betSec}
                  <span className="opacity-70 font-sans text-[9px]">s</span>
                </span>
              ) : table.live && lastResultLabel ? (
                <span className="text-[10px] font-mono text-zinc-600">마감</span>
              ) : null}
            </div>
          </div>

          <div
            className={`flex items-center gap-0.5 shrink-0 transition-opacity z-20 ${
              compact || isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            <button
              type="button"
              className={`p-1.5 rounded transition-colors touch-manipulation ${
                isFavorite
                  ? 'text-amber-400 bg-amber-400/10'
                  : 'text-zinc-500 hover:text-amber-400 hover:bg-zinc-800'
              }`}
              onClick={(e) => onToggleFavorite?.(table.id, e)}
            >
              <Star size={compact ? 15 : 16} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
            <button
              type="button"
              className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors touch-manipulation"
              onClick={(e) => {
                e.stopPropagation();
                onZoom?.(table.id);
              }}
              aria-label="상세 보기"
              title="상세 보기"
            >
              <Maximize2 size={compact ? 15 : 16} />
            </button>
          </div>
        </div>

        <TableAiSlot
          opinion={table.ai.finalOpinion}
          consensus={table.ai.consensus}
          amountText={amountText}
          modeLabel={aiModeLabel}
          beginnerMode={beginnerMode}
          analyzing={analyzing}
        />

        {!compact &&
          (table.ai.appliedRule || (!beginnerMode && table.ai.finalConfidence > 0)) && (
          <p className="text-[10px] text-zinc-500 px-0.5 leading-snug truncate -mt-0.5">
            {table.ai.appliedRule
              ? table.ai.appliedRule
              : `신뢰도 ${table.ai.finalConfidence}%`}
          </p>
        )}

        {!beginnerMode && !compact && (
          <div className="hidden sm:flex justify-between items-center text-[10px] -mt-0.5">
            <div className="flex gap-1.5">
              <AiBadge model="GPT" opinion={table.ai.gpt.opinion} />
              <AiBadge model="Gem" opinion={table.ai.gemini.opinion} />
              <AiBadge model="Cld" opinion={table.ai.claude.opinion} />
            </div>
          </div>
        )}
      </div>

      <div className="relative z-[2]">
        <Roadmap data={table.roadmap} results={table.stats.recentResults} size="sm" />
      </div>

      <div className={`grid grid-cols-2 relative z-[2] ${compact ? 'gap-1.5' : 'gap-2'}`}>
        <div className={`flex items-center text-xs ${compact ? 'gap-2.5' : 'gap-3'}`}>
          <div className="flex flex-col">
            <span className="text-zinc-500 text-[10px]">{compact ? 'P' : 'Player(P)'}</span>
            <span className="text-blue-400 font-mono font-bold">{table.stats.player}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-zinc-500 text-[10px]">{compact ? 'B' : 'Banker(B)'}</span>
            <span className="text-red-400 font-mono font-bold">{table.stats.banker}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-zinc-500 text-[10px]">{compact ? 'T' : 'Tie(T)'}</span>
            <span className="text-emerald-400 font-mono font-bold">{table.stats.tie}</span>
          </div>
        </div>

        <div className="flex flex-col items-end text-xs justify-center gap-1">
          <AnimatePresence mode="wait">
            {showStreakBadge ? (
              <motion.span
                key={`streak-${streakCount}-${table.stats.currentStreak}`}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-black ${streakTone} ${
                  streakPop ? 'streak-pop' : ''
                } ${streakBreak ? 'streak-break' : ''}`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0, rotate: -8 }}
              >
                <Zap size={10} className="fill-current" />
                STREAK x{streakCount}
              </motion.span>
            ) : (
              <motion.div
                key="plain-streak"
                className="flex items-center gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <span className="text-zinc-500 text-[10px]">연속:</span>
                <span
                  className={`font-medium ${
                    table.stats.currentStreak.includes('Player')
                      ? 'text-blue-400'
                      : table.stats.currentStreak.includes('Banker')
                        ? 'text-red-400'
                        : 'text-emerald-400'
                  }`}
                >
                  {table.stats.currentStreak}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style>{`
        .selected-pulse {
          animation: selectedPulse 2.4s ease-in-out infinite;
        }
        @keyframes selectedPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.15); }
          50% { box-shadow: 0 0 0 6px rgba(245,158,11,0.08); }
        }
        .rule-focus-pulse {
          animation: ruleFocus 1.8s ease-in-out infinite;
        }
        @keyframes ruleFocus {
          0%, 100% { box-shadow: 0 0 0 0 rgba(251,191,36,0.2); }
          50% { box-shadow: 0 0 18px 2px rgba(251,191,36,0.28); }
        }
        .rule-gold-wave {
          background: radial-gradient(ellipse at 50% 0%, rgba(251,191,36,0.12), transparent 55%);
        }
        .auto-radar-sweep {
          animation: radarSpin 3.6s linear infinite;
        }
        @keyframes radarSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .streak-pop {
          animation: streakPop 0.55s ease-out;
        }
        @keyframes streakPop {
          0% { transform: scale(0.7); }
          40% { transform: scale(1.18); }
          100% { transform: scale(1); }
        }
        .streak-break {
          animation: streakBreak 0.45s ease-out;
        }
        @keyframes streakBreak {
          0% { transform: scale(1) rotate(0); opacity: 1; }
          100% { transform: scale(0.4) rotate(-12deg); opacity: 0; }
        }
        .auto-event-pulse-ai {
          animation: autoEventPulseAi 1.8s ease-in-out infinite;
        }
        @keyframes autoEventPulseAi {
          0%, 100% { box-shadow: 0 0 0 0 rgba(167,139,250,0.2); }
          50% { box-shadow: 0 0 20px 2px rgba(167,139,250,0.35); }
        }
        .auto-event-pulse-pattern {
          animation: autoEventPulsePattern 1.8s ease-in-out infinite;
        }
        @keyframes autoEventPulsePattern {
          0%, 100% { box-shadow: 0 0 0 0 rgba(251,191,36,0.22); }
          50% { box-shadow: 0 0 22px 2px rgba(251,191,36,0.4); }
        }
        .auto-event-pulse-pending {
          animation: autoEventPulsePending 1.4s ease-in-out infinite;
        }
        @keyframes autoEventPulsePending {
          0%, 100% { box-shadow: 0 0 12px rgba(56,189,248,0.25); }
          50% { box-shadow: 0 0 24px rgba(56,189,248,0.45); }
        }
        .auto-event-pulse-manual {
          animation: autoEventPulseManual 1.4s ease-in-out infinite;
        }
        @keyframes autoEventPulseManual {
          0%, 100% { box-shadow: 0 0 12px rgba(59,130,246,0.28); }
          50% { box-shadow: 0 0 24px rgba(59,130,246,0.5); }
        }
        .auto-event-pulse-hit {
          animation: autoEventPulseHit 0.9s ease-out;
        }
        @keyframes autoEventPulseHit {
          0% { box-shadow: 0 0 0 0 rgba(52,211,153,0.5); }
          100% { box-shadow: 0 0 24px rgba(52,211,153,0.35); }
        }
        .auto-event-shake {
          animation: autoEventShake 0.45s ease-out;
        }
        @keyframes autoEventShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}

function StatusBadge({ status }: { status: TableData['status'] }) {
  const guide = STATUS_GUIDE[status];
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-400">
      {guide?.label || status}
    </span>
  );
}

function AiBadge({ model, opinion }: { model: string; opinion: AiOpinion }) {
  return (
    <span
      className={`px-1.5 py-0.5 rounded border text-[10px] ${getResultColor(opinion, 'border')} ${getResultColor(opinion, 'text')} bg-zinc-950`}
    >
      {model}:{getResultLabel(opinion).slice(0, 1)}
    </span>
  );
}
