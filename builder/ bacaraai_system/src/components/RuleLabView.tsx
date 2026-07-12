import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Sparkles, Download, ArrowLeftRight, History, ShieldAlert, Activity, CheckCircle2, PauseCircle, AlertTriangle, FileText, Search, SlidersHorizontal } from 'lucide-react';
import { RuleData } from '../types';
import { MOCK_RULES } from '../data';
import CreateRuleView from './CreateRuleView';

const INTERNAL_TABS = [
  { id: 'my_rules', label: '내 규칙' },
  { id: 'create', label: '규칙 만들기' },
  { id: 'backtest', label: '백테스트' },
  { id: 'compare', label: '규칙 비교' },
  { id: 'shadow', label: '섀도 검증' },
  { id: 'history', label: '테스트 기록' },
  { id: 'search', label: '과거 유사 상황 검색' }
];

export default function RuleLabView() {
  const [activeTab, setActiveTab] = useState('my_rules');
  const [isCreatingRule, setIsCreatingRule] = useState(false);

  if (isCreatingRule) {
    return <CreateRuleView onBack={() => setIsCreatingRule(false)} />;
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-950 flex flex-col">
      {/* Rule Lab Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white">규칙 연구실</h1>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-zinc-800 text-zinc-400">Rule Lab</span>
          </div>
          <p className="text-zinc-300 font-medium mb-1">
            게임 규칙을 만들고 누적 데이터와 섀도 시뮬레이션으로 위험도와 결과를 검증합니다.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-amber-500/80 bg-amber-500/10 px-2.5 py-1.5 rounded-lg w-fit">
            <ShieldAlert size={14} />
            <span>과거 데이터의 시뮬레이션 결과는 다음 게임 결과를 보장하지 않습니다.</span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors">
            <History size={16} />
            <span className="hidden sm:inline">최근 테스트 불러오기</span>
          </button>
          <button className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors">
            <ArrowLeftRight size={16} />
            <span className="hidden sm:inline">비교 분석</span>
          </button>
          <button className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors">
            <Download size={16} />
            <span className="hidden sm:inline">규칙 가져오기</span>
          </button>
          <button className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors">
            <Sparkles size={16} className="text-amber-500" />
            <span className="hidden sm:inline">AI로 규칙 만들기</span>
          </button>
          <button 
            onClick={() => setIsCreatingRule(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-900/20 transition-colors"
          >
            <Plus size={16} />
            <span>새 규칙 만들기</span>
          </button>
        </div>
      </div>

      {/* Internal Tabs */}
      <div className="px-6 pt-4 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-6 overflow-x-auto custom-scrollbar pb-[-1px]">
          {INTERNAL_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'create') {
                  setIsCreatingRule(true);
                } else {
                  setActiveTab(tab.id);
                }
              }}
              className={`pb-3 px-1 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6">
        {activeTab === 'my_rules' ? (
          <MyRulesTab />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500">
            <Activity size={32} className="opacity-50 mb-2" />
            <p className="font-medium text-zinc-400">해당 기능은 내부 시뮬레이션용 샘플 UI로 구현 예정입니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MyRulesTab() {
  const [filterState, setFilterState] = useState<string | null>(null);
  
  const SUMMARY_CARDS = [
    { id: null, label: '전체 규칙', count: 12, icon: FileText, color: 'text-zinc-400', bg: 'bg-zinc-800/50' },
    { id: '활성', label: '활성 규칙', count: 3, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-950/30' },
    { id: '테스트 중', label: '테스트 중', count: 4, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-950/30' },
    { id: '섀도 검증 중', label: '섀도 검증 중', count: 2, icon: Search, color: 'text-purple-400', bg: 'bg-purple-950/30' },
    { id: '위험 증가', label: '위험 증가', count: 1, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-950/30' },
    { id: '일시정지', label: '일시정지', count: 2, icon: PauseCircle, color: 'text-amber-400', bg: 'bg-amber-950/30' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {SUMMARY_CARDS.map(card => {
          const Icon = card.icon;
          const isActive = filterState === card.id;
          return (
            <button
              key={card.label}
              onClick={() => setFilterState(card.id)}
              className={`p-3 rounded-xl border text-left transition-colors flex flex-col gap-2 ${
                isActive ? 'border-blue-500 bg-blue-950/20' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon size={16} className={card.color} />
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${card.bg} ${card.color}`}>
                  {card.count}
                </span>
              </div>
              <span className="text-sm font-medium text-zinc-300">{card.label}</span>
            </button>
          )
        })}
      </div>

      {/* Filters & Sort */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900 p-3 rounded-xl border border-zinc-800">
        <div className="flex items-center gap-2 overflow-x-auto w-full custom-scrollbar pb-1 sm:pb-0">
          <span className="text-xs font-medium text-zinc-500 whitespace-nowrap pl-1">필터:</span>
          {['전체', '초안', '테스트 전', '표본 부족', '백테스트 완료', '섀도 검증 중', '활성', '위험 증가', '일시정지', '보관'].map(f => (
            <button 
              key={f}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                (filterState === null && f === '전체') || filterState === f 
                  ? 'bg-zinc-700 text-white' 
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
              }`}
              onClick={() => setFilterState(f === '전체' ? null : f)}
            >
              {f}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <SlidersHorizontal size={14} className="text-zinc-500" />
          <select className="bg-zinc-800 border-none text-xs font-medium text-zinc-300 rounded-lg px-2 py-1.5 outline-none cursor-pointer">
            <option>최근 수정순</option>
            <option>최근 테스트순</option>
            <option>발동 횟수순</option>
            <option>최대 낙폭순</option>
            <option>위험도순</option>
            <option>이름순</option>
          </select>
        </div>
      </div>

      {/* Rule Cards List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
        {/* Sample Card 1 */}
        <RuleCard 
          name="Player 2연속 후 Player"
          status="섀도 검증 중"
          condition="Player가 2회 연속 나오면\n다음 회차 Player 참고"
          triggerCount={142}
          winRate={52.4}
          drawdown="-4%"
        />
        {/* Sample Card 2 */}
        <RuleCard 
          name="Banker 3연속 꺾기"
          status="활성"
          condition="Banker가 3회 연속 나오면\n다음 회차 Player 참고"
          triggerCount={89}
          winRate={55.1}
          drawdown="-2.1%"
        />
        {/* Sample Card 3 */}
        <RuleCard 
          name="안전 위주 퐁당 패턴"
          status="위험 증가"
          condition="P B P B 4회 반복 후\n동일 패턴 지속 여부 참고"
          triggerCount={31}
          winRate={41.2}
          drawdown="-8.5%"
        />
        {/* Sample Card 4 */}
        <RuleCard 
          name="초반 관망 후 진입"
          status="테스트 전"
          condition="슈 시작 후 10회차까지 관망\n이후 가장 많이 나온 결과 추종"
          triggerCount={0}
          winRate={0}
          drawdown="0%"
        />
      </div>
    </div>
  );
}

function RuleCard({ name, status, condition, triggerCount, winRate, drawdown }: any) {
  const getStatusColor = (s: string) => {
    switch (s) {
      case '섀도 검증 중': return 'bg-purple-900/40 text-purple-400 border-purple-800/50';
      case '활성': return 'bg-emerald-900/40 text-emerald-400 border-emerald-800/50';
      case '위험 증가': return 'bg-red-900/40 text-red-400 border-red-800/50';
      case '일시정지': return 'bg-amber-900/40 text-amber-400 border-amber-800/50';
      default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-white text-lg mb-2">{name}</h3>
          <span className={`text-xs font-bold px-2 py-1 rounded-md border ${getStatusColor(status)}`}>
            {status}
          </span>
        </div>
        <button className="text-zinc-500 hover:text-zinc-300">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </button>
      </div>

      <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800/50 mb-4 flex-1">
        <p className="text-xs font-medium text-zinc-500 mb-1">발동 조건:</p>
        <div className="text-sm font-medium text-zinc-300 whitespace-pre-wrap leading-relaxed">
          {condition}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-4 border-t border-zinc-800">
        <div>
          <p className="text-[10px] font-medium text-zinc-500 mb-0.5">발동 횟수</p>
          <p className="text-sm font-bold text-white">{triggerCount}회</p>
        </div>
        <div>
          <p className="text-[10px] font-medium text-zinc-500 mb-0.5">시뮬레이션 승률</p>
          <p className={`text-sm font-bold ${winRate >= 50 ? 'text-emerald-400' : winRate > 0 ? 'text-red-400' : 'text-zinc-400'}`}>
            {winRate > 0 ? `${winRate}%` : '-'}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium text-zinc-500 mb-0.5">최대 낙폭(MDD)</p>
          <p className={`text-sm font-bold ${parseFloat(drawdown) < -5 ? 'text-red-400' : 'text-zinc-300'}`}>
            {drawdown}
          </p>
        </div>
      </div>
    </div>
  );
}
