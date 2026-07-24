import { getResultColor, getResultLabel } from '../utils/colors';
import { X, Activity } from 'lucide-react';
import { TableData } from '../types';
import BaccaratScoreboard from './BaccaratScoreboard';

interface TableZoomModalProps {
  table: TableData | null;
  onClose: () => void;
}

export default function TableZoomModal({ table, onClose }: TableZoomModalProps) {
  if (!table) return null;

  const results = table.stats.recentResults || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-6xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 truncate">
              <Activity className="text-amber-500 shrink-0" />
              <span className="truncate">{table.name} 상세 모니터링</span>
            </h2>
            <div className="hidden sm:flex gap-2 text-sm font-mono text-zinc-400 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800 shrink-0">
              <span>{table.gameCode}</span>
              <span>•</span>
              <span>{table.stats.shoeNumber}</span>
              <span>•</span>
              <span>{table.stats.currentRound}회</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors bg-zinc-900 hover:bg-zinc-800 p-2 rounded-full shrink-0"
            type="button"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 flex flex-col gap-4 custom-scrollbar">
          <BaccaratScoreboard results={results} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-5">
              <h3 className="text-sm font-bold text-zinc-400 mb-4">현재 AI 분석 상태</h3>

              <div className="flex flex-col gap-3">
                <AiStatusRow name="GPT-4o" opinion={table.ai.gpt.opinion} conf={table.ai.gpt.confidence} />
                <AiStatusRow name="Gemini" opinion={table.ai.gemini.opinion} conf={table.ai.gemini.confidence} />
                <AiStatusRow name="Claude" opinion={table.ai.claude.opinion} conf={table.ai.claude.confidence} />
              </div>

              <div className="mt-5 pt-4 border-t border-zinc-800 flex justify-between items-center gap-3">
                <span className="text-zinc-500 text-sm shrink-0">적용된 규칙</span>
                <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-1 rounded text-xs font-bold text-right">
                  {table.ai.appliedRule}
                </span>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-5">
              <h3 className="text-sm font-bold text-zinc-400 mb-3">슈 요약</h3>
              <div className="grid grid-cols-4 gap-3">
                <StatBox label="Player" value={table.stats.player} color="text-blue-400" />
                <StatBox label="Banker" value={table.stats.banker} color="text-red-400" />
                <StatBox label="Tie" value={table.stats.tie} color="text-emerald-400" />
                <StatBox label="진행" value={`${table.stats.shoeProgress}%`} color="text-white" />
              </div>
              <p className="mt-3 text-[11px] text-zinc-500 leading-relaxed">
                연속: {table.stats.currentStreak} · 페어(BP/PP) 데이터는 수집되지 않아 표시하지 않습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex flex-col gap-1 bg-zinc-950 rounded-lg border border-zinc-800/50 p-2.5">
      <span className="text-[10px] text-zinc-500">{label}</span>
      <span className={`text-lg font-mono font-bold ${color}`}>{value}</span>
    </div>
  );
}

function AiStatusRow({ name, opinion, conf }: { name: string; opinion: string; conf: number }) {
  const color = getResultColor(opinion, 'text');
  const text = getResultLabel(opinion);

  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-zinc-300">{name}</span>
      <div className="flex items-center gap-3">
        <span className={`font-bold ${color}`}>{text}</span>
        <span className="text-zinc-500 font-mono text-xs">{conf}%</span>
      </div>
    </div>
  );
}
