import { getResultColor, getResultLabel } from '../utils/colors';
import { X, Calendar, Activity, ChevronRight, CheckCircle } from 'lucide-react';
import { GameHistoryEntry, AiOpinion, GameResult } from '../types';
import {
  betWlLabel,
  formatHistoryDateTime,
  inferBetSource,
  resolveBetWl,
} from '../utils/betHistory';

interface HistoryDetailModalProps {
  entry: GameHistoryEntry | null;
  onClose: () => void;
}

export default function HistoryDetailModal({ entry, onClose }: HistoryDetailModalProps) {
  if (!entry) return null;

  const source = inferBetSource(entry);
  const wl = resolveBetWl(entry);
  const hasAi =
    entry.gptOpinion !== 'WAIT' ||
    entry.geminiOpinion !== 'WAIT' ||
    entry.claudeOpinion !== 'WAIT';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 shrink-0">
              <Calendar className="text-amber-500" size={20} />
              베팅 상세
            </h2>
            <span
              className={`shrink-0 px-2 py-0.5 rounded text-[11px] font-bold border ${
                source === 'auto'
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                  : source === 'manual'
                    ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
                    : 'border-zinc-700 text-zinc-500'
              }`}
            >
              {source === 'auto' ? '오토베팅' : source === 'manual' ? '직접 베팅' : '구분 없음'}
            </span>
            <span className="text-sm font-mono text-zinc-500 truncate">
              {formatHistoryDateTime(entry.at, entry.time)}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors bg-zinc-900 hover:bg-zinc-800 p-2 rounded-full"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 custom-scrollbar bg-zinc-950">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-zinc-400 mb-4">테이블</h3>
              <div className="flex flex-col gap-2.5 text-sm">
                <Row label="테이블" value={entry.tableName} />
                <Row label="슈/코드" value={entry.shoeNumber || '-'} mono />
                <Row label="회차" value={entry.round > 0 ? `${entry.round}회` : '-'} mono />
                <Row label="직전 흐름" value={entry.previousResult || '-'} mono />
                <Row label="규칙" value={entry.appliedRule || '-'} accent />
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-zinc-400 mb-4">결과 · 손익</h3>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 text-sm">베팅</span>
                  <span className={`font-bold ${getResultColor(entry.userSelection, 'text')}`}>
                    {getOpinionText(entry.userSelection)}
                    <span className="text-zinc-600 font-mono font-normal ml-2">
                      {entry.amount > 0 ? `${entry.amount.toLocaleString()}원` : '-'}
                    </span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 text-sm">실제 결과</span>
                  <ResultBadge result={entry.actualResult} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 text-sm">승패</span>
                  <span
                    className={`text-sm font-bold ${
                      wl === 'win'
                        ? 'text-emerald-400'
                        : wl === 'loss'
                          ? 'text-rose-400'
                          : wl === 'tie'
                            ? 'text-zinc-300'
                            : 'text-zinc-500'
                    }`}
                  >
                    {betWlLabel(wl)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 text-sm">상태</span>
                  <span className="text-zinc-300 text-sm">{entry.dataStatus || '-'}</span>
                </div>
                {source === 'auto' && (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 text-sm">마틴 단계</span>
                    <span className="font-mono text-amber-300">{entry.martingaleStage}단</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-zinc-800/50">
                  <span className="text-zinc-500 text-sm">손익</span>
                  <span
                    className={`text-lg font-mono font-bold ${
                      entry.pnl > 0
                        ? 'text-emerald-400'
                        : entry.pnl < 0
                          ? 'text-red-400'
                          : 'text-zinc-500'
                    }`}
                  >
                    {entry.pnl > 0 ? '+' : ''}
                    {entry.pnl === 0 ? '-' : entry.pnl.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {entry.note && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-[11px] font-bold text-zinc-500 mb-1.5">정산 메모</p>
              <p className="text-sm text-zinc-300 leading-relaxed">{entry.note}</p>
            </div>
          )}

          {hasAi && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-zinc-400 mb-4">베팅 시점 AI 의견</h3>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <AiBox name="GPT-4o" opinion={entry.gptOpinion} />
                <AiBox name="Gemini" opinion={entry.geminiOpinion} />
                <AiBox name="Claude" opinion={entry.claudeOpinion} />
              </div>
              <div className="flex items-center justify-center gap-4 py-4 bg-zinc-950 rounded-xl border border-zinc-800/50">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-zinc-500">최종 의견</span>
                  <span className={`text-lg font-bold ${getOpinionColor(entry.finalOpinion)}`}>
                    {getOpinionText(entry.finalOpinion)}
                  </span>
                </div>
                <ChevronRight className="text-zinc-700" size={24} />
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-amber-500 font-bold">실제 베팅</span>
                  <span className={`text-lg font-bold ${getOpinionColor(entry.userSelection)}`}>
                    {getOpinionText(entry.userSelection)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-2 bg-zinc-900 p-3 rounded-lg border border-zinc-800">
              <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-zinc-500 mb-1">구분</div>
                <div className="text-sm text-zinc-300">
                  {source === 'auto'
                    ? '오토베팅 정산 기록입니다. 마틴 단계는 오토에만 적용됩니다.'
                    : source === 'manual'
                      ? '직접 베팅 정산 기록입니다.'
                      : '구버전 기록이라 구분이 불명확할 수 있습니다.'}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-zinc-900 p-3 rounded-lg border border-zinc-800">
              <Activity size={16} className="text-blue-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-zinc-500 mb-1">기록 ID</div>
                <div className="text-sm text-zinc-400 font-mono break-all">{entry.id}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-zinc-500 shrink-0">{label}</span>
      <span
        className={`text-right ${
          accent ? 'text-amber-400 font-bold' : mono ? 'font-mono text-zinc-300' : 'text-zinc-200 font-medium'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function AiBox({ name, opinion }: { name: string; opinion: AiOpinion }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 bg-zinc-950 p-3 rounded-xl border border-zinc-800/50">
      <span className="text-[10px] font-bold text-zinc-400">{name}</span>
      <span className={`text-sm font-bold ${getOpinionColor(opinion)}`}>{getOpinionText(opinion)}</span>
    </div>
  );
}

function ResultBadge({ result }: { result: GameResult | 'NONE' }) {
  if (result === 'NONE') return <span className="text-zinc-500">-</span>;
  const bgColor = getResultColor(result, 'bg');
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded font-bold text-xs text-white ${bgColor}`}
    >
      {result}
    </span>
  );
}

function getOpinionText(opinion: AiOpinion) {
  return getResultLabel(opinion);
}

function getOpinionColor(opinion: AiOpinion) {
  return getResultColor(opinion, 'text');
}
