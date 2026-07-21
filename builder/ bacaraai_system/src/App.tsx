/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Header from './components/Header';
import TopNav, { ViewType } from './components/TopNav';
import SessionBar from './components/SessionBar';
import SessionModal from './components/SessionModal';
import TableCard from './components/TableCard';
import RightPanel from './components/RightPanel';
import TableZoomModal from './components/TableZoomModal';
import RuleCreationModal from './components/RuleCreationModal';
import StopSessionModal from './components/StopSessionModal';
import RuleLabView from "./components/RuleLabView";
import DataInsightCenter from './components/DataInsightCenter';
import OnboardingModal from './components/OnboardingModal';
import SettingsView from './components/SettingsView';
import HelpGuideView from './components/HelpGuideView';
import ScreenHelpBanner from './components/ScreenHelpBanner';
import { MOCK_TABLES } from './data';
import { Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TableData } from './types';
import TableToolbar, { SortOption, FilterOption } from './components/TableToolbar';
import useBeginnerMode from './hooks/useBeginnerMode';
import useSession from './hooks/useSession';
import useLiveTable from './hooks/useLiveTable';
import useWallet from './hooks/useWallet';
import { installAudioUnlock, playSfx } from './audio/sfxEngine';
import { matchesPattern, normalizePatternSegments, patternSignalKey } from './utils/patternMatch';

const VIEW_LABELS: Record<ViewType, string> = {
  multitable: '라이브 테이블',
  lab: '규칙 연구실',
  insight: '데이터 및 기록',
  settings: '설정',
  help: '도움말',
};

export default function App() {
  const [activeView, setActiveView] = useState<ViewType>('multitable');
  const { beginnerMode, toggleBeginnerMode, setBeginnerMode } = useBeginnerMode();
  const session = useSession();
  const wallet = useWallet();
  const liveTable = useLiveTable(MOCK_TABLES[0], 'MD2729', 'TABLE1(MD2729)');
  const tables = useMemo(() => [liveTable, ...MOCK_TABLES.slice(1)], [liveTable]);
  const availableBankroll = wallet.loggedIn
    ? wallet.balance
    : session.availableBankroll;
  
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return localStorage.getItem('onboardingComplete') !== 'true';
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [stopSessionType, setStopSessionType] = useState<'wincut' | 'losscut' | 'error' | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [zoomedTableId, setZoomedTableId] = useState<string | null>(null);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);

  const [sortBy, setSortBy] = useState<SortOption>('table_number');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isAutoReordered, setIsAutoReordered] = useState(false);
  const autoBetSignalRef = useRef<string | null>(null);
  /** 패턴 진입 후 마틴 진행 중인 테이블 (승이 나면 해제) */
  const patternRunRef = useRef<{ tableId: string; side: 'PLAYER' | 'BANKER' | 'TIE' } | null>(
    null,
  );
  const handledBetResultIdRef = useRef<string | null>(null);
  /** 취소한 베팅과 같은 회차에서 오토베팅이 즉시 재진입하지 않도록 차단 */
  const cancelledAutoUntilRef = useRef<{
    tableId: string;
    baselineLatestId: number;
    baselineResultCount: number;
  } | null>(null);

  useEffect(() => {
    installAudioUnlock();
  }, []);

  useEffect(() => {
    session.setCutHandler((type) => {
      playSfx(type === 'wincut' ? 'win' : 'loss');
      session.pauseSession();
      setStopSessionType(type);
    });
    return () => session.setCutHandler(null);
  }, [session.setCutHandler, session.pauseSession]);

  // 라이브 테이블: 베팅 이후에 새로 들어온 결과로만 정산
  useEffect(() => {
    const pending = session.pendingBet;
    if (!pending?.waitForLiveResult) return;

    const table = tables.find((t) => t.id === pending.tableId);
    if (!table) return;

    const latestId = table.live?.latestId ?? null;
    const resultCount = table.stats.recentResults.length;
    const baselineId = pending.baselineLatestId ?? 0;
    const baselineCount = pending.baselineResultCount ?? 0;

    const idAdvanced = typeof latestId === 'number' && latestId > baselineId;
    const countAdvanced = resultCount > baselineCount;
    if (!idAdvanced && !countAdvanced) return;

    const outcome = table.stats.recentResults[resultCount - 1];
    if (!outcome || !['P', 'B', 'T'].includes(outcome)) return;

    session.settlePendingWithOutcome(pending.tableId, outcome, latestId, resultCount);
  }, [
    tables,
    session.pendingBet,
    session.settlePendingWithOutcome,
  ]);

  // 오토베팅(live): 8테이블 감시 — AI 추천 또는 사용자 패턴 일치 시 베팅
  useEffect(() => {
    if (session.status !== 'running' || session.mode !== 'live') {
      if (session.status === 'idle') {
        autoBetSignalRef.current = null;
        patternRunRef.current = null;
        handledBetResultIdRef.current = null;
        cancelledAutoUntilRef.current = null;
      }
      return;
    }
    if (session.pendingBet) return;

    // 패턴 런: 해당 런의 승이 확정되면 다시 패턴 대기
    const last = session.lastBetResult;
    if (last && last.id !== handledBetResultIdRef.current) {
      handledBetResultIdRef.current = last.id;
      if (last.won === true && patternRunRef.current?.tableId === last.tableId) {
        patternRunRef.current = null;
      }
    }

    const strategy = session.config.strategy || 'ai';
    const watchCount = Math.max(1, Math.min(8, session.config.maxTables || 8));
    const watchTables = tables.slice(0, watchCount);

    type Candidate = {
      table: TableData;
      side: 'PLAYER' | 'BANKER' | 'TIE';
      signal: string;
      fromPatternEntry: boolean;
    };

    let candidate: Candidate | null = null;

    const roundKeyOf = (t: TableData) =>
      t.live?.connected ? String(t.live.latestId ?? 0) : String(t.stats.currentRound);

    const isCancelledRound = (t: TableData) => {
      const block = cancelledAutoUntilRef.current;
      if (!block || block.tableId !== t.id) return false;
      const idAdvanced =
        typeof t.live?.latestId === 'number' && t.live.latestId > block.baselineLatestId;
      const countAdvanced = t.stats.recentResults.length > block.baselineResultCount;
      if (idAdvanced || countAdvanced) {
        cancelledAutoUntilRef.current = null;
        return false;
      }
      return true;
    };

    if (strategy === 'pattern') {
      const pattern = normalizePatternSegments(session.config);
      const betSide = session.config.patternBetSide || 'PLAYER';

      // 이미 패턴으로 진입한 테이블 → 마틴 이어가기 (같은 사이드)
      if (patternRunRef.current) {
        const run = patternRunRef.current;
        const t = watchTables.find((x) => x.id === run.tableId);
        if (t && t.status !== 'risk_blocked' && !isCancelledRound(t)) {
          const signal = `${t.id}:${roundKeyOf(t)}:run:${run.side}:${session.martinStage}`;
          if (autoBetSignalRef.current !== signal) {
            candidate = {
              table: t,
              side: run.side,
              signal,
              fromPatternEntry: false,
            };
          }
        } else if (!t || t.status === 'risk_blocked') {
          patternRunRef.current = null;
        }
      }

      // 신규 진입: 패턴 일치 테이블 탐색
      if (!candidate && !patternRunRef.current && pattern.length >= 1) {
        for (const t of watchTables) {
          if (t.status === 'risk_blocked') continue;
          if (isCancelledRound(t)) continue;
          if (!matchesPattern(t.stats.recentResults || [], pattern)) continue;
          const signal = `${t.id}:${roundKeyOf(t)}:pattern:${patternSignalKey(pattern)}:${betSide}`;
          if (autoBetSignalRef.current === signal) continue;
          candidate = {
            table: t,
            side: betSide,
            signal,
            fromPatternEntry: true,
          };
          break;
        }
      }
    } else {
      for (const t of watchTables) {
        if (t.status === 'risk_blocked') continue;
        if (isCancelledRound(t)) continue;
        const opinion = t.ai.finalOpinion;
        if (opinion !== 'PLAYER' && opinion !== 'BANKER') continue;
        const signal = `${t.id}:${roundKeyOf(t)}:ai:${opinion}`;
        if (autoBetSignalRef.current === signal) continue;
        candidate = {
          table: t,
          side: opinion,
          signal,
          fromPatternEntry: false,
        };
        break;
      }
    }

    if (!candidate) return;

    const amount =
      session.suggestedBet > 0 ? session.suggestedBet : session.config.initialBet;
    if (amount <= 0) return;
    if (wallet.loggedIn && amount > wallet.balance) return;

    const target = candidate.table;
    autoBetSignalRef.current = candidate.signal;
    const waitForLive =
      target.id === 't1' || target.gameCode === 'MD2729' || target.live != null;
    void session
      .placeBet({
        tableId: target.id,
        tableName: target.name,
        side: candidate.side,
        amount,
        waitForLiveResult: waitForLive,
        baselineLatestId: waitForLive ? target.live?.latestId ?? 0 : null,
        baselineResultCount: waitForLive ? target.stats.recentResults.length : undefined,
        availableBalance: availableBankroll,
      })
      .then((result) => {
        if (!result.ok) {
          autoBetSignalRef.current = null;
        } else {
          if (candidate.fromPatternEntry || strategy === 'pattern') {
            patternRunRef.current = { tableId: target.id, side: candidate.side };
          }
          playSfx('betConfirm');
        }
      });
  }, [
    session.status,
    session.mode,
    session.pendingBet,
    session.suggestedBet,
    session.martinStage,
    session.lastBetResult,
    session.config,
    session.placeBet,
    tables,
    wallet.loggedIn,
    wallet.balance,
    availableBankroll,
  ]);

  const handleTableSelect = (id: string) => {
    setSelectedTableId(id);
    setIsRightPanelOpen(true);
    const table = tables.find((t) => t.id === id);
    playSfx('tableSelect');
    if (table?.status === 'rule_triggered' || table?.status === 'waiting_user') {
      window.setTimeout(() => playSfx('ruleTrigger'), 120);
    } else if (table?.status === 'risk_blocked') {
      window.setTimeout(() => playSfx('risk'), 120);
    } else if (table?.status === 'analyzing') {
      window.setTimeout(() => playSfx('aiReady'), 120);
    }
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playSfx('tick');
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedTable = useMemo(() => {
    return tables.find(t => t.id === selectedTableId) || null;
  }, [selectedTableId, tables]);

  const zoomedTable = useMemo(() => {
    return tables.find(t => t.id === zoomedTableId) || null;
  }, [zoomedTableId, tables]);

  const filterCounts = useMemo(() => {
    const counts: Record<FilterOption, number> = {
      all: tables.length,
      rule_triggered: 0,
      ai_analyzing: 0,
      waiting_user: 0,
      martingale: 0,
      risk_blocked: 0,
      data_error: 0,
      wait_skip: 0,
      favorite: 0
    };

    tables.forEach(t => {
      if (t.status === 'rule_triggered') counts.rule_triggered++;
      if (t.status === 'analyzing') counts.ai_analyzing++;
      if (t.status === 'waiting_user') counts.waiting_user++;
      if (t.status === 'checking_result') counts.martingale++;
      if (t.status === 'risk_blocked') counts.risk_blocked++;
      if (t.status === 'error' || t.ai.finalOpinion === 'DATA_ERROR') counts.data_error++;
      if (['WAIT', 'SKIP', 'PAUSE'].includes(t.ai.finalOpinion)) counts.wait_skip++;
      if (favorites.has(t.id)) counts.favorite++;
    });

    return counts;
  }, [favorites, tables]);

  const tableNumberOrder = (a: TableData, b: TableData) => a.id.localeCompare(b.id, undefined, { numeric: true });

  const filteredAndSortedTables = useMemo(() => {
    let visibleTables = [...tables];

    visibleTables = visibleTables.filter(t => {
      switch (filterBy) {
        case 'rule_triggered': return t.status === 'rule_triggered';
        case 'ai_analyzing': return t.status === 'analyzing';
        case 'waiting_user': return t.status === 'waiting_user';
        case 'martingale': return t.status === 'checking_result';
        case 'risk_blocked': return t.status === 'risk_blocked';
        case 'data_error': return t.status === 'error' || t.ai.finalOpinion === 'DATA_ERROR';
        case 'wait_skip': return ['WAIT', 'SKIP', 'PAUSE'].includes(t.ai.finalOpinion);
        case 'favorite': return favorites.has(t.id);
        case 'all': default: return true;
      }
    });

    // 기본/자동: 결과·상태와 무관하게 1~8번 위치 고정
    visibleTables.sort((a, b) => {
      switch (sortBy) {
        case 'auto':
        case 'table_number':
          return tableNumberOrder(a, b);
        case 'rule_triggered': {
          const byStatus = (b.status === 'rule_triggered' ? 1 : 0) - (a.status === 'rule_triggered' ? 1 : 0);
          return byStatus || tableNumberOrder(a, b);
        }
        case 'high_risk': {
          const byStatus = (b.status === 'risk_blocked' ? 1 : 0) - (a.status === 'risk_blocked' ? 1 : 0);
          return byStatus || tableNumberOrder(a, b);
        }
        case 'time_remaining': {
          const byTimer = (a.timer || 0) - (b.timer || 0);
          return byTimer || tableNumberOrder(a, b);
        }
        case 'ai_consensus': {
          const byConsensus =
            (b.ai.consensus?.includes('3/3') ? 1 : 0) - (a.ai.consensus?.includes('3/3') ? 1 : 0);
          return byConsensus || tableNumberOrder(a, b);
        }
        case 'favorite_first': {
          const byFav = (favorites.has(b.id) ? 1 : 0) - (favorites.has(a.id) ? 1 : 0);
          return byFav || tableNumberOrder(a, b);
        }
        default:
          return tableNumberOrder(a, b);
      }
    });

    return visibleTables;
  }, [filterBy, sortBy, favorites, tables]);

  useEffect(() => {
    setIsAutoReordered(false);
  }, [sortBy]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      <Header 
        onEmergencyStop={() => {
          playSfx('risk');
          session.stopSession();
          setStopSessionType('losscut');
        }} 
        activeViewLabel={VIEW_LABELS[activeView]}
        beginnerMode={beginnerMode}
        onOpenSettings={() => setActiveView('settings')}
        sessionStatus={session.status}
        sessionMode={session.mode}
        sessionElapsedMs={session.elapsedMs}
        onSessionModeChange={(mode) => {
          if (session.status === 'idle') {
            setIsModalOpen(true);
            return;
          }
          session.setMode(mode);
        }}
      />
      <TopNav
        activeView={activeView}
        onChangeView={(view) => {
          playSfx('nav');
          setActiveView(view);
        }}
      />
      {activeView === 'multitable' && session.status === 'idle' && (
        <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center justify-between gap-3">
          <p className="text-[11px] text-zinc-400 min-w-0">
            오토베팅: AI 추천 또는 <span className="text-amber-300 font-semibold">내가 만든 패턴</span>으로 8테이블 자동 베팅
          </p>
          <button
            type="button"
            onClick={() => {
              playSfx('ui');
              setIsModalOpen(true);
            }}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-bold"
          >
            오토베팅 설정
          </button>
        </div>
      )}
      {activeView === 'multitable' &&
        (session.status === 'running' || session.status === 'paused') && (
        <SessionBar
          onOpenSettings={() => {
            playSfx('ui');
            setIsModalOpen(true);
          }}
          onPause={session.pauseSession}
          onResume={session.resumeSession}
          onStop={() => {
            session.stopSession();
          }}
          beginnerMode={beginnerMode}
          status={session.status}
          config={session.config}
          pnl={session.pnl}
          martinStage={session.martinStage}
        />
      )}
      
      <main className="flex-1 flex overflow-hidden pb-16 sm:pb-0">
        {activeView === 'multitable' ? (
          <>
            <div className="flex-1 p-4 lg:p-6 overflow-y-auto custom-scrollbar flex flex-col">
              <ScreenHelpBanner screen="multitable" beginnerMode={beginnerMode} />
              <TableToolbar 
                sortBy={sortBy} 
                onSortChange={setSortBy} 
                filterBy={filterBy} 
                onFilterChange={setFilterBy} 
                filterCounts={filterCounts} 
                isAutoReordered={isAutoReordered} 
              />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-6 flex-1 content-start">
                <AnimatePresence>
                  {filteredAndSortedTables.map(table => (
                    <motion.div
                      key={table.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <TableCard 
                        table={table} 
                        isSelected={table.id === selectedTableId}
                        isFavorite={favorites.has(table.id)}
                        beginnerMode={beginnerMode}
                        onSelect={handleTableSelect}
                        onZoom={setZoomedTableId}
                        onToggleFavorite={toggleFavorite}
                      />
                    </motion.div>
                  ))}
                  {filteredAndSortedTables.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center h-64 text-zinc-500 gap-2">
                      <Activity size={32} className="opacity-50" />
                      <p>필터 조건에 맞는 테이블이 없습니다.</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <RightPanel 
              table={selectedTable}
              tables={tables}
              isOpen={isRightPanelOpen}
              onClose={() => setIsRightPanelOpen(false)}
              onSelectTable={handleTableSelect}
              beginnerMode={beginnerMode}
              sessionStatus={session.status}
              sessionMode={session.mode}
              sessionConfig={session.config}
              sessionPnl={session.pnl}
              martinStage={session.martinStage}
              suggestedBet={session.suggestedBet}
              maxBet={session.config.maxBet}
              availableBankroll={availableBankroll}
              pendingBet={session.pendingBet}
              lastBetResult={session.lastBetResult}
              onPlaceBet={session.placeBet}
              onSkip={session.skipRound}
              onCancelBet={async () => {
                const pending = session.pendingBet;
                patternRunRef.current = null;
                if (pending) {
                  cancelledAutoUntilRef.current = {
                    tableId: pending.tableId,
                    baselineLatestId: pending.baselineLatestId ?? 0,
                    baselineResultCount: pending.baselineResultCount ?? 0,
                  };
                  // 같은 시그널로 즉시 재베팅되지 않도록 유지 키 설정
                  autoBetSignalRef.current = `cancelled:${pending.tableId}:${pending.id}`;
                }
                return session.cancelPendingBet();
              }}
              onOpenSessionSettings={() => setIsModalOpen(true)}
              onUpdateSessionConfig={session.updateConfig}
              onClearBetResult={session.clearLastBetResult}
              onPauseAuto={session.pauseSession}
              onResumeAuto={session.resumeSession}
              onStopAuto={session.stopSession}
            />
          </>
        ) : activeView === 'insight' ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
            <div className="p-4 lg:px-6 pt-4 lg:pt-6">
              <ScreenHelpBanner screen="insight" beginnerMode={beginnerMode} />
            </div>
            <DataInsightCenter />
          </div>
        ) : activeView === 'settings' ? (
          <SettingsView 
            onReplayOnboarding={() => {
              playSfx('ui');
              setShowOnboarding(true);
            }}
            onStartRealSession={() => {
              playSfx('ui');
              setIsModalOpen(true);
            }}
            beginnerMode={beginnerMode}
            onToggleBeginnerMode={() => {
              playSfx('toggle');
              toggleBeginnerMode();
            }}
          />
        ) : activeView === 'lab' ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
            <div className="p-4 lg:px-6 pt-4 lg:pt-6">
              <ScreenHelpBanner screen="lab" beginnerMode={beginnerMode} />
            </div>
            <RuleLabView />
          </div>
        ) : activeView === 'help' ? (
          <HelpGuideView
            beginnerMode={beginnerMode}
            onToggleBeginnerMode={toggleBeginnerMode}
            onReplayOnboarding={() => setShowOnboarding(true)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500 bg-zinc-950">
            <div className="flex flex-col items-center gap-2">
              <Activity size={32} className="opacity-50 mb-2" />
              <p className="font-medium text-zinc-400">해당 화면은 준비 중입니다.</p>
            </div>
          </div>
        )}
      </main>

      <SessionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialConfig={session.config}
        onStart={(mode, config) => {
          session.startSession(mode, config);
        }}
      />
      <RuleCreationModal isOpen={isRuleModalOpen} onClose={() => setIsRuleModalOpen(false)} />
      <TableZoomModal table={zoomedTable} onClose={() => setZoomedTableId(null)} />
      <StopSessionModal
        type={stopSessionType}
        onClose={() => {
          setStopSessionType(null);
          session.stopSession();
        }}
      />
      
      <OnboardingModal 
        isOpen={showOnboarding} 
        onClose={() => {
          setShowOnboarding(false);
          localStorage.setItem('onboardingComplete', 'true');
          setBeginnerMode(true);
        }}
        onStartSetup={() => {
          setShowOnboarding(false);
          localStorage.setItem('onboardingComplete', 'true');
          setBeginnerMode(true);
          setIsModalOpen(true);
        }}
      />
    </div>
  );
}
