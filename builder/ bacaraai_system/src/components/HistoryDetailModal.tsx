import { getResultColor, getResultLabel } from '../utils/colors';
import { X, Calendar, Activity, ChevronRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { GameHistoryEntry, AiOpinion, GameResult } from '../types';

interface HistoryDetailModalProps {
  entry: GameHistoryEntry | null;
  onClose: () => void;
}

export default function HistoryDetailModal({ entry, onClose }: HistoryDetailModalProps) {
  if (!entry) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="text-amber-500" />
              게임 기록 상세
            </h2>
            <span className="text-sm font-mono text-zinc-500">{entry.time}</span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors bg-zinc-900 hover:bg-zinc-800 p-2 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar bg-zinc-950">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Col - Context */}
            <div className="flex flex-col gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <h3 className="text-sm font-bold text-zinc-400 mb-4">테이블 상황</h3>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">테이블명</span>
                    <span className="font-bold text-zinc-200">{entry.tableName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">슈 번호</span>
                    <span className="font-mono text-zinc-300">{entry.shoeNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">진행 회차</span>
                    <span className="font-mono text-zinc-300">{entry.round}회</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">직전 흐름</span>
                    <span className="text-zinc-300">{entry.previousResult}</span>
                  </div>
                  <div className="flex justify-between mt-2 pt-2 border-t border-zinc-800/50">
                    <span className="text-zinc-500">발동된 규칙</span>
                    <span className="text-amber-500 font-bold">{entry.appliedRule}</span>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <h3 className="text-sm font-bold text-zinc-400 mb-4">결과 및 손익</h3>
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 text-sm">참고 금액</span>
                    <span className="font-mono text-zinc-200">{entry.amount > 0 ? entry.amount.toLocaleString() + '원' : '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 text-sm">실제 결과</span>
                    <ResultBadge result={entry.actualResult} />
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-zinc-800/50">
                    <span className="text-zinc-500 text-sm">최종 손익</span>
                    <span className={`text-lg font-mono font-bold ${entry.pnl > 0 ? 'text-emerald-400' : entry.pnl < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                      {entry.pnl > 0 ? '+' : ''}{entry.pnl === 0 ? '-' : entry.pnl.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col - AI Analysis & User Action */}
            <div className="lg:col-span-2 flex flex-col gap-4">
               <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex-1">
                 <h3 className="text-sm font-bold text-zinc-400 mb-4">AI 분석 및 최종 선택</h3>
                 
                 <div className="grid grid-cols-3 gap-4 mb-6">
                   <AiBox name="GPT-4o" opinion={entry.gptOpinion} />
                   <AiBox name="Gemini 1.5" opinion={entry.geminiOpinion} />
                   <AiBox name="Claude 3.5" opinion={entry.claudeOpinion} />
                 </div>

                 <div className="flex items-center justify-center gap-4 py-6 bg-zinc-950 rounded-xl border border-zinc-800/50">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-xs text-zinc-500">최종 참고 의견</span>
                      <span className={`text-xl font-bold ${getOpinionColor(entry.finalOpinion)}`}>
                        {getOpinionText(entry.finalOpinion)}
                      </span>
                    </div>
                    <ChevronRight className="text-zinc-700" size={32} />
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-xs text-amber-500 font-bold">사용자 실제 선택</span>
                      <span className={`text-xl font-bold ${getOpinionColor(entry.userSelection)}`}>
                        {getOpinionText(entry.userSelection)}
                      </span>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="flex items-start gap-2 bg-zinc-950 p-3 rounded-lg border border-zinc-800/50">
                      <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs text-zinc-500 mb-1">위험관리 판단</div>
                        <div className="text-sm text-zinc-300">현재 마틴 {entry.martingaleStage}단계, 잔여 자금 정상. 안전하게 진행되었습니다.</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 bg-zinc-950 p-3 rounded-lg border border-zinc-800/50">
                      <Activity size={16} className="text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs text-zinc-500 mb-1">시스템 상태</div>
                        <div className="text-sm text-zinc-300">화면 인식 신뢰도 98%, 평균 응답 1.1s</div>
                      </div>
                    </div>
                 </div>

               </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}

function AiBox({ name, opinion }: { name: string, opinion: AiOpinion }) {
  const bgClass = getResultColor(opinion, 'bg');
  const textClass = getResultColor(opinion, 'text');
  const borderClass = getResultColor(opinion, 'border');
  const label = getResultLabel(opinion);

  return (
    <div className="flex flex-col items-center justify-center gap-2 bg-zinc-950 p-4 rounded-xl border border-zinc-800/50">
      <span className="text-xs font-bold text-zinc-400">{name}</span>
      <span className={`text-lg font-bold ${getOpinionColor(opinion)}`}>
        {getOpinionText(opinion)}
      </span>
    </div>
  );
}

function ResultBadge({ result }: { result: GameResult | 'NONE' }) {
  if (result === 'NONE') return <span className="text-zinc-500">-</span>;
  const bgColor = getResultColor(result, 'bg');
  const label = getResultLabel(result);

  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded font-bold text-xs text-white ${bgColor}`}>
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
