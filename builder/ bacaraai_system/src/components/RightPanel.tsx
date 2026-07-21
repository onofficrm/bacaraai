import { getResultColor, getResultLabel } from '../utils/colors';
import { Activity,  ChevronDown, ChevronUp, FileText, Info, ShieldAlert, SkipForward, Play, X  } from 'lucide-react';
import React, { useState } from 'react';
import { AiModelAnalysis, AiOpinion, GameResult, TableData } from '../types';
import MartingaleVisualizer from './MartingaleVisualizer';
import ActionGuidance from './ActionGuidance';
import HelpTooltip from './HelpTooltip';
import Roadmap from './Roadmap';
import EmptyRightPanel from './EmptyRightPanel';
import { playSfx } from '../audio/sfxEngine';
import {
  formatMoney,
  type BetSide,
  type LastBetResult,
  type PendingBet,
  type PlaceBetResult,
  type SessionMode,
  type SessionStatus,
} from '../hooks/useSession';

interface RightPanelProps {
  table: TableData | null;
  tables?: TableData[];
  isOpen?: boolean;
  onClose?: () => void;
  onSelectTable?: (id: string) => void;
  beginnerMode?: boolean;
  sessionStatus?: SessionStatus;
  sessionMode?: SessionMode | null;
  suggestedBet?: number;
  maxBet?: number;
  availableBankroll?: number;
  pendingBet?: PendingBet | null;
  lastBetResult?: LastBetResult | null;
  onPlaceBet?: (input: {
    tableId: string;
    tableName: string;
    side: BetSide;
    amount: number;
    baselineLatestId?: number | null;
    availableBalance?: number;
  }) => PlaceBetResult | Promise<PlaceBetResult>;
  onSkip?: (tableId: string) => void;
  onOpenSessionSettings?: () => void;
  onClearBetResult?: () => void;
}

export default function RightPanel({
  table,
  tables = [],
  isOpen = true,
  onClose,
  onSelectTable,
  beginnerMode = true,
  sessionStatus = 'idle',
  sessionMode = null,
  suggestedBet = 0,
  maxBet = 2_000_000,
  availableBankroll = 0,
  pendingBet = null,
  lastBetResult = null,
  onPlaceBet,
  onSkip,
  onOpenSessionSettings,
  onClearBetResult,
}: RightPanelProps) {
  const [betAmount, setBetAmount] = useState<number>(0);
  const [selectedSide, setSelectedSide] = useState<BetSide>('PLAYER');
  const [showMoreChips, setShowMoreChips] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showAiDetails, setShowAiDetails] = useState(false);
  const [showRisk, setShowRisk] = useState(false);
  const [betError, setBetError] = useState<string | null>(null);

  const recommendedSide: BetSide | null =
    table?.ai.finalOpinion === 'PLAYER'
      ? 'PLAYER'
      : table?.ai.finalOpinion === 'BANKER'
        ? 'BANKER'
        : null;

  React.useEffect(() => {
    const preferred =
      sessionStatus === 'running' && suggestedBet > 0
        ? suggestedBet
        : table?.ai?.recommendedAmount || 0;
    setBetAmount(preferred);
    setSelectedSide(
      table?.ai.finalOpinion === 'BANKER'
        ? 'BANKER'
        : table?.ai.finalOpinion === 'PLAYER'
          ? 'PLAYER'
          : 'PLAYER',
    );
    setShowMoreChips(false);
    setShowEvidence(false);
    setShowAiDetails(false);
    setShowRisk(false);
    setBetError(null);
  }, [table?.id]);

  React.useEffect(() => {
    if (!table) return;
    const preferred =
      sessionStatus === 'running' && suggestedBet > 0
        ? suggestedBet
        : table.ai.recommendedAmount || 0;
    setBetAmount(preferred);
  }, [table?.ai?.recommendedAmount, suggestedBet, sessionStatus, table]);

  React.useEffect(() => {
    if (!lastBetResult) return;
    if (lastBetResult.won === true) playSfx('win');
    else if (lastBetResult.won === false) playSfx('loss');
    else playSfx('tick');
  }, [lastBetResult?.id]);

  const isPassive = table
    ? ['WAIT', 'SKIP', 'PAUSE', 'STOP', 'ERROR', 'DATA_ERROR'].includes(table.ai.finalOpinion)
    : true;

  const isSettling = Boolean(pendingBet && table && pendingBet.tableId === table.id);
  const sessionReady = sessionStatus === 'running';
  const observeBlocked = sessionMode === 'observe';
  const hasLiveFeed = Boolean(table?.live?.connected);

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

  const sideOptions: { id: BetSide; label: string; short: string; active: string }[] = [
    { id: 'PLAYER', label: beginnerMode ? 'Player(P)' : 'PLAYER', short: 'P', active: 'bg-blue-600 border-blue-400 text-white' },
    { id: 'BANKER', label: beginnerMode ? 'Banker(B)' : 'BANKER', short: 'B', active: 'bg-red-500 border-red-400 text-white' },
    { id: 'TIE', label: beginnerMode ? 'Tie(T)' : 'TIE', short: 'T', active: 'bg-emerald-500 border-emerald-400 text-white' },
  ];

  const clampAmount = (amount: number) =>
    Math.max(0, Math.min(amount, maxBet, availableBankroll || amount));

  const addChip = (chip: { label: string; value: number | 'DOUBLE'; color: string }) => {
    if (isSettling) return;
    if (chip.value === 'DOUBLE') {
      playSfx('chipHeavy');
      setBetAmount((prev) => clampAmount(prev * 2 || suggestedBet || 1000));
    } else {
      const amount = chip.value as number;
      playSfx(amount >= 100000 ? 'chipHeavy' : 'chip');
      setBetAmount((prev) => clampAmount(prev + amount));
    }
    setBetError(null);
  };

  const applyRecommendedBet = () => {
    if (!table) return;
    playSfx('ui');
    if (recommendedSide) {
      setSelectedSide(recommendedSide);
    }
    const amount =
      suggestedBet > 0
        ? suggestedBet
        : table.ai.recommendedAmount > 0
          ? table.ai.recommendedAmount
          : 10000;
    setBetAmount(clampAmount(amount));
    setBetError(
      recommendedSide
        ? null
        : 'AI가 관망 중입니다. 사이드를 직접 선택한 뒤 금액을 확인하세요.',
    );
  };

  const handleConfirmBet = async () => {
    if (!table || !onPlaceBet) return;
    if (!sessionReady) {
      setBetError('먼저 세션을 시작해 주세요.');
      playSfx('error');
      return;
    }
    if (observeBlocked) {
      setBetError('관찰 모드에서는 베팅할 수 없습니다.');
      playSfx('error');
      return;
    }
    if (betAmount <= 0) {
      setBetError('베팅 금액을 입력해 주세요.');
      playSfx('error');
      return;
    }

    const result = await onPlaceBet({
      tableId: table.id,
      tableName: table.name,
      side: selectedSide,
      amount: betAmount,
      baselineLatestId: hasLiveFeed ? table.live?.latestId ?? 0 : null,
      availableBalance,
    });

    if (!result.ok) {
      setBetError(result.error);
      playSfx('error');
      return;
    }

    setBetError(null);
    playSfx('betConfirm');
  };

  const sideDisplayLabel = (side: BetSide) => {
    if (side === 'BANKER') return beginnerMode ? 'Banker(B)' : 'BANKER';
    if (side === 'TIE') return beginnerMode ? 'Tie(T)' : 'TIE';
    return beginnerMode ? 'Player(P)' : 'PLAYER';
  };

  const sideShortLabel = (side: BetSide) => {
    if (side === 'BANKER') return 'Banker';
    if (side === 'TIE') return 'Tie';
    return 'Player';
  };

  if (!table) {
    return (
      <>
        {isOpen && (
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm xl:hidden" onClick={onClose} />
        )}
        <div
          className={`fixed inset-y-0 right-0 z-50 w-[85vw] max-w-sm xl:max-w-none sm:w-80 2xl:w-[420px] xl:static h-full min-h-0 border-l border-zinc-800 bg-zinc-950 flex-col shrink-0 ${
            isOpen ? 'flex' : 'hidden xl:flex'
          }`}
        >
          <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">시작하기</span>
            {onClose && (
              <button type="button" onClick={onClose} className="xl:hidden p-1 text-zinc-500 hover:text-white">
                <X size={18} />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            <EmptyRightPanel
              tables={tables}
              onSelectTable={onSelectTable ?? (() => undefined)}
              beginnerMode={beginnerMode}
            />
          </div>
        </div>
      </>
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
                  ? `AI는 ${opinionLabel}입니다. Player/Banker/Tie를 직접 고르거나 다른 테이블을 보세요.`
                  : `① 사이드·금액 확인 → ② 베팅 확정 · 추천 ${opinionLabel} / ${(table.ai.recommendedAmount).toLocaleString()}원`}
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
            {!sessionReady && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
                <p className="text-xs font-bold text-amber-300 mb-1">세션이 필요합니다</p>
                <p className="text-[11px] text-zinc-400 mb-2">베팅 전에 세션을 시작해 주세요.</p>
                <button
                  type="button"
                  onClick={() => {
                    playSfx('ui');
                    onOpenSessionSettings?.();
                  }}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-lg text-xs font-bold"
                >
                  세션 설정 열기
                </button>
              </div>
            )}

            {sessionReady && observeBlocked && (
              <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-[11px] text-zinc-400">
                관찰 모드에서는 기록만 가능합니다. 헤더에서 AI 추천/섀도 모드로 바꾸면 베팅할 수 있습니다.
              </div>
            )}

            {isSettling && (
              <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2.5 text-center">
                <p className="text-sm font-bold text-sky-300 animate-pulse">
                  {pendingBet?.baselineLatestId != null ? '실결과 대기 중…' : '결과 확인 중…'}
                </p>
                <p className="text-[11px] text-zinc-400 mt-1">
                  {sideShortLabel(pendingBet?.side || 'PLAYER')} · {formatMoney(pendingBet?.amount || 0)}
                  {pendingBet?.baselineLatestId != null ? ' · 다음 회차 결과에 정산' : ''}
                </p>
              </div>
            )}

            {lastBetResult && lastBetResult.tableId === table.id && !isSettling && (
              <div
                className={`rounded-lg border px-3 py-2.5 ${
                  lastBetResult.won === true
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : lastBetResult.won === false
                      ? 'border-rose-500/30 bg-rose-500/10'
                      : 'border-zinc-700 bg-zinc-900'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p
                      className={`text-xs font-bold mb-0.5 ${
                        lastBetResult.won === true
                          ? 'text-emerald-300'
                          : lastBetResult.won === false
                            ? 'text-rose-300'
                            : 'text-zinc-300'
                      }`}
                    >
                      {lastBetResult.amount > 0 ? '베팅 결과' : '건너뛰기'}
                    </p>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">{lastBetResult.message}</p>
                    {lastBetResult.amount > 0 && (
                      <p className="text-[11px] font-mono mt-1 text-zinc-400">
                        손익 {formatMoney(lastBetResult.pnlDelta, true)}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="text-[10px] text-zinc-500 hover:text-zinc-300"
                    onClick={() => onClearBetResult?.()}
                  >
                    닫기
                  </button>
                </div>
              </div>
            )}

            {betError && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-300">
                {betError}
              </div>
            )}

            {isRisk ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-3 text-center">
                <p className="text-sm font-bold text-red-300 mb-1">이번 회차는 쉬세요</p>
                <p className="text-[11px] text-zinc-400">로스컷·마틴 한도 때문에 베팅이 막혀 있습니다.</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center gap-2">
                  <label className="text-xs font-bold text-zinc-200">베팅 사이드</label>
                  {recommendedSide && (
                    <button
                      type="button"
                      onClick={applyRecommendedBet}
                      disabled={isSettling || !sessionReady || observeBlocked}
                      className="text-[10px] font-bold text-amber-400 hover:text-amber-300 disabled:opacity-40"
                    >
                      추천대로 ({sideShortLabel(recommendedSide)}
                      {table.ai.recommendedAmount > 0
                        ? ` · ${table.ai.recommendedAmount.toLocaleString()}원`
                        : suggestedBet > 0
                          ? ` · ${suggestedBet.toLocaleString()}원`
                          : ''}
                      )
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {sideOptions.map((opt) => {
                    const active = selectedSide === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={isSettling || !sessionReady || observeBlocked}
                        onClick={() => {
                          playSfx('ui');
                          setSelectedSide(opt.id);
                          setBetError(null);
                        }}
                        className={`py-2.5 rounded-lg border text-xs font-bold transition-colors disabled:opacity-40 ${
                          active
                            ? opt.active
                            : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-zinc-200">실행 금액</label>
                  <div className="flex items-center gap-2">
                    {suggestedBet > 0 && betAmount !== suggestedBet && (
                      <button
                        type="button"
                        onClick={() => {
                          playSfx('ui');
                          setBetAmount(clampAmount(suggestedBet));
                          setBetError(null);
                        }}
                        className="text-[10px] text-amber-400 hover:text-amber-300"
                      >
                        단계 금액
                      </button>
                    )}
                    {table.ai.recommendedAmount > 0 && betAmount !== table.ai.recommendedAmount && (
                      <button
                        type="button"
                        onClick={() => {
                          playSfx('ui');
                          setBetAmount(clampAmount(table.ai.recommendedAmount));
                          setBetError(null);
                        }}
                        className="text-[10px] text-amber-400 hover:text-amber-300"
                      >
                        추천 금액
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        playSfx('ui');
                        setBetAmount(0);
                        setBetError(null);
                      }}
                      className="text-[10px] text-zinc-500 hover:text-white px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
                    >
                      초기화
                    </button>
                  </div>
                </div>

                <div className={`bg-zinc-950 border rounded-lg px-3 py-2 flex items-center justify-between ${
                  selectedSide === 'BANKER'
                    ? 'border-red-500/40'
                    : selectedSide === 'TIE'
                      ? 'border-emerald-500/40'
                      : 'border-blue-500/40'
                }`}>
                  <span className={`text-sm font-bold ${getOpinionColor(selectedSide === 'TIE' ? 'WAIT' : selectedSide)}`}>
                    {selectedSide === 'TIE' ? (
                      <span className="text-emerald-400">{sideDisplayLabel(selectedSide)}</span>
                    ) : (
                      sideDisplayLabel(selectedSide)
                    )}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono font-bold text-white text-xl leading-none">{betAmount.toLocaleString()}</span>
                    <span className="text-zinc-500 text-xs">원</span>
                  </div>
                </div>

                {beginnerMode && (
                  <p className="text-[11px] text-zinc-500 leading-snug -mt-0.5">
                    가상머니 {formatMoney(availableBankroll)} · 최대 {formatMoney(maxBet)}
                    {hasLiveFeed ? ' · 실결과 정산' : ' · 적중 시 입금 / 뱅커 5% 수수료'}
                  </p>
                )}

                <div className="flex flex-wrap justify-center gap-1.5">
                  {primaryChips.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => addChip(chip)}
                      disabled={isSettling || !sessionReady || observeBlocked}
                      className={`w-10 h-10 rounded-full border-[3px] border-dashed shadow-md flex items-center justify-center transition-transform hover:scale-110 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 ${chip.color}`}
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
                        disabled={isSettling || !sessionReady || observeBlocked}
                        className={`w-10 h-10 rounded-full border-[3px] border-dashed shadow-md flex items-center justify-center transition-transform hover:scale-110 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 ${chip.color}`}
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

                <div className="rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-center">
                  <p className="text-[10px] text-zinc-500 mb-0.5">확정 전 확인</p>
                  <p className="text-sm font-bold text-zinc-100">
                    <span className={
                      selectedSide === 'BANKER'
                        ? 'text-red-400'
                        : selectedSide === 'TIE'
                          ? 'text-emerald-400'
                          : 'text-blue-400'
                    }>
                      {sideShortLabel(selectedSide)}
                    </span>
                    <span className="text-zinc-600 mx-1.5">·</span>
                    <span className="font-mono">{betAmount.toLocaleString()}원</span>
                    <span className="text-zinc-600 mx-1.5">·</span>
                    <span>{table.name}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('skip');
                      onSkip?.(table.id);
                      setBetError(null);
                    }}
                    disabled={isSettling}
                    className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                  >
                    건너뛰기
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmBet}
                    className="py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none"
                    disabled={betAmount <= 0 || isSettling || !sessionReady || observeBlocked}
                  >
                    {isSettling ? '확인 중…' : '베팅 확정'}
                  </button>
                </div>

                {isPassive && (
                  <p className="text-[10px] text-zinc-500 text-center leading-relaxed">
                    AI는 {opinionLabel} 상태입니다. 사이드를 직접 고르거나 「추천대로」로 베팅할 수 있습니다.
                  </p>
                )}
              </>
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
