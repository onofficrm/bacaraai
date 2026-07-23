import { Filter, ArrowDownUp, Info, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';

export type SortOption =
  | 'auto'
  | 'table_number'
  | 'rule_triggered'
  | 'high_risk'
  | 'time_remaining'
  | 'ai_consensus'
  | 'favorite_first';
export type FilterOption =
  | 'all'
  | 'rule_triggered'
  | 'ai_analyzing'
  | 'waiting_user'
  | 'martingale'
  | 'risk_blocked'
  | 'data_error'
  | 'wait_skip'
  | 'favorite';

interface TableToolbarProps {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  filterBy: FilterOption;
  onFilterChange: (filter: FilterOption) => void;
  filterCounts: Record<FilterOption, number>;
  isAutoReordered?: boolean;
}

const FILTERS: { id: FilterOption; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'rule_triggered', label: '규칙 발동' },
  { id: 'ai_analyzing', label: 'AI 분석 중' },
  { id: 'waiting_user', label: '사용자 확인 대기' },
  { id: 'martingale', label: '현재 마틴 진행 중' },
  { id: 'risk_blocked', label: '위험 상태' },
  { id: 'data_error', label: '데이터 오류' },
  { id: 'wait_skip', label: '관망' },
  { id: 'favorite', label: '즐겨찾기' },
];

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'table_number', label: '테이블 번호 고정 (1→8)' },
  { id: 'rule_triggered', label: '규칙 발동 순' },
  { id: 'high_risk', label: '위험도 높은 순' },
  { id: 'time_remaining', label: '마감 시간 순' },
  { id: 'ai_consensus', label: 'AI 의견 일치 순' },
  { id: 'favorite_first', label: '즐겨찾기 우선' },
];

export default function TableToolbar({
  sortBy,
  onSortChange,
  filterBy,
  onFilterChange,
  filterCounts,
  isAutoReordered,
}: TableToolbarProps) {
  const [expanded, setExpanded] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const activeFilter = FILTERS.find((f) => f.id === filterBy) || FILTERS[0];
  const activeCount = filterCounts[filterBy] || 0;
  const isFiltered = filterBy !== 'all';

  const visibleFilters = FILTERS.filter((f) => {
    if (f.id === 'all') return true;
    if (f.id === filterBy) return true;
    return (filterCounts[f.id] || 0) > 0;
  });

  return (
    <div className="flex flex-col gap-2 mb-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-[10px] font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
            마지막 업데이트: 방금 전
          </span>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
              expanded || isFiltered
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-600'
            }`}
            aria-expanded={expanded}
          >
            <Filter size={13} />
            <span>
              필터 · {FILTERS[0].label} {filterCounts.all || 0}
            </span>
            <ChevronDown
              size={14}
              className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </button>

          {isFiltered && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300 text-[11px] font-bold">
              {activeFilter.label} {activeCount}
              <button
                type="button"
                onClick={() => onFilterChange('all')}
                className="ml-0.5 p-0.5 rounded hover:bg-amber-500/20"
                aria-label="필터 해제"
                title="필터 해제"
              >
                <X size={12} />
              </button>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 relative">
          <AnimatePresence>
            {sortBy === 'auto' && isAutoReordered && (
              <motion.div
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="text-[10px] text-amber-500 font-bold flex items-center gap-1"
              >
                자동 정렬
                <div
                  className="relative cursor-help"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                >
                  <Info size={12} />
                  <AnimatePresence>
                    {showTooltip && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="absolute right-0 top-5 w-64 bg-zinc-800 border border-zinc-700 p-3 rounded-lg shadow-xl text-zinc-300 z-50 font-normal leading-relaxed text-[11px]"
                      >
                        <strong className="block text-amber-400 mb-1">자동 우선순위 기준</strong>
                        진행 중인 마틴 &gt; 사용자 규칙 발동 &gt; 확인 대기 &gt; AI 분석 일치 &gt;
                        마감 임박 &gt; 오류 &gt; 위험 차단 &gt; 관망
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5">
            <ArrowDownUp size={14} className="text-zinc-500 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="bg-transparent text-xs sm:text-sm text-zinc-200 outline-none cursor-pointer font-medium appearance-none max-w-[160px] sm:max-w-none"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id} className="bg-zinc-900 text-zinc-200">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 pt-0.5">
              {visibleFilters.map((f) => {
                const count = filterCounts[f.id] || 0;
                const active = filterBy === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      onFilterChange(f.id);
                      if (f.id !== 'all') setExpanded(false);
                    }}
                    className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-colors border ${
                      active
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    {f.label}
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                        active ? 'bg-amber-500/20' : 'bg-zinc-800'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
