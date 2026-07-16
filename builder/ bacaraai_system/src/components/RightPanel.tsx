import { getResultColor, getResultLabel } from '../utils/colors';
import { Activity,  ChevronDown, ChevronUp, FileText, Info, ShieldAlert, SkipForward, Play, X  } from 'lucide-react';
import React, { useState } from 'react';
import { AiModelAnalysis, AiOpinion, GameResult, TableData } from '../types';
import MartingaleVisualizer from './MartingaleVisualizer';
import ActionGuidance from './ActionGuidance';
import HelpTooltip from './HelpTooltip';
import Roadmap from './Roadmap';
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
  const [showAiDetails, setShowAiDetails] = useState(false);
  const [showRisk, setShowRisk] = useState(false);

  React.useEffect(() => {
    if (table?.ai?.recommendedAmount) {
      setBetAmount(table.ai.recommendedAmount);
    }
    setShowMoreChips(false);
    setShowEvidence(false);
    setShowAiDetails(false);
    setShowRisk(false);
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
            <p className="text-sm font-medium mb-2 text-zinc-300">① 테이블을 선택해주세요</p>
            <p className="text-xs opacity-70 leading-relaxed">
              가운데 카드를 누르면 AI 의견과 베팅 안내가 여기에 나타납니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const opinionLabel = getOpinionText(table.ai.finalOpinion, beginnerMode);
  const isRisk = table.status === 'risk_blocked';

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
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight truncate">{table.name}</h2>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded shrink-0">
                  선택됨
                </span>
              </div>
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

      <div className="p-3 flex flex-col gap-2">
        {/* Game table record (roadmap) — always visible */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
          <div className="px-3 py-1.5 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-300">게임 테이블 기록</span>
            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
              <span className="text-blue-400">P {table.stats.player}</span>
              <span className="text-red-400">B {table.stats.banker}</span>
              <span className="text-emerald-400">T {table.stats.tie}</span>
            </div>
          </div>
          <div className="p-2">
            <Roadmap data={table.roadmap} />
          </div>
        </div>

        {beginnerMode && (
          <div className={`rounded-lg border px-3 py-2 ${
            isRisk
              ? 'border-red-500/30 bg-red-500/10'
              : isPassive
                ? 'border-zinc-700 bg-zinc-900'
                : 'border-teal-500/30 bg-teal-500/10'
          }`}>
            <p className={`text-xs font-bold mb-0.5 ${isRisk ? 'text-red-300' : isPassive ? 'text-zinc-300' : 'text-teal-300'}`}>
              지금 할 일
            </p>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              {isRisk
                ? '위험 한도에 걸려 이번 회차는 쉬세요.'
                : isPassive
                  ? `지금은 ${opinionLabel} 상태입니다. 관망하거나 다른 테이블을 보세요.`
                  : `① 금액 확인 → ② 베팅 확정 · 추천 ${opinionLabel} / ${(table.ai.recommendedAmount).toLocaleString()}원`}
            </p>
          </div>
        )}

        {/* Action-first card */}
        <div className="bg-zinc-900 border border-amber-500/30 rounded-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-amber-500/20 bg-amber-950/25 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span className="text-zinc-500 shrink-0">추천</span>
              <span className={`font-bold text-base ${getOpinionColor(table.ai.finalOpinion)}`}>
                {opinionLabel}
              </span>
              <span className="text-zinc-700">·</span>
              <span className="font-mono text-zinc-300">
                {isPassive ? '-' : `${table.ai.recommendedAmount.toLocaleString()}원`}
              </span>
              <span className="text-zinc-700">·</span>
              <span className="text-zinc-400 inline-flex items-center gap-0.5">
                {table.ai.consensus}
                {beginnerMode && <HelpTooltip termId="consensus" />}
              </span>
            </div>
          </div>

          <div className="p-3 flex flex-col gap-2">
            {isRisk ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-3 text-center">
                <p className="text-sm font-bold text-red-300 mb-1">이번 회차는 쉬세요</p>
                <p className="text-[11px] text-zinc-400">로스컷·마틴 한도 때문에 베팅이 막혀 있습니다.</p>
              </div>
            ) : !isPassive ? (
              <>
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-zinc-200">실행 금액</label>
                  <div className="flex items-center gap-2">
                    {betAmount !== table.ai.recommendedAmount && (
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
                      type="button"
                      onClick={() => { playSfx('ui'); setBetAmount(0); }}
                      className="text-[10px] text-zinc-500 hover:text-white px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
                    >
                      초기화
                    </button>
                  </div>
                </div>

                <div className="bg-zinc-950 border border-amber-500/30 rounded-lg px-3 py-2 flex items-center justify-between">
                  <span className={`text-sm font-bold ${getOpinionColor(table.ai.finalOpinion)}`}>
                    {opinionLabel}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono font-bold text-white text-xl leading-none">{betAmount.toLocaleString()}</span>
                    <span className="text-zinc-500 text-xs">원</span>
                  </div>
                </div>

                {beginnerMode && (
                  <p className="text-[11px] text-zinc-500 leading-snug -mt-0.5">
                    칩으로 맞춘 뒤 확정 · AI는 참고용
                  </p>
                )}

                <div className="flex flex-wrap justify-center gap-1.5">
                  {primaryChips.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => addChip(chip)}
                      className={`w-10 h-10 rounded-full border-[3px] border-dashed shadow-md flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ${chip.color}`}
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
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {extraChips.map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => addChip(chip)}
                        className={`w-10 h-10 rounded-full border-[3px] border-dashed shadow-md flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ${chip.color}`}
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
                  className="text-[11px] text-zinc-500 hover:text-zinc-300 self-center -mt-0.5"
                >
                  {showMoreChips ? '고액 칩 접기' : '고액 · 2배'}
                </button>

                {/* Confirm summary */}
                <div className="rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-center">
                  <p className="text-[10px] text-zinc-500 mb-0.5">확정 전 확인</p>
                  <p className="text-sm font-bold text-zinc-100">
                    <span className={getOpinionColor(table.ai.finalOpinion)}>{opinionLabel}</span>
                    <span className="text-zinc-600 mx-1.5">·</span>
                    <span className="font-mono">{betAmount.toLocaleString()}원</span>
                    <span className="text-zinc-600 mx-1.5">·</span>
                    <span>{table.name}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => playSfx('skip')}
                    className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    건너뛰기
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('betConfirm');
                      console.log(`[베팅 기록 저장] 타겟: ${table.ai.finalOpinion}, 금액: ${betAmount}`);
                      alert(`[내부 기록 완료]\n${opinionLabel}에 ${betAmount.toLocaleString()}원 베팅을 진행했습니다.`);
                    }}
                    className="py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none"
                    disabled={betAmount <= 0}
                  >
                    베팅 확정
                  </button>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
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
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => {
                playSfx('ui');
                setShowEvidence((v) => !v);
              }}
              className="w-full px-3 py-1.5 flex justify-between items-center hover:bg-zinc-800/40 transition-colors"
            >
              <span className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                <Activity size={11} className="text-amber-500" />
                유사 근거 · 62.8%
              </span>
              {showEvidence ? <ChevronUp size={13} className="text-zinc-500" /> : <ChevronDown size={13} className="text-zinc-500" />}
            </button>
            {showEvidence && (
              <div className="px-3 pb-2 flex flex-col gap-2 border-t border-zinc-800/80 pt-2">
                <div className="flex justify-between items-end">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-zinc-500">유사 패턴 4,218건</span>
                    <span className="text-sm font-bold text-zinc-200">62.8%</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="text-blue-400">P:48</span>
                    <span className="text-red-400">B:42</span>
                    <span className="text-emerald-400">T:10</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500 px-0.5">
          <span>규칙 <span className="text-zinc-300">{table.ai.appliedRule}</span></span>
          <span>{beginnerMode ? '금액 단계' : '마틴'} <span className="text-zinc-300">2/8</span></span>
          <span>데이터 <span className="text-teal-400">정상</span></span>
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

        {/* AI details — collapsed by default */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => {
              playSfx('ui');
              setShowAiDetails((v) => !v);
            }}
            className="w-full px-3 py-1.5 flex justify-between items-center hover:bg-zinc-800/40 transition-colors"
          >
            <span className="text-[11px] text-zinc-400">AI 모델 상세</span>
            <span className="flex items-center gap-2 text-[11px] font-mono">
              <span className={getOpinionColor(table.ai.gpt.opinion)}>{getOpinionText(table.ai.gpt.opinion)}</span>
              <span className={getOpinionColor(table.ai.gemini.opinion)}>{getOpinionText(table.ai.gemini.opinion)}</span>
              <span className={getOpinionColor(table.ai.claude.opinion)}>{getOpinionText(table.ai.claude.opinion)}</span>
              {showAiDetails ? <ChevronUp size={13} className="text-zinc-500" /> : <ChevronDown size={13} className="text-zinc-500" />}
            </span>
          </button>
          {showAiDetails && (
            <div className="p-2 pt-0 flex flex-col gap-2 border-t border-zinc-800/80">
              {table.ai.discussionSummary && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-xs mt-2">
                  <div className="flex items-center gap-1.5 mb-1 text-amber-500 font-bold">
                    <Info size={12} />
                    <span>토론 요약</span>
                  </div>
                  <p className="text-zinc-300 leading-relaxed">{table.ai.discussionSummary}</p>
                </div>
              )}
              <AiDetailCard title="GPT-4o" model={table.ai.gpt} color="emerald" />
              <AiDetailCard title="Gemini 1.5 Pro" model={table.ai.gemini} color="blue" />
              <AiDetailCard title="Claude 3.5" model={table.ai.claude} color="purple" />
            </div>
          )}
        </div>

        {/* Risk — collapsed by default */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => {
              playSfx('ui');
              setShowRisk((v) => !v);
            }}
            className="w-full px-3 py-1.5 flex justify-between items-center hover:bg-zinc-800/40 transition-colors"
          >
            <span className="text-[11px] text-zinc-400 flex items-center gap-1.5">
              <ShieldAlert size={12} />
              위험 관리
            </span>
            <span className="flex items-center gap-2">
              <span className="text-[10px] bg-teal-500/10 text-teal-400 border border-teal-500/20 px-1.5 py-0.5 rounded">진행 가능</span>
              {showRisk ? <ChevronUp size={13} className="text-zinc-500" /> : <ChevronDown size={13} className="text-zinc-500" />}
            </span>
          </button>
          {showRisk && (
            <div className="p-3 flex flex-col gap-3 text-xs border-t border-zinc-800/80">
              <MartingaleVisualizer currentStage={2} maxStages={8} baseAmount={10000} />
              <div className="h-px w-full bg-zinc-800" />
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">다음 패배 시</span>
                <span className="text-zinc-300 font-mono">40,000원</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">8단계 필요 자금</span>
                <span className="text-zinc-300 font-mono">2,520,000원</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">로스컷까지</span>
                <span className="text-blue-400 font-mono">2,260,000원</span>
              </div>
            </div>
          )}
        </div>

        <div className="text-[10px] text-zinc-600 leading-tight px-0.5">
          AI는 참고용이며 최종 판단은 사용자에게 있습니다.
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

function getOpinionText(opinion: AiOpinion, friendly = false) {
  return getResultLabel(opinion, friendly);
}

function getOpinionColor(opinion: AiOpinion) {
  return getResultColor(opinion, 'text');
}
