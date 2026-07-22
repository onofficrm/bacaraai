import { getResultColor, getResultLabel } from '../utils/colors';
import { Activity, ChevronDown, ChevronUp, FileText, Info, Pause, Play, Settings2, Square, X } from 'lucide-react';
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AiModelAnalysis, AiOpinion, GameResult, SessionConfig, TableData } from '../types';
import MartingaleVisualizer from './MartingaleVisualizer';
import Roadmap from './Roadmap';
import EmptyRightPanel from './EmptyRightPanel';
import { playSfx } from '../audio/sfxEngine';
import useIsDesktopXl from '../hooks/useIsDesktopXl';
import {
  DEFAULT_SESSION_CONFIG,
  formatMoney,
  modeLabel,
  resolveBetAmount,
  strategyLabel,
  type BetSide,
  type LastBetResult,
  type PendingBet,
  type PlaceBetResult,
  type SessionMode,
  type SessionStatus,
} from '../hooks/useSession';
import { formatPattern, patternSideLabel } from '../utils/patternMatch';
import PatternSequenceBuilder from './PatternSequenceBuilder';

type PanelMode = 'manual' | 'auto';

interface RightPanelProps {
  table: TableData | null;
  tables?: TableData[];
  isOpen?: boolean;
  onClose?: () => void;
  onSelectTable?: (id: string) => void;
  beginnerMode?: boolean;
  sessionStatus?: SessionStatus;
  sessionMode?: SessionMode | null;
  sessionConfig?: SessionConfig;
  sessionPnl?: number;
  martinStage?: number;
  suggestedBet?: number;
  maxBet?: number;
  availableBankroll?: number;
  pendingBets?: PendingBet[];
  lastBetResult?: LastBetResult | null;
  lastManualResult?: LastBetResult | null;
  lastAutoResult?: LastBetResult | null;
  onPlaceBet?: (input: {
    tableId: string;
    tableName: string;
    side: BetSide;
    amount: number;
    baselineLatestId?: number | null;
    baselineResultCount?: number;
    waitForLiveResult?: boolean;
    availableBalance?: number;
    source?: 'manual' | 'auto';
    historyMeta?: {
      gameCode?: string;
      shoeNumber?: string;
      round?: number;
      recentResults?: Array<'P' | 'B' | 'T'>;
      gptOpinion?: string;
      geminiOpinion?: string;
      claudeOpinion?: string;
      finalOpinion?: string;
      ruleLabel?: string;
    };
  }) => PlaceBetResult | Promise<PlaceBetResult>;
  onSkip?: (tableId: string) => void;
  onCancelBet?: (betId?: string) => void | Promise<PlaceBetResult>;
  onOpenSessionSettings?: () => void;
  onUpdateSessionConfig?: (config: SessionConfig) => void;
  onClearBetResult?: (source?: 'manual' | 'auto') => void;
  onPauseAuto?: () => void;
  onResumeAuto?: () => void;
  onStopAuto?: () => void;
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
  sessionConfig,
  sessionPnl = 0,
  martinStage = 1,
  suggestedBet = 0,
  maxBet = 2_000_000,
  availableBankroll = 0,
  pendingBets = [],
  lastBetResult = null,
  lastManualResult = null,
  lastAutoResult = null,
  onPlaceBet,
  onSkip,
  onCancelBet,
  onOpenSessionSettings,
  onUpdateSessionConfig,
  onClearBetResult,
  onPauseAuto,
  onResumeAuto,
  onStopAuto,
}: RightPanelProps) {
  const [panelMode, setPanelMode] = useState<PanelMode>('manual');
  const [betAmount, setBetAmount] = useState<number>(10000);
  const [selectedSide, setSelectedSide] = useState<BetSide>('PLAYER');
  const [showMoreChips, setShowMoreChips] = useState(false);
  const [showAiDetails, setShowAiDetails] = useState(false);
  const [showRisk, setShowRisk] = useState(false);
  const [betError, setBetError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [roadmapOpen, setRoadmapOpen] = useState(false);
  /** 모바일: 빠른 베팅(사이드+칩 우선). 데스크톱은 상세 기본 */
  const [quickBet, setQuickBet] = useState(true);
  const [showAiRec, setShowAiRec] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [highConfirmOpen, setHighConfirmOpen] = useState(false);
  const isDesktop = useIsDesktopXl();
  const submittingRef = React.useRef(false);

  const recommendedSide: BetSide | null =
    table?.ai.finalOpinion === 'PLAYER'
      ? 'PLAYER'
      : table?.ai.finalOpinion === 'BANKER'
        ? 'BANKER'
        : null;

  React.useEffect(() => {
    const preferred =
      (table?.ai?.recommendedAmount ?? 0) > 0
        ? table!.ai.recommendedAmount
        : suggestedBet > 0
          ? suggestedBet
          : 10000;
    setBetAmount(preferred);
    setSelectedSide(
      table?.ai.finalOpinion === 'BANKER'
        ? 'BANKER'
        : 'PLAYER',
    );
    setShowMoreChips(false);
    setShowAiDetails(false);
    setShowRisk(false);
    setBetError(null);
    setPanelMode('manual');
    setRoadmapOpen(isDesktop);
    setQuickBet(!isDesktop);
    setShowAiRec(isDesktop);
    setHighConfirmOpen(false);
    setSubmitting(false);
    submittingRef.current = false;
  }, [table?.id, isDesktop]);

  // 금액은 테이블 전환 시에만 맞추고, 칩 입력 중에는 덮어쓰지 않음
  // (라이브 폴링으로 table/suggestedBet 이 바뀌면 초기화되던 문제 방지)

  const resultForSfx = lastManualResult || lastAutoResult || lastBetResult;
  React.useEffect(() => {
    if (!resultForSfx) return;
    // 승리는 WinCelebration 에서 사운드·연출
    if (resultForSfx.won === true) return;
    if (resultForSfx.won === false) playSfx('loss');
    else playSfx('tick');
  }, [resultForSfx?.id]);

  const handleCancelBet = async (betId?: string) => {
    if (cancelling) return;
    playSfx('ui');
    setCancelling(true);
    setBetError(null);
    try {
      const result = await onCancelBet?.(betId);
      if (result && !result.ok) {
        setBetError(result.error || '베팅 취소에 실패했습니다.');
      }
    } finally {
      setCancelling(false);
    }
  };

  const isPassive = table
    ? ['WAIT', 'SKIP', 'PAUSE', 'STOP', 'ERROR', 'DATA_ERROR'].includes(table.ai.finalOpinion)
    : true;

  const manualPending = pendingBets.find((b) => b.source === 'manual') ?? null;
  const autoPending = pendingBets.find((b) => b.source === 'auto') ?? null;
  const isManualSettling = Boolean(manualPending);
  const isAutoSettling = Boolean(autoPending);
  const isSettling = isManualSettling || isAutoSettling;
  const autoActive = sessionStatus === 'running' || sessionStatus === 'paused';
  const autoRunning = sessionStatus === 'running';
  const waitForLiveResult = Boolean(
    table &&
      (table.id === 't1' ||
        table.gameCode === 'MD2729' ||
        table.live != null),
  );

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

  const sideOptions: { id: BetSide; label: string; active: string; flex: string }[] = [
    { id: 'PLAYER', label: 'Player', active: 'bg-blue-600 border-blue-400 text-white', flex: 'flex-[4]' },
    { id: 'TIE', label: 'Tie', active: 'bg-emerald-500 border-emerald-400 text-white', flex: 'flex-[2]' },
    { id: 'BANKER', label: 'Banker', active: 'bg-red-500 border-red-400 text-white', flex: 'flex-[4]' },
  ];

  const clampAmount = (amount: number) =>
    Math.max(0, Math.min(amount, maxBet, availableBankroll || amount));

  const addChip = (chip: { label: string; value: number | 'DOUBLE'; color: string }) => {
    if (isManualSettling) return;
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
    if (recommendedSide) setSelectedSide(recommendedSide);
    const amount =
      table.ai.recommendedAmount > 0
        ? table.ai.recommendedAmount
        : suggestedBet > 0
          ? suggestedBet
          : 10000;
    setBetAmount(clampAmount(amount));
    setBetError(
      recommendedSide
        ? null
        : '지금은 AI 관망입니다. 베팅할 곳을 직접 선택해 주세요.',
    );
  };

  const afterBetBalance = Math.max(0, availableBankroll - betAmount);
  const balanceWarn =
    betAmount > 0 && availableBankroll > 0 && betAmount > availableBankroll * 0.3
      ? `잔액의 ${Math.round((betAmount / availableBankroll) * 100)}%를 걸게 됩니다`
      : null;
  const needsHighConfirm =
    betAmount >= 100_000 ||
    (availableBankroll > 0 && betAmount >= availableBankroll * 0.25) ||
    betAmount >= maxBet * 0.5;

  const placeManualBet = async () => {
    if (!table || !onPlaceBet) return;
    if (submittingRef.current || isManualSettling) return;
    submittingRef.current = true;
    setSubmitting(true);
    setBetError(null);
    try {
      const result = await onPlaceBet({
        tableId: table.id,
        tableName: table.name,
        side: selectedSide,
        amount: betAmount,
        source: 'manual',
        waitForLiveResult,
        baselineLatestId: waitForLiveResult ? table.live?.latestId ?? 0 : null,
        baselineResultCount: waitForLiveResult ? table.stats.recentResults.length : undefined,
        availableBalance: availableBankroll,
        historyMeta: {
          gameCode: table.gameCode,
          shoeNumber: table.stats.shoeNumber || table.gameCode,
          round: table.stats.currentRound,
          recentResults: table.stats.recentResults.slice(-8),
          gptOpinion: table.ai.gpt.opinion,
          geminiOpinion: table.ai.gemini.opinion,
          claudeOpinion: table.ai.claude.opinion,
          finalOpinion: table.ai.finalOpinion,
          ruleLabel: '직접 베팅',
        },
      });

      if (!result.ok) {
        setBetError(result.error);
        playSfx('error');
        return;
      }

      setHighConfirmOpen(false);
      playSfx('betConfirm');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleConfirmBet = async () => {
    if (!table || !onPlaceBet) return;
    if (submittingRef.current || submitting || isManualSettling) return;
    if (betAmount <= 0) {
      setBetError('베팅 금액을 입력해 주세요.');
      playSfx('error');
      return;
    }
    if (betAmount > availableBankroll) {
      setBetError(`가상머니가 부족합니다. (가능 ${formatMoney(availableBankroll)})`);
      playSfx('error');
      return;
    }
    if (needsHighConfirm && !highConfirmOpen) {
      setHighConfirmOpen(true);
      playSfx('ui');
      return;
    }
    await placeManualBet();
  };

  const sideShortLabel = (side: BetSide) => {
    if (side === 'BANKER') return 'Banker';
    if (side === 'TIE') return 'Tie';
    return 'Player';
  };

  const sideColor = (side: BetSide) => {
    if (side === 'BANKER') return 'text-red-400';
    if (side === 'TIE') return 'text-emerald-400';
    return 'text-blue-400';
  };

  if (!table) {
    // 모바일: 닫혀 있으면 DOM에 올리지 않음 (흰 여백/레이아웃 밀림 방지)
    if (!isDesktop && !isOpen) return null;

    const emptyBody = (
      <>
        {!isDesktop && (
          <div className="flex justify-center pt-2 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-zinc-700" />
          </div>
        )}
        <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">시작하기</span>
          {!isDesktop && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 -mr-1 text-zinc-500 hover:text-white rounded-full touch-manipulation"
              aria-label="닫기"
            >
              <X size={20} />
            </button>
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar overscroll-contain scroll-touch p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <EmptyRightPanel
            tables={tables}
            onSelectTable={onSelectTable ?? (() => undefined)}
            beginnerMode={beginnerMode}
            onOpenAutoSettings={() => {
              playSfx('ui');
              onOpenSessionSettings?.();
            }}
          />
        </div>
      </>
    );

    if (isDesktop) {
      return (
        <div className="hidden xl:flex z-50 w-80 2xl:w-[420px] h-full min-h-0 border-l border-zinc-800 bg-zinc-950 flex-col shrink-0">
          {emptyBody}
        </div>
      );
    }

    return createPortal(
      <>
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="fixed inset-x-0 bottom-0 z-[70] w-full max-h-[min(70dvh,640px)] rounded-t-2xl border-t border-x border-zinc-800 bg-zinc-950 shadow-2xl flex flex-col">
          {emptyBody}
        </div>
      </>,
      document.body,
    );
  }

  const opinionLabel = getOpinionText(table.ai.finalOpinion, beginnerMode);
  const isRisk = table.status === 'risk_blocked';
  const cfg = sessionConfig;
  const stageNow = cfg ? Math.min(Math.max(1, martinStage), cfg.maxMartin) : martinStage;
  const nextAutoBet = cfg ? resolveBetAmount(cfg, stageNow) : suggestedBet;
  const amountModeLabel =
    cfg?.amountMode === 'custom' ? '단계별 직접' : '마틴(2배)';
  const customStepPreview =
    cfg?.amountMode === 'custom' && cfg.customSteps?.length
      ? cfg.customSteps
          .slice(0, cfg.maxMartin)
          .map((amt, i) => `${i + 1}단 ${formatMoney(amt)}`)
          .join(' · ')
      : null;

  // 모바일·태블릿: 닫혀 있으면 레이아웃에 참여하지 않음
  if (!isDesktop && !isOpen) return null;

  const panelInner = (
      <>
        {!isDesktop && (
          <div className="flex justify-center pt-2 pb-0.5 shrink-0">
            <div className="w-10 h-1 rounded-full bg-zinc-700" />
          </div>
        )}

        {/* Header */}
        <div className="px-4 py-2.5 sm:py-3 border-b border-zinc-800/80 shrink-0 bg-zinc-950 z-10">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">{table.name}</h2>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded shrink-0">
                  선택됨
                </span>
              </div>
              <div className="text-[11px] text-zinc-500 font-mono mt-0.5 flex gap-1.5">
                <span>{table.gameCode}</span>
                <span>•</span>
                <span>회차 {table.stats.currentRound}</span>
              </div>
            </div>
            <div className="flex items-start gap-2 shrink-0">
              {!isDesktop && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 -mr-1 bg-zinc-900 text-zinc-400 hover:text-white rounded-full touch-manipulation"
                  aria-label="닫기"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="text-[11px] min-w-0">
              <span className="text-zinc-500 mr-1">연속</span>
              <span
                className={`font-bold ${
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
            <div className="flex gap-1 overflow-hidden justify-end max-w-[210px]">
              {table.stats.recentResults.slice(-10).map((res, i, arr) => (
                <ResultDot key={`${res}-${i}`} result={res} isLast={i === arr.length - 1} compact />
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar overscroll-contain scroll-touch">
        <div className="p-3 sm:p-4 flex flex-col gap-3 pb-3">
          {/* Mode tabs — 베팅 진입을 최상단 */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800 sticky top-0 z-[5]">
            <button
              type="button"
              onClick={() => {
                playSfx('ui');
                setPanelMode('manual');
              }}
              className={`min-h-[48px] py-3 rounded-lg text-sm font-bold transition-colors touch-manipulation ${
                panelMode === 'manual'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              직접 베팅
            </button>
            <button
              type="button"
              onClick={() => {
                playSfx('ui');
                setPanelMode('auto');
              }}
              className={`min-h-[48px] py-3 rounded-lg text-sm font-bold transition-colors touch-manipulation ${
                panelMode === 'auto'
                  ? 'bg-amber-500 text-zinc-950 shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              오토베팅
            </button>
          </div>

          {pendingBets.length > 0 && (
            <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
              <div className="px-3 py-2 border-b border-zinc-800">
                <p className="text-[11px] font-bold text-zinc-300">진행 중 베팅</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  직접·오토 금액을 각각 표시합니다
                </p>
              </div>
              <ul className="divide-y divide-zinc-800">
                {pendingBets.map((bet) => (
                  <li key={bet.id} className="px-3 py-3 flex items-center gap-2">
                    <span
                      className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                        bet.source === 'auto'
                          ? 'text-amber-300 border-amber-500/40 bg-amber-500/10'
                          : 'text-blue-300 border-blue-500/40 bg-blue-500/10'
                      }`}
                    >
                      {bet.source === 'auto' ? '오토' : '직접'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-zinc-200 truncate">
                        <span className={sideColor(bet.side)}>{sideShortLabel(bet.side)}</span>
                        <span className="text-zinc-600 mx-1">·</span>
                        <span className="font-mono font-bold">{formatMoney(bet.amount)}</span>
                      </p>
                      <p className="text-[10px] text-zinc-500 truncate">{bet.tableName}</p>
                    </div>
                    <button
                      type="button"
                      disabled={cancelling}
                      onClick={() => void handleCancelBet(bet.id)}
                      className="shrink-0 min-h-[44px] px-3 text-[12px] font-bold text-rose-300 hover:text-rose-200 disabled:opacity-50 touch-manipulation"
                    >
                      취소
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {panelMode === 'manual' ? (
            <>
              {/* 빠른 베팅 토글 (모바일) */}
              {!isDesktop && (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
                  <div>
                    <p className="text-[12px] font-bold text-zinc-200">빠른 베팅</p>
                    <p className="text-[10px] text-zinc-500">사이드·칩만 표시 · 탭 한 번에 확정</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('ui');
                      setQuickBet((v) => !v);
                      if (quickBet) setShowAiRec(true);
                    }}
                    className={`min-h-[40px] px-3 rounded-lg text-xs font-bold border touch-manipulation ${
                      quickBet
                        ? 'bg-blue-600 border-blue-400 text-white'
                        : 'bg-zinc-950 border-zinc-700 text-zinc-400'
                    }`}
                  >
                    {quickBet ? 'ON' : 'OFF'}
                  </button>
                </div>
              )}

              {/* AI recommendation — 빠른 베팅에선 접힘 */}
              {(!quickBet || isDesktop || showAiRec) && (
                <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
                  <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-400">다음 게임 추천 · 참고용</span>
                    <span className="text-[10px] text-zinc-500">{table.ai.consensus}</span>
                  </div>
                  <div className="px-3 py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-lg font-bold ${getOpinionColor(table.ai.finalOpinion)}`}>
                        {opinionLabel}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {isPassive
                          ? '지금은 관망 추천입니다'
                          : `추천 금액 ${(table.ai.recommendedAmount || 0).toLocaleString()}원`}
                      </p>
                    </div>
                    {recommendedSide && !isRisk && (
                      <button
                        type="button"
                        onClick={applyRecommendedBet}
                        disabled={isManualSettling || submitting}
                        className="shrink-0 min-h-[44px] px-3 py-2 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-300 text-xs font-bold hover:bg-blue-600/30 disabled:opacity-40 touch-manipulation"
                      >
                        추천대로
                      </button>
                    )}
                  </div>
                </div>
              )}
              {quickBet && !isDesktop && !showAiRec && (
                <button
                  type="button"
                  onClick={() => {
                    playSfx('ui');
                    setShowAiRec(true);
                  }}
                  className="text-[11px] text-zinc-500 hover:text-zinc-300 text-center w-full min-h-[36px] touch-manipulation"
                >
                  AI 추천 보기
                </button>
              )}

              {isManualSettling && manualPending && (
                <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-3 text-center">
                  <p className="text-sm font-bold text-sky-300 animate-pulse">직접 베팅 접수 완료</p>
                  <p className="text-[12px] text-zinc-300 mt-1">
                    {sideShortLabel(manualPending.side)} · {formatMoney(manualPending.amount)}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-1 mb-3">
                    다음 게임 결과를 기다리고 있습니다.
                  </p>
                  <button
                    type="button"
                    disabled={cancelling}
                    onClick={() => void handleCancelBet(manualPending.id)}
                    className="w-full min-h-[48px] py-3 rounded-xl border border-rose-500/40 bg-rose-500/15 text-rose-300 text-sm font-bold hover:bg-rose-500/25 transition-colors disabled:opacity-50 touch-manipulation"
                  >
                    {cancelling ? '취소 중…' : '직접 베팅 취소 (금액 반환)'}
                  </button>
                </div>
              )}

              {/* 직접 / 오토 결과 각각 표시 */}
              {!isManualSettling && (
                <div className="flex flex-col gap-2">
                  {lastManualResult && lastManualResult.tableId === table.id && (
                    <BetResultCard
                      result={lastManualResult}
                      label="직접 베팅 결과"
                      onClose={() => onClearBetResult?.('manual')}
                    />
                  )}
                  {lastAutoResult && (
                    <BetResultCard
                      result={lastAutoResult}
                      label="오토베팅 결과"
                      onClose={() => onClearBetResult?.('auto')}
                      dim={lastAutoResult.tableId !== table.id}
                    />
                  )}
                </div>
              )}

              {betError && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-300">
                  {betError}
                </div>
              )}

              {isRisk ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-3 text-center">
                  <p className="text-sm font-bold text-red-300 mb-1">이번 회차는 쉬세요</p>
                  <p className="text-[11px] text-zinc-400">위험 한도 때문에 베팅이 막혀 있습니다.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-blue-500/25 bg-zinc-900 overflow-hidden">
                  <div className="px-3 py-2 border-b border-zinc-800 bg-blue-950/20">
                    <p className="text-xs font-bold text-blue-300">직접 베팅</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">사이드 → 금액 → 확정</p>
                  </div>

                  <div className="p-3 sm:p-4 flex flex-col gap-3.5">
                    <div>
                      <label className="text-[11px] font-bold text-zinc-400 mb-2 block">베팅할 곳</label>
                      <div className="flex gap-2">
                        {sideOptions.map((opt) => {
                          const active = selectedSide === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              disabled={isManualSettling}
                              onClick={() => {
                                playSfx('ui');
                                setSelectedSide(opt.id);
                                setBetError(null);
                              }}
                              className={`${opt.flex} min-h-[56px] sm:min-h-[60px] py-3 rounded-xl border text-base sm:text-lg font-bold transition-colors disabled:opacity-40 touch-manipulation active:scale-[0.98] ${
                                active
                                  ? opt.active
                                  : 'bg-zinc-950 border-zinc-700 text-zinc-400'
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-[11px] font-bold text-zinc-400">베팅 금액</label>
                        <button
                          type="button"
                          onClick={() => {
                            playSfx('ui');
                            setBetAmount(0);
                            setBetError(null);
                          }}
                          className="text-[12px] min-h-[36px] px-2 text-zinc-500 hover:text-white touch-manipulation"
                        >
                          초기화
                        </button>
                      </div>
                      <div
                        className={`bg-zinc-950 border rounded-xl px-4 py-3.5 flex items-center justify-between ${
                          selectedSide === 'BANKER'
                            ? 'border-red-500/40'
                            : selectedSide === 'TIE'
                              ? 'border-emerald-500/40'
                              : 'border-blue-500/40'
                        }`}
                      >
                        <span className={`text-sm font-bold ${sideColor(selectedSide)}`}>
                          {sideShortLabel(selectedSide)}
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="font-mono font-bold text-white text-2xl leading-none tabular-nums">
                            {betAmount.toLocaleString()}
                          </span>
                          <span className="text-zinc-500 text-xs">원</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-5 gap-2 mt-3">
                        {primaryChips.map((chip) => (
                          <button
                            key={chip.label}
                            type="button"
                            onClick={() => addChip(chip)}
                            disabled={isManualSettling}
                            className={`aspect-square min-h-[48px] rounded-full border-[3px] border-dashed shadow-md flex items-center justify-center touch-manipulation active:scale-95 disabled:opacity-40 ${chip.color}`}
                          >
                            <span className="text-[11px] sm:text-xs font-bold leading-none">{chip.label}</span>
                          </button>
                        ))}
                      </div>

                      {showMoreChips && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {extraChips.map((chip) => (
                            <button
                              key={chip.label}
                              type="button"
                              onClick={() => addChip(chip)}
                              disabled={isManualSettling}
                              className={`min-h-[48px] rounded-xl border-[3px] border-dashed shadow-md flex items-center justify-center touch-manipulation active:scale-95 disabled:opacity-40 ${chip.color}`}
                            >
                              <span className="text-xs font-bold">{chip.label}</span>
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
                        className="text-[12px] text-zinc-500 hover:text-zinc-300 w-full text-center mt-2 min-h-[40px] touch-manipulation"
                      >
                        {showMoreChips ? '고액 칩 접기' : '고액 · 2배'}
                      </button>
                    </div>

                    <div className="rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2.5">
                      <p className="text-[11px] text-zinc-400 text-center font-medium">
                        <span className={sideColor(selectedSide)}>{sideShortLabel(selectedSide)}</span>
                        <span className="text-zinc-600 mx-1.5">·</span>
                        <span className="font-mono text-zinc-100">{betAmount.toLocaleString()}원</span>
                      </p>
                      {autoPending && (
                        <p className="mt-1.5 text-[10px] text-amber-400/90 text-center">
                          오토 진행 중 · {sideShortLabel(autoPending.side)} {formatMoney(autoPending.amount)}
                          {autoPending.tableId !== table.id ? ` (${autoPending.tableName})` : ''}
                        </p>
                      )}
                      <div className="mt-2 pt-2 border-t border-zinc-800 text-[11px] text-zinc-500 flex justify-between">
                        <span>보유</span>
                        <span className="font-mono text-zinc-300">{formatMoney(availableBankroll)}</span>
                      </div>
                      <div className="text-[11px] text-zinc-500 flex justify-between mt-0.5">
                        <span>베팅 후</span>
                        <span className={`font-mono ${afterBetBalance < betAmount ? 'text-amber-300' : 'text-zinc-300'}`}>
                          {formatMoney(afterBetBalance)}
                        </span>
                      </div>
                      {balanceWarn && (
                        <p className="mt-2 text-[11px] text-amber-300 text-center">{balanceWarn}</p>
                      )}
                      {needsHighConfirm && (
                        <p className="mt-1 text-[10px] text-rose-300/90 text-center">
                          고액 베팅 — 확정 시 한 번 더 확인합니다
                        </p>
                      )}
                    </div>

                    {/* Desktop actions (mobile uses sticky bar) */}
                    <div className="hidden xl:grid grid-cols-2 gap-2">
                      {isManualSettling && manualPending ? (
                        <button
                          type="button"
                          disabled={cancelling}
                          onClick={() => void handleCancelBet(manualPending.id)}
                          className="col-span-2 py-3 rounded-lg border border-rose-500/40 bg-rose-500/15 text-rose-300 text-sm font-bold hover:bg-rose-500/25 transition-colors disabled:opacity-50"
                        >
                          {cancelling ? '취소 중…' : '직접 베팅 취소 (금액 반환)'}
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              playSfx('skip');
                              onSkip?.(table.id);
                              setBetError(null);
                            }}
                            className="py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
                          >
                            건너뛰기
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleConfirmBet()}
                            className="py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none"
                            disabled={betAmount <= 0 || submitting || isManualSettling}
                          >
                            {submitting ? '접수 중…' : '베팅 확정'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Auto-betting panel */
            <div className="rounded-xl border border-amber-500/30 bg-zinc-900 overflow-hidden">
              <div className="px-3 py-2 border-b border-amber-500/20 bg-amber-950/25 flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300">오토베팅</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    autoRunning
                      ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10'
                      : sessionStatus === 'paused'
                        ? 'text-amber-300 border-amber-500/40 bg-amber-500/10'
                        : 'text-zinc-400 border-zinc-700 bg-zinc-950'
                  }`}
                >
                  {autoRunning ? '실행 중' : sessionStatus === 'paused' ? '일시정지' : '꺼짐'}
                </span>
              </div>

              <div className="p-3 flex flex-col gap-3">
                {!autoActive ? (
                  <>
                    <p className="text-[12px] text-zinc-400 leading-relaxed">
                      <strong className="text-zinc-200">8개 테이블</strong>을 감시합니다.
                      아래에서 전략을 고른 뒤 시작하세요.
                    </p>

                    {(() => {
                      const draft = { ...DEFAULT_SESSION_CONFIG, ...(cfg || {}) };
                      const patch = (partial: Partial<SessionConfig>) => {
                        onUpdateSessionConfig?.({ ...draft, ...partial });
                      };
                      return (
                        <div className="flex flex-col gap-3">
                          <div>
                            <p className="text-[11px] font-bold text-zinc-400 mb-1.5">언제 베팅할까요?</p>
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  playSfx('ui');
                                  patch({ strategy: 'ai' });
                                }}
                                className={`py-2.5 rounded-lg border text-xs font-bold ${
                                  draft.strategy === 'ai'
                                    ? 'bg-indigo-600 border-indigo-400 text-white'
                                    : 'bg-zinc-950 border-zinc-700 text-zinc-400'
                                }`}
                              >
                                AI 추천대로
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  playSfx('ui');
                                  patch({ strategy: 'pattern' });
                                }}
                                className={`py-2.5 rounded-lg border text-xs font-bold ${
                                  draft.strategy === 'pattern'
                                    ? 'bg-amber-500 border-amber-300 text-zinc-950'
                                    : 'bg-zinc-950 border-zinc-700 text-zinc-400'
                                }`}
                              >
                                내가 만든 패턴
                              </button>
                            </div>
                          </div>

                          {draft.strategy === 'pattern' && (
                            <>
                              <PatternSequenceBuilder
                                segments={draft.patternSegments || []}
                                onChange={(patternSegments) => patch({ patternSegments })}
                              />
                              <div>
                                <p className="text-[11px] font-bold text-zinc-400 mb-1.5">
                                  패턴 다음 베팅할 곳
                                </p>
                                <div className="flex gap-1.5">
                                  {(
                                    [
                                      { id: 'PLAYER' as const, label: 'Player', on: 'bg-blue-600 border-blue-400 text-white' },
                                      { id: 'TIE' as const, label: 'Tie', on: 'bg-emerald-500 border-emerald-400 text-white' },
                                      { id: 'BANKER' as const, label: 'Banker', on: 'bg-red-500 border-red-400 text-white' },
                                    ] as const
                                  ).map((opt) => (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      onClick={() => {
                                        playSfx('ui');
                                        patch({ patternBetSide: opt.id });
                                      }}
                                      className={`flex-1 py-2 rounded-lg border text-xs font-bold ${
                                        draft.patternBetSide === opt.id
                                          ? opt.on
                                          : 'bg-zinc-950 border-zinc-700 text-zinc-400'
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}

                          {draft.strategy === 'ai' && (
                            <p className="text-[11px] text-zinc-500 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
                              AI가 Player/Banker를 추천한 테이블에 자동 베팅합니다.
                              패턴으로 바꾸려면 위 <strong className="text-zinc-300">내가 만든 패턴</strong>을 누르세요.
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    <div className="rounded-lg bg-zinc-950 border border-zinc-800 divide-y divide-zinc-800 text-[12px]">
                      <AutoRow
                        label="전략"
                        value={cfg ? strategyLabel(cfg.strategy) : 'AI 추천대로'}
                      />
                      {cfg?.strategy === 'pattern' && (
                        <>
                          <AutoRow
                            label="패턴"
                            value={formatPattern(cfg.patternSegments || [])}
                          />
                          <AutoRow
                            label="베팅"
                            value={patternSideLabel(cfg.patternBetSide || 'PLAYER')}
                          />
                        </>
                      )}
                      <AutoRow
                        label="금액"
                        value={amountModeLabel}
                      />
                      <AutoRow
                        label={cfg?.amountMode === 'custom' ? '1단 금액' : '기본 금액'}
                        value={
                          cfg?.amountMode === 'custom' && cfg.customSteps?.[0]
                            ? formatMoney(cfg.customSteps[0])
                            : cfg
                              ? formatMoney(cfg.initialBet)
                              : formatMoney(10000)
                        }
                      />
                      {customStepPreview && (
                        <div className="px-3 py-2 text-[10px] text-zinc-500 leading-relaxed">
                          {customStepPreview}
                        </div>
                      )}
                      <AutoRow
                        label="감시 테이블"
                        value={cfg ? `${cfg.maxTables}개` : '8개'}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        playSfx('ui');
                        onOpenSessionSettings?.();
                      }}
                      className="w-full py-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-200 text-sm font-bold hover:bg-amber-500/20 flex items-center justify-center gap-2"
                    >
                      <Settings2 size={15} />
                      금액·한도 등 상세 설정
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playSfx('sessionStart');
                        onOpenSessionSettings?.();
                      }}
                      className="w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-950 text-sm font-bold flex items-center justify-center gap-2"
                    >
                      <Play size={16} fill="currentColor" />
                      오토베팅 시작
                    </button>
                  </>
                ) : (
                  <>
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                      <p className="text-sm font-bold text-amber-200">
                        {sessionStatus === 'paused' ? '일시정지됨' : '● 오토베팅 실행 중'}
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        {sessionMode === 'live'
                          ? cfg?.strategy === 'pattern'
                            ? '패턴이 나온 테이블에 자동 베팅 · 패 시 마틴 이어감'
                            : 'AI 추천 테이블에 자동 베팅합니다.'
                          : `${modeLabel(sessionMode)} — 자동 베팅은 하지 않습니다.`}
                      </p>
                    </div>

                    <div className="rounded-lg bg-zinc-950 border border-zinc-800 divide-y divide-zinc-800 text-[12px]">
                      <AutoRow label="모드" value={modeLabel(sessionMode)} />
                      <AutoRow
                        label="전략"
                        value={cfg ? strategyLabel(cfg.strategy) : 'AI 추천대로'}
                      />
                      {cfg?.strategy === 'pattern' && (
                        <AutoRow
                          label="패턴"
                          value={formatPattern(cfg.patternSegments || [])}
                        />
                      )}
                      <AutoRow
                        label="금액 방식"
                        value={amountModeLabel}
                      />
                      <AutoRow
                        label="다음 금액"
                        value={formatMoney(nextAutoBet)}
                        valueClass="text-amber-200 font-bold"
                      />
                      <AutoRow
                        label="금액 단계"
                        value={cfg ? `${stageNow}/${cfg.maxMartin}` : String(martinStage)}
                      />
                      {cfg?.amountMode === 'custom' && cfg.customSteps?.length > 0 && (
                        <div className="px-3 py-2 text-[10px] text-zinc-500 leading-relaxed">
                          설정:{' '}
                          {cfg.customSteps
                            .slice(0, cfg.maxMartin)
                            .map((amt, i) => (
                              <span
                                key={i}
                                className={
                                  i + 1 === stageNow ? 'text-amber-300 font-bold' : undefined
                                }
                              >
                                {i > 0 ? ' · ' : ''}
                                {i + 1}단 {formatMoney(amt)}
                              </span>
                            ))}
                        </div>
                      )}
                      <AutoRow
                        label="누적 손익"
                        value={formatMoney(sessionPnl, true)}
                        valueClass={
                          sessionPnl > 0
                            ? 'text-emerald-400'
                            : sessionPnl < 0
                              ? 'text-rose-400'
                              : 'text-zinc-300'
                        }
                      />
                      <AutoRow label="보유 가상머니" value={formatMoney(availableBankroll)} />
                      <AutoRow
                        label="감시"
                        value={cfg ? `${cfg.maxTables}개 테이블` : '8개'}
                      />
                    </div>

                    {isAutoSettling && autoPending && (
                      <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2.5">
                        <p className="text-[11px] font-bold text-sky-300 text-center mb-1">
                          오토 베팅 접수 · 결과 대기
                        </p>
                        <p className="text-[12px] text-zinc-200 text-center font-mono mb-2">
                          {sideShortLabel(autoPending.side)} · {formatMoney(autoPending.amount)}
                          <span className="text-zinc-500 text-[10px] block mt-0.5 font-sans">
                            {autoPending.tableName}
                          </span>
                        </p>
                        {manualPending && (
                          <p className="text-[10px] text-blue-300 text-center mb-2">
                            직접도 진행 중 · {sideShortLabel(manualPending.side)}{' '}
                            {formatMoney(manualPending.amount)}
                            {manualPending.tableId !== autoPending.tableId
                              ? ` (${manualPending.tableName})`
                              : ''}
                          </p>
                        )}
                        <button
                          type="button"
                          disabled={cancelling}
                          onClick={() => void handleCancelBet(autoPending.id)}
                          className="w-full py-2 rounded-lg border border-rose-500/40 bg-rose-500/15 text-rose-300 text-xs font-bold hover:bg-rose-500/25 disabled:opacity-50"
                        >
                          {cancelling ? '취소 중…' : '오토 베팅 취소 (금액 반환)'}
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2">
                      {sessionStatus === 'paused' ? (
                        <button
                          type="button"
                          onClick={() => {
                            playSfx('sessionStart');
                            onResumeAuto?.();
                          }}
                          className="col-span-2 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-zinc-950 text-sm font-bold flex items-center justify-center gap-1.5"
                        >
                          <Play size={14} fill="currentColor" />
                          재개
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            playSfx('sessionPause');
                            onPauseAuto?.();
                          }}
                          className="col-span-2 py-2.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-100 text-sm font-bold flex items-center justify-center gap-1.5"
                        >
                          <Pause size={14} />
                          일시정지
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          playSfx('sessionStop');
                          onStopAuto?.();
                        }}
                        className="py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium flex items-center justify-center"
                        aria-label="오토베팅 종료"
                      >
                        <Square size={14} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        playSfx('ui');
                        onOpenSessionSettings?.();
                      }}
                      className="w-full py-2 rounded-lg text-[11px] text-zinc-500 hover:text-zinc-300"
                    >
                      설정 다시 열기
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Roadmap — 빠른 베팅에선 숨김, 아니면 접힌 채 */}
          {(!quickBet || isDesktop) && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <button
              type="button"
              onClick={() => {
                playSfx('ui');
                setRoadmapOpen((v) => !v);
              }}
              className="w-full px-3 py-2.5 flex items-center justify-between gap-2 touch-manipulation min-h-[44px]"
            >
              <span className="text-[11px] font-bold text-zinc-300">게임 테이블 기록</span>
              <span className="flex items-center gap-2 text-[10px] text-zinc-500">
                <span className="text-blue-400">P {table.stats.player}</span>
                <span className="text-red-400">B {table.stats.banker}</span>
                <span className="text-emerald-400">T {table.stats.tie}</span>
                {roadmapOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
            </button>
            {roadmapOpen && (
              <div className="p-2 border-t border-zinc-800">
                <Roadmap data={table.roadmap} />
              </div>
            )}
          </div>
          )}

          {/* Advanced — collapsed / 빠른 베팅에선 숨김 */}
          {(!quickBet || isDesktop) && (
          <>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => {
                playSfx('ui');
                setShowAiDetails((v) => !v);
              }}
              className="w-full px-3 py-2.5 flex justify-between items-center hover:bg-zinc-800/40 transition-colors touch-manipulation min-h-[44px]"
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

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => {
                playSfx('ui');
                setShowRisk((v) => !v);
              }}
              className="w-full px-3 py-2.5 flex justify-between items-center hover:bg-zinc-800/40 transition-colors touch-manipulation min-h-[44px]"
            >
              <span className="text-[11px] text-zinc-400">위험 관리</span>
              {showRisk ? <ChevronUp size={13} className="text-zinc-500" /> : <ChevronDown size={13} className="text-zinc-500" />}
            </button>
            {showRisk && (
              <div className="p-3 flex flex-col gap-3 text-xs border-t border-zinc-800/80">
                <MartingaleVisualizer
                  currentStage={Math.min(martinStage, cfg?.maxMartin || 8)}
                  maxStages={cfg?.maxMartin || 8}
                  baseAmount={cfg?.initialBet || 10000}
                />
              </div>
            )}
          </div>

          <div className="text-[10px] text-zinc-600 leading-tight px-0.5 pb-2">
            AI는 참고용이며 최종 판단은 사용자에게 있습니다.
          </div>
          </>
          )}
        </div>
        </div>

        {/* Mobile/tablet sticky bet bar */}
        {panelMode === 'manual' && !isRisk && !isDesktop && (
          <div className="shrink-0 border-t border-zinc-800 bg-zinc-950 px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {isManualSettling && manualPending ? (
              <button
                type="button"
                disabled={cancelling}
                onClick={() => void handleCancelBet(manualPending.id)}
                className="w-full min-h-[52px] py-3.5 rounded-xl border border-rose-500/40 bg-rose-500/15 text-rose-300 text-sm font-bold disabled:opacity-50 touch-manipulation"
              >
                {cancelling ? '취소 중…' : '베팅 취소 · 금액 반환'}
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] text-center text-zinc-400">
                  <span className={`font-bold ${sideColor(selectedSide)}`}>{sideShortLabel(selectedSide)}</span>
                  <span className="text-zinc-600 mx-1">·</span>
                  <span className="font-mono font-bold text-zinc-100">{betAmount.toLocaleString()}원</span>
                  {waitForLiveResult && (
                    <span className="text-sky-400/80 ml-1.5">다음 결과 정산</span>
                  )}
                </p>
                <div className="grid grid-cols-[1fr_1.6fr] gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playSfx('skip');
                      onSkip?.(table.id);
                      setBetError(null);
                    }}
                    className="min-h-[52px] py-3.5 bg-zinc-800 active:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-medium touch-manipulation"
                  >
                    건너뛰기
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleConfirmBet()}
                    disabled={betAmount <= 0 || isManualSettling || submitting}
                    className="min-h-[52px] py-3.5 bg-blue-600 active:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/25 disabled:opacity-45 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:shadow-none touch-manipulation"
                  >
                    {submitting ? '접수 중…' : needsHighConfirm ? '확인 후 확정' : '베팅 확정'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </>
  );

  if (isDesktop) {
    return (
      <>
        {highConfirmOpen && (
          <HighBetConfirmModal
            side={selectedSide}
            amount={betAmount}
            balanceWarn={balanceWarn}
            submitting={submitting}
            onCancel={() => setHighConfirmOpen(false)}
            onConfirm={() => void placeManualBet()}
            sideLabel={sideShortLabel(selectedSide)}
          />
        )}
        <div className="hidden xl:flex z-50 w-80 2xl:w-[420px] h-full min-h-0 border-l border-zinc-800 bg-zinc-950 flex-col shrink-0">
          {panelInner}
        </div>
      </>
    );
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-[60] bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-[70] w-full max-h-[min(92dvh,900px)] rounded-t-2xl border-t border-x border-zinc-800 bg-zinc-950 shadow-2xl flex flex-col">
        {panelInner}
      </div>
      {highConfirmOpen && (
        <HighBetConfirmModal
          side={selectedSide}
          amount={betAmount}
          balanceWarn={balanceWarn}
          submitting={submitting}
          onCancel={() => setHighConfirmOpen(false)}
          onConfirm={() => void placeManualBet()}
          sideLabel={sideShortLabel(selectedSide)}
        />
      )}
    </>,
    document.body,
  );
}

function BetResultCard({
  result,
  label,
  onClose,
  dim = false,
}: {
  result: LastBetResult;
  label: string;
  onClose: () => void;
  dim?: boolean;
}) {
  const tone =
    result.won === true
      ? 'border-emerald-500/30 bg-emerald-500/10'
      : result.won === false
        ? 'border-rose-500/30 bg-rose-500/10'
        : 'border-zinc-700 bg-zinc-900';
  const titleTone =
    result.won === true
      ? 'text-emerald-300'
      : result.won === false
        ? 'text-rose-300'
        : 'text-zinc-300';
  const isAuto = result.source === 'auto' || result.appliedRule === '오토베팅';

  return (
    <div className={`rounded-xl border px-3 py-2.5 ${tone} ${dim ? 'opacity-80' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                isAuto
                  ? 'text-amber-300 border-amber-500/40 bg-amber-500/10'
                  : 'text-blue-300 border-blue-500/40 bg-blue-500/10'
              }`}
            >
              {isAuto ? '오토' : '직접'}
            </span>
            <p className={`text-xs font-bold ${titleTone}`}>
              {result.amount > 0 ? label : '건너뛰기'}
            </p>
          </div>
          <p className="text-[11px] text-zinc-300 leading-relaxed">{result.message}</p>
          {result.amount > 0 && (
            <p className="text-[11px] font-mono mt-1 text-zinc-400">
              {result.tableName} · 손익 {formatMoney(result.pnlDelta, true)}
            </p>
          )}
        </div>
        <button
          type="button"
          className="text-[10px] text-zinc-500 hover:text-zinc-300 min-h-[44px] px-2 touch-manipulation shrink-0"
          onClick={onClose}
        >
          닫기
        </button>
      </div>
    </div>
  );
}

function HighBetConfirmModal({
  sideLabel,
  amount,
  balanceWarn,
  submitting,
  onCancel,
  onConfirm,
}: {
  side: BetSide;
  sideLabel: string;
  amount: number;
  balanceWarn: string | null;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-2xl border border-rose-500/40 bg-zinc-950 shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[11px] font-bold tracking-wide text-rose-300 uppercase mb-1">고액 베팅 확인</p>
        <h3 className="text-lg font-bold text-white mb-2">이 금액으로 베팅할까요?</h3>
        <p className="text-sm text-zinc-300 text-center py-3 rounded-xl bg-zinc-900 border border-zinc-800">
          <span className="font-bold">{sideLabel}</span>
          <span className="text-zinc-600 mx-2">·</span>
          <span className="font-mono font-bold text-amber-300">{amount.toLocaleString()}원</span>
        </p>
        {balanceWarn && (
          <p className="mt-2 text-[12px] text-amber-300 text-center">{balanceWarn}</p>
        )}
        <p className="mt-2 text-[11px] text-zinc-500 text-center leading-relaxed">
          실수로 큰 금액을 거는 것을 막기 위한 확인입니다.
        </p>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="min-h-[48px] rounded-xl bg-zinc-800 text-zinc-200 text-sm font-bold touch-manipulation disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="min-h-[48px] rounded-xl bg-rose-500 text-white text-sm font-bold touch-manipulation disabled:opacity-50"
          >
            {submitting ? '접수 중…' : '그래도 베팅'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function AutoRow({
  label,
  value,
  valueClass = 'text-zinc-200 font-mono',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between items-center px-3 py-2.5 gap-3">
      <span className="text-zinc-500 shrink-0">{label}</span>
      <span className={`text-right truncate ${valueClass}`}>{value}</span>
    </div>
  );
}

function AiDetailCard({ title, model, color }: { title: string; model: AiModelAnalysis; color: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden transition-all">
      <div
        className="px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-zinc-800/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full bg-${color}-500`} />
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
        <div className="p-4 pt-0 border-t border-zinc-800/50 mt-2 text-xs flex flex-col gap-4">
          <div className="flex justify-between text-zinc-400 mt-3">
            <span>
              상태: <span className="text-zinc-200">{model.status}</span>
            </span>
            <span>
              신뢰도: <span className="text-zinc-200">{model.confidence}%</span>
            </span>
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
            <button type="button" className="flex-1 py-1.5 bg-zinc-800 text-zinc-300 rounded flex items-center justify-center gap-1.5">
              <FileText size={12} /> 원문 보기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultDot({
  result,
  isLast,
  compact = false,
}: {
  key?: React.Key;
  result: GameResult;
  isLast: boolean;
  compact?: boolean;
}) {
  const bgColor = getResultColor(result, 'bg');

  return (
    <div
      className={`${compact ? 'w-4 h-4 text-[9px]' : 'w-5 h-5 text-[10px]'} rounded-full flex items-center justify-center font-bold text-white ${bgColor} ${
        isLast ? 'ring-2 ring-white/30 scale-110 shadow-lg' : ''
      }`}
    >
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
