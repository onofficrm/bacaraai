import { getResultColor, getResultLabel } from '../utils/colors';
import { Search, Download, Filter, Eye } from 'lucide-react';
import { useState } from 'react';
import { GameHistoryEntry } from '../types';
import HistoryDetailModal from './HistoryDetailModal';

export default function HistoryTab({ history }: { history: GameHistoryEntry[] }) {
  const [selectedEntry, setSelectedEntry] = useState<GameHistoryEntry | null>(null);

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-6">
      {/* Controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
            <input 
              type="text" 
              placeholder="테이블 검색..." 
              className="bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
            <Filter size={14} /> 필터
          </button>
        </div>
        
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
          <Download size={14} /> CSV 내보내기
        </button>
      </div>

      {/* Table */}
      <div className="hidden md:block flex-1 overflow-auto custom-scrollbar border border-zinc-800 rounded-xl bg-zinc-900/50">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-zinc-950/80 text-zinc-500 sticky top-0 z-10 border-b border-zinc-800">
            <tr>
              <th className="px-4 py-3 font-medium">시간</th>
              <th className="px-4 py-3 font-medium">테이블</th>
              <th className="px-4 py-3 font-medium">슈/회차</th>
              <th className="px-4 py-3 font-medium">직전 결과</th>
              <th className="px-4 py-3 font-medium text-center">AI 의견 (G/Ge/C)</th>
              <th className="px-4 py-3 font-medium">실제 선택</th>
              <th className="px-4 py-3 font-medium text-right">금액</th>
              <th className="px-4 py-3 font-medium text-center">결과</th>
              <th className="px-4 py-3 font-medium text-right">손익</th>
              <th className="px-4 py-3 font-medium">마틴</th>
              <th className="px-4 py-3 font-medium text-center">상세</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {history.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-zinc-500">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Search size={32} className="opacity-20" />
                    <p>게임 기록이 없습니다.</p>
                  </div>
                </td>
              </tr>
            ) : (
              history.map((entry) => (
                <tr key={entry.id} className="hover:bg-zinc-800/30 transition-colors">
                <td className="px-4 py-3 font-mono text-zinc-400">{entry.time}</td>
                <td className="px-4 py-3 font-medium text-zinc-200">{entry.tableName}</td>
                <td className="px-4 py-3 text-zinc-500">{entry.shoeNumber} <span className="text-zinc-600">|</span> {entry.round}회</td>
                <td className="px-4 py-3 text-zinc-400">{entry.previousResult}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <OpinionDot opinion={entry.gptOpinion} />
                    <OpinionDot opinion={entry.geminiOpinion} />
                    <OpinionDot opinion={entry.claudeOpinion} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`font-bold ${getResultColor(entry.userSelection, 'text')}`}>
                    {['WAIT', 'SKIP', 'PAUSE'].includes(entry.userSelection) ? '관망' : entry.userSelection}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-zinc-300">
                  {entry.amount > 0 ? entry.amount.toLocaleString() : '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded font-bold text-[10px] text-white ${getResultColor(entry.actualResult, 'bg')}`}>
                    {entry.actualResult === 'NONE' ? '-' : getResultLabel(entry.actualResult)}
                  </span>
                </td>
                <td className={`px-4 py-3 text-right font-mono font-bold ${entry.pnl > 0 ? 'text-emerald-400' : entry.pnl < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                  {entry.pnl > 0 ? '+' : ''}{entry.pnl === 0 ? '-' : entry.pnl.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-zinc-400">{entry.martingaleStage}단계</td>
                <td className="px-4 py-3 text-center">
                  <button 
                    onClick={() => setSelectedEntry(entry)}
                    className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded transition-colors inline-flex"
                  >
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
      
      {/* Mobile List View */}
      <div className="md:hidden flex-1 overflow-auto custom-scrollbar flex flex-col gap-3 mt-4">
        {history.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 border border-zinc-800 rounded-xl bg-zinc-900/50">
            <div className="flex flex-col items-center justify-center gap-3">
              <Search size={32} className="opacity-20" />
              <p>게임 기록이 없습니다.</p>
            </div>
          </div>
        ) : (
          history.map((entry) => (
            <div key={entry.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-zinc-200 text-sm">{entry.tableName}</span>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="font-mono">{entry.time}</span>
                    <span>•</span>
                    <span>{entry.shoeNumber} | {entry.round}회</span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedEntry(entry)}
                  className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800 rounded transition-colors"
                >
                  <Eye size={14} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs border-y border-zinc-800/50 py-2">
                <div className="flex flex-col gap-1">
                  <span className="text-zinc-500">AI / 실제 베팅</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      <OpinionDot opinion={entry.gptOpinion} />
                      <OpinionDot opinion={entry.geminiOpinion} />
                      <OpinionDot opinion={entry.claudeOpinion} />
                    </div>
                    <span className="text-zinc-600">|</span>
                    <span className={`font-bold ${getResultColor(entry.userSelection, 'text')}`}>
                      {['WAIT', 'SKIP', 'PAUSE'].includes(entry.userSelection) ? '관망' : entry.userSelection}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <span className="text-zinc-500">결과</span>
                  <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded font-bold text-[10px] text-white ${getResultColor(entry.actualResult, 'bg')}`}>
                    {entry.actualResult === 'NONE' ? '-' : getResultLabel(entry.actualResult)}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-xs">베팅 금액</span>
                  <span className="font-mono font-bold text-zinc-300">
                    {entry.amount > 0 ? entry.amount.toLocaleString() : '-'}
                  </span>
                  {entry.martingaleStage > 0 && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/20">
                      {entry.martingaleStage}단계
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-zinc-500">손익</span>
                  <span className={`font-mono font-bold ${entry.pnl > 0 ? 'text-emerald-400' : entry.pnl < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                    {entry.pnl > 0 ? '+' : ''}{entry.pnl === 0 ? '-' : entry.pnl.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <HistoryDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </div>
  );
}

function OpinionDot({ opinion }: { opinion: string }) {
  const color = getResultColor(opinion, 'bg');
  return <div className={`w-2 h-2 rounded-full ${color}`} title={opinion}></div>;
}
