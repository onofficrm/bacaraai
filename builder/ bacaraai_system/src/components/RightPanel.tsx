import { getResultColor, getResultLabel } from '../utils/colors';
import { Activity,  ChevronDown, ChevronUp, FileText, Info, ShieldAlert, SkipForward, Play, X  } from 'lucide-react';
import React, { useState } from 'react';
import { AiModelAnalysis, AiOpinion, GameResult, TableData } from '../types';
import MartingaleVisualizer from './MartingaleVisualizer';
import ActionGuidance from './ActionGuidance';
import HelpTooltip from './HelpTooltip';
import { playSfx } from '../audio/sfxEngine';

interface RightPanelProps {
  table: TableData | null;
  isOpen?: boolean;
  onClose?: () => void;
  beginnerMode?: boolean;
}

export default function RightPanel({ table, isOpen = true, onClose, beginnerMode = true }: RightPanelProps) {
  const [betAmount, setBetAmount] = useState<number>(0);
  const [showMoreChips, setShowMoreChips] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);

  React.useEffect(() => {
    if (table?.ai?.recommendedAmount) {
      setBetAmount(table.ai.recommendedAmount);
    }
    setShowMoreChips(false);
    setShowEvidence(false);
  }, [table?.id, table?.ai?.recommendedAmount]);

  const isPassive = table
    ? ['WAIT', 'SKIP', 'PAUSE', 'STOP', 'ERROR', 'DATA_ERROR'].includes(table.ai.finalOpinion)
    : true;

  const primaryChips = [
    { label: '1천', value: 1000, color: 'bg-zinc-200 text-zinc-900 border-zinc-400' },
    { label: '5천', value: 5000, color: 'bg-red-600 text-white border-red-800' },
    { label: '1만', value: 10000, color: 'bg-blue-600 text-white border-blue-800' },
    { label: '5만', value: 50000, color: 'bg-emerald-600 text-white border-emerald-800' },
    { label: '10만', value: 100000, color: 'bg-purple-600 text-white border-purple-800' },
  ] as const;

  const extraChips = [
    { label: '50만', value: 500000, color: 'bg-amber-500 text-amber-950 border-amber-700' },
    { label: '100만', value: 1000000, color: 'bg-zinc-900 text-yellow-500 border-yellow-700' },
    { label: '2배', value: 'DOUBLE' as const, color: 'bg-zinc-800 text-white border-zinc-950' },
  ];

  const addChip = (chip: { label: string; value: number | 'DOUBLE'; color: string }) => {
    if (chip.value === 'DOUBLE') {
      playSfx('chipHeavy');
      setBetAmount((prev) => prev * 2);
    } else {
      const amount = chip.value as number;
      playSfx(amount >= 100000 ? 'chipHeavy' : 'chip');
      setBetAmount((prev) => prev + amount);
    }
  };

  if (!table) {
    return (
      <div className={`xl:flex w-80 2xl:w-[420px] border-l border-zinc-800 p-6 flex-col bg-zinc-950 shrink-0 ${isOpen ? 'flex fixed inset-y-0 right-0 z-50' : 'hidden'}`}>
        <div className="flex-1 border border-zinc-800 border-dashed rounded-xl flex items-center justify-center text-zinc-600 bg-zinc-900/30">
          <div className="text-center px-6">
            <Info size={32} className="mx-auto mb-4 opacity-50" />
            <p className="text-sm font-medium mb-2 text-zinc-400">테이블을 선택해주세요</p>
            <p className="text-xs opacity-70">테이블 선택 시 GPT, Gemini, Claude의 실시간 게임 분석 의견이 표시됩니다.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile/Tablet Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm xl:hidden" onClick={onClose}></div>
      )}
      
      {/* Panel */}
      <div className={`fixed inset-y-0 right-0 z-50 w-[85vw] max-w-sm xl:max-w-none sm:w-80 2xl:w-[420px] xl:static h-full min-h-0 border-l border-zinc-800 bg-zinc-950 flex-col overflow-y-auto custom-scrollbar animate-in slide-in-from-right xl:animate-none transition-transform ${isOpen ? 'flex' : 'hidden xl:flex'}`}>
        {/* Header Info */}
        <div className="px-4 py-3 border-b border-zinc-800/80 sticky top-0 bg-zinc-950/95 backdrop-blur-sm z-10">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white tracking-tight truncate">{table.name}</h2>
              <div className="text-[11px] text-zinc-500 font-mono mt-0.5 flex gap-1.5">
                <span>{table.gameCode}</span>
                <span>•</span>
                <span>{table.stats.shoeNumber}</span>
              </div>
            </div>
            <div className="flex items-start gap-3 shrink-0">
              <div className="text-right">
                <div className="text-[11px] text-zinc-400">회차: <span className="font-mono text-zinc-200">{table.stats.currentRound}회</span></div>
                <div className="text-[11px] text-zinc-400 mt-0.5">마감: <span className="font-mono text-amber-500 font-bold">{table.timer}초</span></div>
              </div>
              {onClose && (
                <button onClick={onClose} className="xl:hidden p-1 bg-zinc-900 text-zinc-400 hover:text-white rounded-full">
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="text-[11px] min-w-0">
            <span className="text-zinc-500 mr-1">연속</span>
            <span className={`font-bold ${table.stats.currentStreak.includes('Player') ? 'text-blue-400' : table.stats.currentStreak.includes('Banker') ? 'text-red-400' : 'text-emerald-400'}`}>
              {table.stats.currentStreak}
            </span>
          </div>
          <div className="flex gap-1 overflow-hidden justify-end max-w-[210px]">
            {table.stats.recentResults.slice(-10).map((res, i, arr) => (
              <ResultDot key={`${res}-${i}`} result={res} isLast={i === arr.length - 1} compact />
            ))}
          </div>
        </div>
      </div>

      <div className="p-3 flex flex-col gap-2.5">
        {/* Decision + Betting (priority) */}
        <div className="bg-zinc-900 border border-amber-500/30 rounded-xl overflow-hidden shadow-lg shadow-amber-900/10">
          <div className="bg-amber-950/30 px-3 py-2 border-b border-amber-500/20 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <h3 className="font-bold text-amber-500 text-sm">최종 참고 의견</h3>
            </div>
            <span className="text-[10px] text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded-full border border-zinc-800 inline-flex items-center gap-1">
              일치도: {table.ai.consensus}
              {beginnerMode && <HelpTooltip termId="consensus" />}
            </span>
          </div>
          
          <div className="p-3 flex flex-col gap-2.5">
            {/* Compact recommendation (not the execution amount) */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="text-[10px] text-zinc-500 shrink-0">추천</span>
                <span className={`text-xl font-bold tracking-tight ${getOpinionColor(table.ai.finalOpinion)}`}>
                  {getOpinionText(table.ai.finalOpinion)}
                </span>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] text-zinc-500">참고 금액</div>
                <div className="text-sm font-mono font-medium text-zinc-300">
                  {isPassive ? '-' : `${table.ai.recommendedAmount.toLocaleString()}원`}
                </div>
              </div>
            </div>

            {!isPassive && (
              <div className="flex flex-col gap-2 border-t border-amber-500/15 pt-2.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-zinc-200">실행 금액</label>
                  <div className="flex items-center gap-2">
                    {!isPassive && betAmount !== table.ai.recommendedAmount && (
                      <button
                        type="button"
                        onClick={() => {
                          playSfx('ui');
                          setBetAmount(table.ai.recommendedAmount);
                        }}
                        className="text-[10px] text-amber-400 hover:text-amber-300"
                      >
                        추천으로
                      </button>
                    )}
                    <button 
                      onClick={() => { playSfx('ui'); setBetAmount(0); }}
                      className="text-[10px] text-zinc-500 hover:text-white px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
                    >
                      초기화
                    </button>
                  </div>
                </div>
                  
                <div className="bg-zinc-950 border border-amber-500/25 rounded-lg px-3 py-2.5 flex items-center justify-between">
                  <span className={`text-sm font-bold ${getOpinionColor(table.ai.finalOpinion)}`}>
                    {getOpinionText(table.ai.finalOpinion)}
                  </span>
                  <div className="flex items-center">
                    <span className="font-mono font-bold text-white text-xl">{betAmount.toLocaleString()}</span>
                    <span className="text-zinc-500 text-sm ml-1">원</span>
                  </div>
                </div>

                {beginnerMode && (
                  <p className="text-[11px] text-zinc-500 leading-snug">
                    칩을 눌러 금액을 맞춘 뒤 확정하세요. AI는 참고용입니다.
                  </p>
                )}

                <div className="flex flex-wrap justify-center gap-2">
                  {primaryChips.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => addChip(chip)}
                      className={`w-11 h-11 rounded-full border-[3px] border-dashed shadow-md flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ${chip.color}`}
                      style={{
                        boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.2), 0 4px 6px -1px rgba(0,0,0,0.5)'
                      }}
                    >
                      <div className="w-7 h-7 rounded-full border border-current flex items-center justify-center bg-black/10 text-[10px] font-bold">
                        {chip.label}
                      </div>
                    </button>
                  ))}
                </div>

                {showMoreChips && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {extraChips.map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => addChip(chip)}
                        className={`w-11 h-11 rounded-full border-[3px] border-dashed shadow-md flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ${chip.color}`}
                        style={{
                          boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.2), 0 4px 6px -1px rgba(0,0,0,0.5)'
                        }}
                      >
                        <div className="w-7 h-7 rounded-full border border-current flex items-center justify-center bg-black/10 text-[10px] font-bold">
                          {chip.label}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    playSfx('ui');
                    setShowMoreChips((v) => !v);
                  }}
                  className="text-[11px] text-zinc-500 hover:text-zinc-300 self-center"
                >
                  {showMoreChips ? '고액 칩 접기' : '고액 칩 · 2배 더보기'}
                </button>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => playSfx('skip')}
                    className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    이번 회차 건너뛰기
                  </button>
                  <button 
                    onClick={() => {
                      playSfx('betConfirm');
                      console.log(`[베팅 기록 저장] 타겟: ${table.ai.finalOpinion}, 금액: ${betAmount}`);
                      alert(`[내부 기록 완료]\n${getOpinionText(table.ai.finalOpinion)}에 ${betAmount.toLocaleString()}원 베팅을 진행했습니다.`);
                    }}
                    className="py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none flex items-center justify-center gap-2"
                    disabled={table.status === 'risk_blocked' || betAmount <= 0}
                  >
                    베팅 기록 및 확정
                  </button>
                </div>
              </div>
            )}

            {['WAIT', 'SKIP', 'PAUSE', 'STOP', 'DATA_ERROR'].includes(table.ai.finalOpinion) && (
              <div className="grid grid-cols-2 gap-2 border-t border-zinc-800/80 pt-2.5">
                <button type="button" onClick={() => playSfx('skip')} className="py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors">
                  관찰 계속
                </button>
                <button type="button" onClick={() => playSfx('ruleTrigger')} className="py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors">
                  강제 개입
                </button>
              </div>
            )}
          </div>
        </div>

        <ActionGuidance
          opinion={table.ai.finalOpinion}
          consensus={table.ai.consensus}
          beginnerMode={beginnerMode}
          compact
        />

        {!isPassive && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => {
                playSfx('ui');
                setShowEvidence((v) => !v);
              }}
              className="w-full px-3 py-2 flex justify-between items-center hover:bg-zinc-800/40 transition-colors"
            >
              <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                <Activity size={12} className="text-amber-500" />
                유사 근거 · 적중률 62.8%
              </span>
              {showEvidence ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
            </button>
            {showEvidence && (
              <div className="px-3 pb-2.5 flex flex-col gap-2 border-t border-zinc-800/80 pt-2">
                <div className="flex justify-between items-end">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-zinc-500">과거 적중률 (유사 패턴 4,218건)</span>
                    <span className="text-sm font-bold text-zinc-200">62.8%</span>
                  </div>
                  <div className="flex flex-col gap-0.5 text-right">
                    <span className="text-[10px] text-zinc-500">다음 예상 분포</span>
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="text-blue-400">P:48</span>
                      <span className="text-red-400">B:42</span>
                      <span className="text-emerald-400">T:10</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-xs px-0.5">
          <div className="flex justify-between">
            <span className="text-zinc-500">적용 규칙</span>
            <span className="text-zinc-300">{table.ai.appliedRule}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">현재 마틴</span>
            <span className="text-zinc-300">2 / 8단계</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">데이터 상태</span>
            <span className="text-teal-400">정상</span>
          </div>
        </div>

        {['SKIP', 'PAUSE', 'STOP', 'DATA_ERROR'].includes(table.ai.finalOpinion) && table.ai.skipReasons && (
          <div className="bg-zinc-950 border border-zinc-800 rounded p-3 text-xs">
            <div className="text-amber-500 font-bold mb-2">관망/중단 사유</div>
            <ul className="flex flex-col gap-1.5 text-zinc-300">
              {table.ai.skipReasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-zinc-600 mt-0.5">•</span>
                  <span className="leading-relaxed">{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="text-[10px] text-zinc-500 leading-tight px-0.5 flex items-start gap-1.5">
          <Info size={12} className="shrink-0 mt-0.5" />
          AI 분석은 결과를 보장하지 않으며 최종 판단은 사용자에게 있습니다.
        </div>

        {/* AI Detail Cards */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 mt-2 ml-1">
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">AI 모델 상세 분석</h4>
          </div>
          
          {table.ai.discussionSummary && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs mb-1">
              <div className="flex items-center gap-1.5 mb-1.5 text-amber-500 font-bold">
                <Info size={14} />
                <span>AI 의견 토론 요약</span>
              </div>
              <p className="text-zinc-300 leading-relaxed">
                {table.ai.discussionSummary}
              </p>
            </div>
          )}

          <AiDetailCard title="GPT-4o 분석" model={table.ai.gpt} color="emerald" />
          <AiDetailCard title="Gemini 1.5 Pro 분석" model={table.ai.gemini} color="blue" />
          <AiDetailCard title="Claude 3.5 Sonnet 분석" model={table.ai.claude} color="purple" />
        </div>

        {/* Risk Management Card */}
        <div className="mt-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
            <ShieldAlert size={14} className="text-zinc-400" />
            <h4 className="text-sm font-bold text-zinc-300">위험 관리 패널</h4>
            <div className="ml-auto text-[10px] bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded">
              진행 가능
            </div>
          </div>
          <div className="p-4 flex flex-col gap-3 text-xs">
            <MartingaleVisualizer currentStage={2} maxStages={8} baseAmount={10000} />
            <div className="h-px w-full bg-zinc-800 my-1"></div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">다음 패배 시 금액</span>
              <span className="text-zinc-300 font-mono">40,000원</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">8단계 남은 필요 자금</span>
              <span className="text-zinc-300 font-mono">2,520,000원</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500">로스컷까지 남은 금액</span>
              <span className="text-blue-400 font-mono">2,260,000원</span>
            </div>
            <div className="mt-2 text-[10px] text-teal-400 bg-teal-500/5 p-2 rounded border border-teal-500/10">
              현재 설정된 위험 한도 내에서 안전하게 진행 중입니다.
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

function AiDetailCard({ title, model, color }: { title: string, model: AiModelAnalysis, color: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden transition-all">
      <div 
        className="px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-zinc-800/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full bg-${color}-500`}></div>
          <span className="text-sm font-bold text-zinc-200">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-bold ${getOpinionColor(model.opinion)}`}>
            {getOpinionText(model.opinion)}
          </span>
          {expanded ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
        </div>
      </div>

      {expanded && (
        <div className="p-4 pt-0 border-t border-zinc-800/50 mt-2 text-xs flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex justify-between text-zinc-400 mt-3">
            <span>상태: <span className="text-zinc-200">{model.status}</span></span>
            <span>신뢰도: <span className="text-zinc-200">{model.confidence}%</span></span>
            <span>응답: <span className="text-zinc-200 font-mono">{model.responseTime}s</span></span>
          </div>

          <div className="bg-zinc-950 rounded p-3 border border-zinc-800/50">
            <ul className="flex flex-col gap-1.5 text-zinc-300">
              {model.reasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-zinc-600 mt-0.5">•</span>
                  <span className="leading-relaxed">{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded flex items-center justify-center gap-1.5 transition-colors">
              <FileText size={12} /> 원문 보기
            </button>
            <button className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded flex items-center justify-center gap-1.5 transition-colors">
              <Play size={12} /> 다시 요청
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultDot({ result, isLast, compact = false }: { key?: React.Key, result: GameResult, isLast: boolean, compact?: boolean }) {
  const bgColor = getResultColor(result, 'bg');
  const label = getResultLabel(result);

  return (
    <div className={`${compact ? 'w-4 h-4 text-[9px]' : 'w-5 h-5 text-[10px]'} rounded-full flex items-center justify-center font-bold text-white ${bgColor} ${isLast ? 'ring-2 ring-white/30 scale-110 shadow-lg' : ''}`}>
      {result}
    </div>
  );
}

function getOpinionText(opinion: AiOpinion) {
  return getResultLabel(opinion);
}

function getOpinionColor(opinion: AiOpinion) {
  return getResultColor(opinion, 'text');
}
