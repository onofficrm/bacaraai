import { getResultColor, getResultLabel } from '../utils/colors';
import { X, Activity, BarChart2 } from 'lucide-react';
import { TableData } from '../types';
import Roadmap from './Roadmap';

interface TableZoomModalProps {
  table: TableData | null;
  onClose: () => void;
}

export default function TableZoomModal({ table, onClose }: TableZoomModalProps) {
  if (!table) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Activity className="text-amber-500" />
              {table.name} 상세 모니터링
            </h2>
            <div className="flex gap-2 text-sm font-mono text-zinc-400 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
              <span>{table.gameCode}</span>
              <span>•</span>
              <span>{table.stats.shoeNumber}</span>
              <span>•</span>
              <span>{table.stats.currentRound}회</span>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors bg-zinc-900 hover:bg-zinc-800 p-2 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Col - Roadmap & Stats */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <h3 className="text-sm font-bold text-zinc-400 mb-3 flex items-center gap-2">
                  <BarChart2 size={16} /> 대형 로드맵
                </h3>
                {/* Expanded Roadmap using the same component for now, but in a larger container */}
                <div className="transform scale-110 origin-top-left mb-4 w-[90%]">
                  <Roadmap data={table.roadmap} />
                </div>
                
                <div className="grid grid-cols-4 gap-4 mt-6 p-4 bg-zinc-950 rounded-lg border border-zinc-800/50">
                  <StatBox label="Player (P)" value={table.stats.player} color="text-blue-400" />
                  <StatBox label="Banker (B)" value={table.stats.banker} color="text-red-400" />
                  <StatBox label="Tie (T)" value={table.stats.tie} color="text-emerald-400" />
                  <StatBox label="슈 진행률" value={`${table.stats.shoeProgress}%`} color="text-white" />
                </div>
              </div>
            </div>

            {/* Right Col - AI Analysis Summary */}
            <div className="flex flex-col gap-4">
               <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                 <h3 className="text-sm font-bold text-zinc-400 mb-4">현재 AI 분석 상태</h3>
                 
                 <div className="flex flex-col gap-3">
                   <AiStatusRow name="GPT-4o" opinion={table.ai.gpt.opinion} conf={table.ai.gpt.confidence} />
                   <AiStatusRow name="Gemini 1.5" opinion={table.ai.gemini.opinion} conf={table.ai.gemini.confidence} />
                   <AiStatusRow name="Claude 3.5" opinion={table.ai.claude.opinion} conf={table.ai.claude.confidence} />
                 </div>

                 <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-between items-center">
                    <span className="text-zinc-500 text-sm">적용된 규칙</span>
                    <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-1 rounded text-xs font-bold">
                      {table.ai.appliedRule}
                    </span>
                 </div>
               </div>

               <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex-1">
                 <h3 className="text-sm font-bold text-zinc-400 mb-4">최근 기록</h3>
                 <div className="flex flex-wrap gap-2">
                   {table.stats.recentResults.map((res, i) => {
                     const bgClass = getResultColor(res, 'bg');
                     const textClass = getResultColor(res, 'text');
                     const borderClass = getResultColor(res, 'border');
                     const bgColor = `${bgClass} bg-opacity-20 ${textClass} ${borderClass}`;
                     return (
                       <span key={i} className={`w-8 h-8 flex items-center justify-center rounded border font-bold text-sm ${bgColor}`}>
                         {getResultLabel(res)}
                       </span>
                     )
                   })}
                 </div>
               </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string, value: string | number, color: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-zinc-500">{label}</span>
      <span className={`text-xl font-mono font-bold ${color}`}>{value}</span>
    </div>
  );
}

function AiStatusRow({ name, opinion, conf }: { name: string, opinion: string, conf: number }) {
  const color = getResultColor(opinion, 'text');
  const text = getResultLabel(opinion);

  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-zinc-300">{name}</span>
      <div className="flex items-center gap-3">
        <span className={`font-bold ${color}`}>
          {text}
        </span>
        <span className="text-zinc-500 font-mono text-xs">{conf}%</span>
      </div>
    </div>
  );
}
