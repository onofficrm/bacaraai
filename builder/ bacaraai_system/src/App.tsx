/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
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
import HistoryTab from './components/HistoryTab';
import TableToolbar, { SortOption, FilterOption } from './components/TableToolbar';
import DataInsightCenter from './components/DataInsightCenter';
import OnboardingModal from './components/OnboardingModal';
import SettingsView from './components/SettingsView';
import { MOCK_TABLES, MOCK_RULES, MOCK_HISTORY } from './data';
import { Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TableData } from './types';

export default function App() {
  const [activeView, setActiveView] = useState<ViewType>('multitable');
  
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return localStorage.getItem('onboardingComplete') !== 'true';
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [stopSessionType, setStopSessionType] = useState<'wincut' | 'losscut' | 'error' | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [zoomedTableId, setZoomedTableId] = useState<string | null>(null);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);

  const [sortBy, setSortBy] = useState<SortOption>('auto');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isAutoReordered, setIsAutoReordered] = useState(false);

  const handleTableSelect = (id: string) => {
    setSelectedTableId(id);
    setIsRightPanelOpen(true);
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedTable = useMemo(() => {
    return MOCK_TABLES.find(t => t.id === selectedTableId) || null;
  }, [selectedTableId]);

  const zoomedTable = useMemo(() => {
    return MOCK_TABLES.find(t => t.id === zoomedTableId) || null;
  }, [zoomedTableId]);

  const filterCounts = useMemo(() => {
    const counts: Record<FilterOption, number> = {
      all: MOCK_TABLES.length,
      rule_triggered: 0,
      ai_analyzing: 0,
      waiting_user: 0,
      martingale: 0,
      risk_blocked: 0,
      data_error: 0,
      wait_skip: 0,
      favorite: 0
    };

    MOCK_TABLES.forEach(t => {
      if (t.status === 'rule_triggered') counts.rule_triggered++;
      if (t.status === 'analyzing') counts.ai_analyzing++;
      if (t.status === 'waiting_user') counts.waiting_user++;
      if (t.status === 'checking_result') counts.martingale++; // Assuming checking_result implies some martingale state for mock
      if (t.status === 'risk_blocked') counts.risk_blocked++;
      if (t.status === 'error' || t.ai.finalOpinion === 'DATA_ERROR') counts.data_error++;
      if (['WAIT', 'SKIP', 'PAUSE'].includes(t.ai.finalOpinion)) counts.wait_skip++;
      if (favorites.has(t.id)) counts.favorite++;
    });

    return counts;
  }, [favorites]);

  const getPriorityScore = (t: TableData) => {
    let score = 0;
    if (t.status === 'waiting_user') score += 1000;
    if (t.status === 'rule_triggered') score += 900;
    if (t.status === 'checking_result') score += 800; // martingale indicator
    if (t.ai.consensus && t.ai.consensus.includes('/3')) score += 700;
    if (t.status === 'analyzing') score += 600;
    if (t.timer && t.timer < 10) score += 500;
    if (t.status === 'error' || t.ai.finalOpinion === 'DATA_ERROR') score += 400;
    if (t.status === 'risk_blocked') score += 300;
    if (['WAIT', 'SKIP', 'PAUSE'].includes(t.ai.finalOpinion)) score += 100;
    return score;
  };

  const filteredAndSortedTables = useMemo(() => {
    let tables = [...MOCK_TABLES];

    // Filter
    tables = tables.filter(t => {
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

    // Sort
    tables.sort((a, b) => {
      switch (sortBy) {
        case 'auto': {
          const scoreB = getPriorityScore(b);
          const scoreA = getPriorityScore(a);
          if (scoreB !== scoreA) return scoreB - scoreA;
          return a.id.localeCompare(b.id);
        }
        case 'table_number': return a.id.localeCompare(b.id);
        case 'rule_triggered': return (b.status === 'rule_triggered' ? 1 : 0) - (a.status === 'rule_triggered' ? 1 : 0);
        case 'high_risk': return (b.status === 'risk_blocked' ? 1 : 0) - (a.status === 'risk_blocked' ? 1 : 0);
        case 'time_remaining': return (a.timer || 0) - (b.timer || 0);
        case 'ai_consensus': return (b.ai.consensus?.includes('3/3') ? 1 : 0) - (a.ai.consensus?.includes('3/3') ? 1 : 0);
        case 'favorite_first': return (favorites.has(b.id) ? 1 : 0) - (favorites.has(a.id) ? 1 : 0);
        default: return 0;
      }
    });

    return tables;
  }, [filterBy, sortBy, favorites]);

  // Simulate auto reordering indicator
  useEffect(() => {
    if (sortBy === 'auto') {
      setIsAutoReordered(true);
      const timer = setTimeout(() => setIsAutoReordered(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setIsAutoReordered(false);
    }
  }, [sortBy]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Navigation */}
      <Header 
        onEmergencyStop={() => setStopSessionType('losscut')} 
        activeViewLabel={activeView === 'multitable' ? '라이브 테이블' : activeView === 'insight' ? '데이터 및 기록' : activeView === 'lab' ? '규칙 연구실' : '설정'} 
      />
      <TopNav activeView={activeView} onChangeView={setActiveView} />
      <SessionBar onStartSession={() => setIsModalOpen(true)} />
      
      <main className="flex-1 flex overflow-hidden pb-16 sm:pb-0">
        {activeView === 'multitable' ? (
          <>
            {/* Central Multi-Table Grid */}
            <div className="flex-1 p-4 lg:p-6 overflow-y-auto custom-scrollbar flex flex-col">
          <TableToolbar 
            sortBy={sortBy} 
            onSortChange={setSortBy} 
            filterBy={filterBy} 
            onFilterChange={setFilterBy} 
            filterCounts={filterCounts} 
            isAutoReordered={isAutoReordered} 
          />
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-6 flex-1 content-start">
            <AnimatePresence>
              {filteredAndSortedTables.map(table => (
                <motion.div
                  key={table.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <TableCard 
                    table={table} 
                    isSelected={table.id === selectedTableId}
                    isFavorite={favorites.has(table.id)}
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
          </motion.div>
        </div>
        <RightPanel 
          table={selectedTable} 
          isOpen={isRightPanelOpen}
          onClose={() => setIsRightPanelOpen(false)}
        />
          </>
        ) : activeView === 'insight' ? (
          <DataInsightCenter />
        ) : activeView === 'settings' ? (
          <SettingsView 
            onReplayOnboarding={() => setShowOnboarding(true)}
            onStartRealSession={() => setIsModalOpen(true)}
          />
        ) : activeView === 'lab' ? (
          <RuleLabView />
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500 bg-zinc-950">
            <div className="flex flex-col items-center gap-2">
              <Activity size={32} className="opacity-50 mb-2" />
              <p className="font-medium text-zinc-400">해당 화면은 준비 중입니다.</p>
            </div>
          </div>
        )}
      </main>

      <SessionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <RuleCreationModal isOpen={isRuleModalOpen} onClose={() => setIsRuleModalOpen(false)} />
      <TableZoomModal table={zoomedTable} onClose={() => setZoomedTableId(null)} />
      <StopSessionModal type={stopSessionType} onClose={() => setStopSessionType(null)} />
      
      <OnboardingModal 
        isOpen={showOnboarding} 
        onClose={() => {
          setShowOnboarding(false);
          localStorage.setItem('onboardingComplete', 'true');
        }}
        onStartSetup={() => {
          setShowOnboarding(false);
          localStorage.setItem('onboardingComplete', 'true');
          setIsModalOpen(true);
        }}
      />
    </div>
  );
}

