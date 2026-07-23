import { getResultColor, getResultLabel } from '../utils/colors';
import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AiOpinion, TableData } from '../types';
import { STATUS_GUIDE } from '../help/glossary';
import Roadmap from './Roadmap';
import { getBettingRemainingSecForTable } from '../hooks/useBettingWindow';
import { useFxIntensity } from '../hooks/useFxIntensity';
import { playSfx } from '../audio/sfxEngine';

interface TableCardProps {
  table: TableData;
  isSelected?: boolean;
  isFavorite?: boolean;
  beginnerMode?: boolean;
  autoWatching?: boolean;
  autoLockOn?: boolean;
  autoHit?: boolean;
  onSelect?: (id: string) => void;
  onZoom?: (id: string) => void;
  onToggleFavorite?: (id: string, e: React.MouseEvent) => void;
}

export default function TableCard({
  table,
  isSelected,
  isFavorite,
  beginnerMode = true,
  autoWatching = false,
  autoLockOn = false,
  autoHit = false,
  onSelect,
  onZoom,
  onToggleFavorite,
}: TableCardProps) {
  const { reduced, enableRadar, intensity } = useFxIntensity();
  const [hitFlash, setHitFlash] = useState<'P' | 'B' | 'T' | null>(null);
  const [betSec, setBetSec] = useState(0);
  const prevLatestRef = useRef<number | null | undefined>(undefined);

  const isPassive = ['WAIT', 'SKIP', 'PAUSE', 'STOP', 'ERROR', 'DATA_ERROR'].includes(
    table.ai.finalOpinion,
  );

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
        if (!reduced) playSfx('tick');
        const t = window.setTimeout(() => setHitFlash(null), intensity === 'high' ? 700 : 450);
        prevLatestRef.current = id;
        return () => window.clearTimeout(t);
      }
    }
    prevLatestRef.current = id;
  }, [table.live?.latestId, table.stats.recentResults, reduced, intensity]);

  useEffect(() => {
    if (!table.live) {
      setBetSec(0);
      return;
    }
    const tick = () => setBetSec(getBettingRemainingSecForTable(table));
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [table]);

  const flashClass =
    hitFlash === 'P'
      ? 'ring-2 ring-blue-400 shadow-[0_0_24px_rgba(59,130,246,0.45)]'
      : hitFlash === 'B'
        ? 'ring-2 ring-red-400 shadow-[0_0_24px_rgba(248,113,113,0.45)]'
        : hitFlash === 'T'
          ? 'ring-2 ring-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.4)]'
          : '';

  let cardClass =
    'bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all group rounded-xl p-3 sm:p-4 flex flex-col gap-3 relative cursor-pointer overflow-hidden ';
  if (isSelected) {
    cardClass +=
      ' ring-2 ring-amber-500 border-amber-500/60 shadow-lg shadow-amber-900/20 selected-pulse ';
  }
  if (table.status === 'rule_triggered') cardClass += ' border-amber-500/50 ';
  else if (table.status === 'risk_blocked') cardClass += ' border-red-900/50 ';
  if (autoLockOn) cardClass += ' ring-2 ring-sky-400/80 shadow-[0_0_20px_rgba(56,189,248,0.35)] ';
  if (flashClass) cardClass += ` ${flashClass} `;

  const betProgress = betSec > 0 ? betSec / 30 : 0;

  return (
    <div className={cardClass} onClick={() => onSelect?.(table.id)}>
      {/* betting window neon ring */}
      {betSec > 0 && (
        <div
          className="pointer-events-none absolute inset-0 rounded-xl z-[1]"
          style={{
            boxShadow: `inset 0 0 0 2px rgba(56,189,248,${0.25 + betProgress * 0.55})`,
          }}
        />
      )}

      {/* auto radar sweep */}
      {autoWatching && enableRadar && !reduced && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl z-[1] opacity-40">
          <div className="absolute inset-[-40%] auto-radar-sweep bg-[conic-gradient(from_0deg,transparent_0deg,rgba(56,189,248,0.35)_40deg,transparent_80deg)]" />
        </div>
      )}

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

      {autoLockOn && (
        <div className="absolute top-2 right-10 z-10 text-[9px] font-black tracking-wider text-sky-300 bg-sky-500/15 border border-sky-400/40 px-1.5 py-0.5 rounded animate-pulse">
          LOCK ON
        </div>
      )}

      {table.status === 'risk_blocked' && (
        <div className="absolute inset-0 rounded-xl overflow-hidden bg-red-950/20 backdrop-blur-[1px] z-10 flex items-center justify-center">
          <div className="bg-zinc-900 border border-red-900 text-red-400 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            위험 한도 차단됨
          </div>
        </div>
      )}

      <div className="flex justify-between items-start relative z-[2]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-zinc-100">{table.name}</h3>
            {isSelected && (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
                선택됨
              </span>
            )}
            {!beginnerMode && (
              <span className="text-xs text-zinc-500 font-mono">{table.gameCode}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
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
                <span className="text-[10px] font-mono text-zinc-500">
                  {table.live.gameNo != null ? `G${table.live.gameNo} · ` : ''}
                  {formatDetectedAt(table.live.latestDetectedAt)}
                </span>
                {betSec > 0 && (
                  <span className="text-[10px] font-mono font-bold text-sky-300 animate-pulse">
                    BET {betSec}s
                  </span>
                )}
              </>
            ) : (
              <>
                <StatusBadge status={table.status} />
                <div
                  className={`text-xs font-mono font-bold flex items-center gap-1 ${
                    table.status === 'betting' ||
                    table.status === 'rule_triggered' ||
                    table.status === 'waiting_user'
                      ? 'text-amber-500'
                      : 'text-zinc-400'
                  }`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      table.status === 'betting' ||
                      table.status === 'rule_triggered' ||
                      table.status === 'waiting_user'
                        ? 'bg-amber-500 animate-ping'
                        : 'bg-zinc-500'
                    }`}
                  />
                  {table.timer}초
                </div>
              </>
            )}
          </div>
        </div>

        <div
          className={`flex items-center gap-1 transition-opacity z-20 ${
            isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <button
            className={`p-1.5 rounded transition-colors ${
              isFavorite
                ? 'text-amber-400 bg-amber-400/10'
                : 'text-zinc-500 hover:text-amber-400 hover:bg-zinc-800'
            }`}
            onClick={(e) => onToggleFavorite?.(table.id, e)}
          >
            <Star size={16} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
          <button
            className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onZoom?.(table.id);
            }}
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      <div className="relative z-[2]">
        <Roadmap data={table.roadmap} />
      </div>

      <div className="grid grid-cols-2 gap-3 relative z-[2]">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex flex-col">
            <span className="text-zinc-500">Player(P)</span>
            <span className="text-blue-400 font-mono font-bold">{table.stats.player}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-zinc-500">Banker(B)</span>
            <span className="text-red-400 font-mono font-bold">{table.stats.banker}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-zinc-500">Tie(T)</span>
            <span className="text-emerald-400 font-mono font-bold">{table.stats.tie}</span>
          </div>
        </div>

        <div className="flex flex-col items-end text-xs justify-center gap-1">
          <div className="flex items-center gap-1">
            <span className="text-zinc-500">연속:</span>
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
          </div>
        </div>
      </div>

      <div className="mt-1 pt-3 border-t border-zinc-800/80 flex flex-col gap-2 relative z-[2]">
        {!beginnerMode && (
          <div className="hidden sm:flex justify-between items-center text-[10px]">
            <div className="flex gap-1.5">
              <AiBadge model="GPT" opinion={table.ai.gpt.opinion} />
              <AiBadge model="Gem" opinion={table.ai.gemini.opinion} />
              <AiBadge model="Cld" opinion={table.ai.claude.opinion} />
            </div>
            <div className="text-zinc-500 font-medium">
              일치도:{' '}
              <span
                className={
                  table.ai.consensus.includes('3/3') ? 'text-amber-400' : 'text-zinc-300'
                }
              >
                {table.ai.consensus}
              </span>
            </div>
          </div>
        )}

        <div
          className={`rounded border p-2.5 flex justify-between items-center ${
            isSelected ? 'bg-amber-500/5 border-amber-500/30' : 'bg-zinc-950 border-zinc-800/80'
          }`}
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-zinc-500">
              {table.ai.autoBetAllowed
                ? 'AI 의견 · 자동베팅'
                : table.ai.shadowMode
                  ? 'AI 의견 · 참고'
                  : 'AI 의견'}
            </span>
            <span className={`text-sm font-bold ${getOpinionColor(table.ai.finalOpinion)}`}>
              {getOpinionText(table.ai.finalOpinion, beginnerMode)}
            </span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[10px] text-zinc-500">참고 금액</span>
            <span className="text-sm font-mono font-bold text-zinc-200">
              {isPassive
                ? '-'
                : table.ai.recommendedAmount > 0
                  ? table.ai.recommendedAmount.toLocaleString() + '원'
                  : '-'}
            </span>
          </div>
        </div>

        {beginnerMode ? (
          <p className="text-[11px] text-zinc-500 px-0.5 leading-snug">
            {table.ai.appliedRule
              ? table.ai.appliedRule
              : isSelected
                ? '하단 시트에서 금액을 확인하고 확정하세요.'
                : '카드를 눌러 베팅 화면을 여세요.'}
          </p>
        ) : (
          <div className="flex justify-between text-[10px] px-1 text-zinc-500 gap-2">
            <span>분석 신뢰도: {table.ai.finalConfidence}%</span>
            <span className="text-amber-500/80 truncate text-right">{table.ai.appliedRule}</span>
          </div>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onZoom?.(table.id);
          }}
          className="w-full text-[11px] text-zinc-500 hover:text-zinc-300 py-1.5 rounded border border-zinc-800 hover:border-zinc-700 transition-colors"
        >
          상세 보기
        </button>
      </div>

      <style>{`
        .selected-pulse {
          animation: selectedPulse 2.4s ease-in-out infinite;
        }
        @keyframes selectedPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.15); }
          50% { box-shadow: 0 0 0 6px rgba(245,158,11,0.08); }
        }
        .auto-radar-sweep {
          animation: radarSpin 3.2s linear infinite;
        }
        @keyframes radarSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function formatDetectedAt(value: string | null) {
  if (!value) return '대기';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleTimeString('ko-KR', { hour12: false });
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
    <span className={`px-1.5 py-0.5 rounded border text-[10px] ${getResultColor(opinion, 'border')} ${getResultColor(opinion, 'text')} bg-zinc-950`}>
      {model}:{getResultLabel(opinion).slice(0, 1)}
    </span>
  );
}

function getOpinionColor(opinion: AiOpinion) {
  return getResultColor(opinion, 'text');
}

function getOpinionText(opinion: AiOpinion, beginnerMode: boolean) {
  if (!beginnerMode) return getResultLabel(opinion);
  if (opinion === 'PLAYER') return 'Player 참고';
  if (opinion === 'BANKER') return 'Banker 참고';
  if (opinion === 'WAIT' || opinion === 'SKIP') return '관망';
  return getResultLabel(opinion);
}
