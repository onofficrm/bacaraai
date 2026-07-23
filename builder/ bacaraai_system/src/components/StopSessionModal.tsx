import { AlertTriangle, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { playSfx } from '../audio/sfxEngine';
import { PLATFORM_LINKS } from '../constants';
import { getResultColor, getResultLabel } from '../utils/colors';
import { inferBetSource, loadBetHistory } from '../utils/betHistory';
import type { GameHistoryEntry, SessionConfig } from '../types';

export type StopSessionType = 'wincut' | 'losscut' | 'error' | 'manual' | null;

interface StopSessionModalProps {
  type: StopSessionType;
  sessionPnl?: number;
  /** 이번 세션 시작 시각 (epoch ms) — 이 시각 이후 기록만 표시 */
  sessionStartedAt?: number | null;
  sessionConfig?: SessionConfig | null;
  martinStage?: number;
  onViewHistory: () => void;
  onEndSession: () => void;
}

type ReviewResponse = {
  ok: boolean;
  message?: string;
  headline?: string;
  summary?: string[];
  tips?: string[];
  provider?: string;
};

function loadSessionRecords(sessionStartedAt: number | null): GameHistoryEntry[] {
  const all = loadBetHistory();
  const start = sessionStartedAt && sessionStartedAt > 0 ? sessionStartedAt - 5_000 : 0;
  const filtered = all.filter((e) => {
    if (e.dataStatus === '접수') return false;
    const at = e.at || 0;
    if (start > 0 && at > 0 && at < start) return false;
    return true;
  });
  if (start > 0) return filtered.slice(0, 40);
  return filtered.filter((e) => inferBetSource(e) === 'auto').slice(0, 20);
}

export default function StopSessionModal({
  type,
  sessionPnl = 0,
  sessionStartedAt = null,
  sessionConfig = null,
  martinStage = 1,
  onViewHistory,
  onEndSession,
}: StopSessionModalProps) {
  const [sessionRecords, setSessionRecords] = useState<GameHistoryEntry[]>([]);
  const [review, setReview] = useState<ReviewResponse | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!type) return;
    if (type === 'wincut') playSfx('win');
    else if (type === 'losscut') playSfx('loss');
    else playSfx('error');
  }, [type]);

  useEffect(() => {
    if (!type) {
      setSessionRecords([]);
      setReview(null);
      setReviewError(null);
      return;
    }
    const refresh = () => setSessionRecords(loadSessionRecords(sessionStartedAt));
    refresh();
    const t1 = window.setTimeout(refresh, 80);
    const t2 = window.setTimeout(refresh, 250);
    const onHist = () => refresh();
    window.addEventListener('bacara-bet-history', onHist);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('bacara-bet-history', onHist);
    };
  }, [type, sessionStartedAt]);

  useEffect(() => {
    if (!type) return;
    let cancelled = false;
    const run = async () => {
      setReviewLoading(true);
      setReviewError(null);
      try {
        const records = loadSessionRecords(sessionStartedAt);
        const bets = records.map((e) => ({
          side: e.userSelection,
          result: e.actualResult,
          pnl: e.pnl,
          source: inferBetSource(e),
          rule: e.appliedRule,
          martin: e.martingaleStage,
          final_opinion: e.finalOpinion,
          table: e.tableName,
        }));
        const response = await fetch(PLATFORM_LINKS.aiSessionReview, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pnl: sessionPnl,
            stop_type: type,
            strategy: sessionConfig?.strategy || '',
            martin_stage: martinStage,
            max_martin: sessionConfig?.maxMartin || 6,
            win_cut: sessionConfig?.winCut || 0,
            loss_cut: sessionConfig?.lossCut || 0,
            bets,
          }),
        });
        const data = (await response.json()) as ReviewResponse;
        if (cancelled) return;
        if (!response.ok || !data.ok) {
          throw new Error(data.message || '세션 복기에 실패했습니다.');
        }
        setReview(data);
      } catch (error) {
        if (cancelled) return;
        setReviewError(error instanceof Error ? error.message : '세션 복기 오류');
      } finally {
        if (!cancelled) setReviewLoading(false);
      }
    };
    const timer = window.setTimeout(() => void run(), 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [type, sessionStartedAt, sessionPnl, sessionConfig, martinStage]);

  if (!type) return null;

  let Icon = AlertTriangle;
  let title = '';
  let message = '';
  let color = '';
  let bgClass = '';

  if (type === 'wincut') {
    Icon = CheckCircle;
    title = '목표 수익 달성 (윈컷)';
    message = '설정한 목표 수익에 도달하여 진행이 자동 종료되었습니다.';
    color = 'text-emerald-400';
    bgClass = 'bg-emerald-500/10 border-emerald-500/30';
  } else if (type === 'losscut') {
    Icon = XCircle;
    title = '손실 한도 도달 (로스컷)';
    message = '손실 한도에 도달하여 진행이 중단되었습니다.';
    color = 'text-red-400';
    bgClass = 'bg-red-500/10 border-red-500/30';
  } else if (type === 'manual') {
    Icon = CheckCircle;
    title = '오토베팅 종료';
    message = '사용자가 오토베팅을 종료했습니다. 이번 세션을 복기해 보세요.';
    color = 'text-zinc-200';
    bgClass = 'bg-zinc-500/10 border-zinc-600/40';
  } else {
    Icon = AlertTriangle;
    title = '시스템 오류 발생';
    message = '연결 상태가 불안정하거나 AI 응답이 지연되어 안전을 위해 일시 중단되었습니다.';
    color = 'text-amber-400';
    bgClass = 'bg-amber-500/10 border-amber-500/30';
  }

  const wins = sessionRecords.filter((e) => e.pnl > 0).length;
  const losses = sessionRecords.filter((e) => e.pnl < 0).length;
  const autoCount = sessionRecords.filter((e) => inferBetSource(e) === 'auto').length;
  const manualCount = sessionRecords.filter((e) => inferBetSource(e) === 'manual').length;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className={`border rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl flex flex-col max-h-[min(92dvh,720px)] ${bgClass} bg-zinc-950`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stop-session-title"
      >
        <div className="flex flex-col items-center text-center shrink-0">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${color} bg-zinc-900/50`}>
            <Icon size={28} />
          </div>
          <h2 id="stop-session-title" className={`text-xl sm:text-2xl font-bold mb-1.5 ${color}`}>
            {title}
          </h2>
          <p className="text-zinc-300 text-sm leading-relaxed mb-4">{message}</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 mb-3 shrink-0">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] text-zinc-500 mb-0.5">세션 손익</p>
              <p
                className={`font-mono font-bold text-sm ${
                  sessionPnl > 0 ? 'text-emerald-400' : sessionPnl < 0 ? 'text-red-400' : 'text-zinc-300'
                }`}
              >
                {sessionPnl > 0 ? '+' : ''}
                {sessionPnl.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 mb-0.5">승 / 패</p>
              <p className="font-mono font-bold text-sm text-zinc-200">
                <span className="text-emerald-400">{wins}</span>
                <span className="text-zinc-600 mx-1">/</span>
                <span className="text-red-400">{losses}</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 mb-0.5">기록</p>
              <p className="font-mono font-bold text-sm text-zinc-200">
                {sessionRecords.length}
                <span className="text-[10px] text-zinc-500 font-sans font-medium ml-1">건</span>
              </p>
            </div>
          </div>
          {(autoCount > 0 || manualCount > 0) && (
            <p className="text-[10px] text-zinc-500 text-center mt-2">
              오토 {autoCount} · 직접 {manualCount}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-3 mb-3 shrink-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles size={14} className="text-violet-300" />
            <span className="text-[11px] font-bold text-violet-200">AI 세션 복기</span>
            {review?.provider && (
              <span className="text-[10px] text-zinc-500 ml-auto">{review.provider}</span>
            )}
          </div>
          {reviewLoading && (
            <p className="text-[11px] text-zinc-400 animate-pulse">세션을 분석하는 중…</p>
          )}
          {!reviewLoading && reviewError && (
            <p className="text-[11px] text-amber-300/90">{reviewError}</p>
          )}
          {!reviewLoading && review && (
            <div className="space-y-2">
              {review.headline && (
                <p className="text-sm font-bold text-zinc-100 leading-snug">{review.headline}</p>
              )}
              {review.summary && review.summary.length > 0 && (
                <ul className="space-y-1">
                  {review.summary.slice(0, 5).map((line, i) => (
                    <li key={i} className="text-[11px] text-zinc-400 leading-relaxed flex gap-1.5">
                      <span className="text-zinc-600">•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              )}
              {review.tips && review.tips.length > 0 && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-2.5 py-2">
                  <p className="text-[10px] font-bold text-zinc-500 mb-1">다음 세션 제안</p>
                  <ul className="space-y-1">
                    {review.tips.slice(0, 3).map((tip, i) => (
                      <li key={i} className="text-[11px] text-zinc-300 leading-relaxed">
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar rounded-xl border border-zinc-800 bg-zinc-950/80 mb-4">
          {sessionRecords.length === 0 ? (
            <div className="px-4 py-8 text-center text-zinc-500 text-xs leading-relaxed">
              이 세션에서 저장된 베팅 기록이 없습니다.
              <br />
              아래 「전체 기록 보기」에서 이전 기록을 확인할 수 있습니다.
            </div>
          ) : (
            <ul className="divide-y divide-zinc-800/80">
              {sessionRecords.slice(0, 20).map((e) => {
                const src = inferBetSource(e);
                return (
                  <li key={e.id} className="px-3 py-2.5 flex items-center gap-2 text-xs">
                    <span
                      className={`shrink-0 px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                        src === 'auto'
                          ? 'border-amber-500/40 text-amber-300 bg-amber-500/10'
                          : src === 'manual'
                            ? 'border-blue-500/40 text-blue-300 bg-blue-500/10'
                            : 'border-zinc-700 text-zinc-500'
                      }`}
                    >
                      {src === 'auto' ? '오토' : src === 'manual' ? '직접' : '-'}
                    </span>
                    <span className="font-mono text-zinc-500 shrink-0 w-[52px]">{e.time}</span>
                    <span className="min-w-0 flex-1 truncate text-zinc-300">{e.tableName}</span>
                    <span className={`shrink-0 font-bold ${getResultColor(e.userSelection, 'text')}`}>
                      {e.userSelection === 'PLAYER'
                        ? 'P'
                        : e.userSelection === 'BANKER'
                          ? 'B'
                          : e.userSelection === 'TIE'
                            ? 'T'
                            : '-'}
                    </span>
                    <span
                      className={`shrink-0 inline-flex w-5 h-5 items-center justify-center rounded text-[10px] font-bold text-white ${getResultColor(e.actualResult, 'bg')}`}
                    >
                      {e.actualResult === 'NONE' ? '-' : getResultLabel(e.actualResult)}
                    </span>
                    <span
                      className={`shrink-0 font-mono font-bold w-[72px] text-right ${
                        e.pnl > 0 ? 'text-emerald-400' : e.pnl < 0 ? 'text-red-400' : 'text-zinc-500'
                      }`}
                    >
                      {e.pnl > 0 ? '+' : ''}
                      {e.pnl === 0 ? '-' : e.pnl.toLocaleString()}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex gap-3 w-full shrink-0">
          <button
            type="button"
            onClick={() => {
              playSfx('ui');
              onViewHistory();
            }}
            className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-xl font-bold transition-colors border border-zinc-700 touch-manipulation"
          >
            전체 기록 보기
          </button>
          <button
            type="button"
            onClick={() => {
              playSfx('sessionStop');
              onEndSession();
            }}
            className={`flex-1 py-3 rounded-xl font-bold transition-colors touch-manipulation ${
              type === 'wincut'
                ? 'bg-emerald-500 hover:bg-emerald-600 text-zinc-950'
                : type === 'losscut'
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : type === 'manual'
                    ? 'bg-zinc-100 hover:bg-white text-zinc-950'
                    : 'bg-amber-500 hover:bg-amber-600 text-zinc-950'
            }`}
          >
            {type === 'error' ? '확인' : '오토베팅 종료'}
          </button>
        </div>
      </div>
    </div>
  );
}
