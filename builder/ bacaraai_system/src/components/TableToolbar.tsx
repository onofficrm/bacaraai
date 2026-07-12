import { Filter, ArrowDownUp, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';

export type SortOption = 'auto' | 'table_number' | 'rule_triggered' | 'high_risk' | 'time_remaining' | 'ai_consensus' | 'favorite_first';
export type FilterOption = 'all' | 'rule_triggered' | 'ai_analyzing' | 'waiting_user' | 'martingale' | 'risk_blocked' | 'data_error' | 'wait_skip' | 'favorite';

interface TableToolbarProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  filterBy: FilterOption;
  onFilterChange: (filter: FilterOption) => void;
  filterCounts: Record<FilterOption, number>;
  isAutoReordered?: boolean;
}

export default function TableToolbar({ sortBy, onSortChange, filterBy, onFilterChange, filterCounts, isAutoReordered }: TableToolbarProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const filters: { id: FilterOption; label: string }[] = [
    { id: 'all', label: '전체' },
    { id: 'rule_triggered', label: '규칙 발동' },
    { id: 'ai_analyzing', label: 'AI 분석 중' },
    { id: 'waiting_user', label: '사용자 확인 대기' },
    { id: 'martingale', label: '현재 마틴 진행 중' },
    { id: 'risk_blocked', label: '위험 상태' },
    { id: 'data_error', label: '데이터 오류' },
    { id: 'wait_skip', label: '관망' },
    { id: 'favorite', label: '즐겨찾기' }
  ];

  const sortOptions: { id: SortOption; label: string }[] = [
    { id: 'auto', label: '자동 우선순위' },
    { id: 'table_number', label: '테이블 번호' },
    { id: 'rule_triggered', label: '규칙 발동 순' },
    { id: 'high_risk', label: '위험도 높은 순' },
    { id: 'time_remaining', label: '마감 시간 순' },
    { id: 'ai_consensus', label: 'AI 의견 일치 순' },
    { id: 'favorite_first', label: '즐겨찾기 우선' }
  ];

  return (
    <div className="flex flex-col gap-3 mb-4">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 w-fit">
          마지막 업데이트: 방금 전
        </span>
      </div>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 w-full md:w-auto">
        <div className="text-zinc-500 mr-2 flex items-center gap-1.5 shrink-0">
          <Filter size={16} />
          <span className="text-sm font-bold">필터:</span>
        </div>
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => onFilterChange(f.id)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              filterBy === f.id 
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            {f.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              filterBy === f.id ? 'bg-amber-500/20' : 'bg-zinc-800'
            }`}>
              {filterCounts[f.id] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Sorting */}
      <div className="flex items-center gap-3 shrink-0 relative w-full md:w-auto justify-between md:justify-end">
        <AnimatePresence>
          {sortBy === 'auto' && isAutoReordered && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="text-xs text-amber-500 font-bold flex items-center gap-1.5 absolute right-[200px]"
            >
              자동 정렬됨
              <div 
                className="relative cursor-help"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <Info size={14} />
                <AnimatePresence>
                  {showTooltip && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute right-0 top-6 w-64 bg-zinc-800 border border-zinc-700 p-3 rounded-lg shadow-xl text-zinc-300 z-50 font-normal leading-relaxed text-[11px]"
                    >
                      <strong className="block text-amber-400 mb-1">자동 우선순위 기준</strong>
                      진행 중인 마틴 &gt; 사용자 규칙 발동 &gt; 확인 대기 &gt; AI 분석 일치 &gt; 마감 임박 &gt; 오류 &gt; 위험 차단 &gt; 관망
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5">
          <ArrowDownUp size={16} className="text-zinc-500" />
          <select 
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="bg-transparent text-sm text-zinc-200 outline-none cursor-pointer font-medium appearance-none"
          >
            {sortOptions.map(opt => (
              <option key={opt.id} value={opt.id} className="bg-zinc-900 text-zinc-200">
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
    </div>
  );
}
