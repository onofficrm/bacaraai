import { Search, Download, Eye } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { GameHistoryEntry } from '../types';
import HistoryDetailModal from './HistoryDetailModal';
import {
  betWlLabel,
  formatHistoryDateTime,
  getTodayBetStats,
  inferBetSource,
  resolveBetWl,
  type BetWlResult,
} from '../utils/betHistory';
import { getResultColor, getResultLabel } from '../utils/colors';

type SourceFilter = 'all' | 'manual' | 'auto';

export default function HistoryTab({
  history,
  initialSourceFilter = 'all',
}: {
  history: GameHistoryEntry[];
  initialSourceFilter?: SourceFilter;
}) {
  const [selectedEntry, setSelectedEntry] = useState<GameHistoryEntry | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>(initialSourceFilter);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setSourceFilter(initialSourceFilter);
  }, [initialSourceFilter]);

  const today = useMemo(() => getTodayBetStats(history), [history]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return history.filter((e) => {
      const src = inferBetSource(e);
      if (sourceFilter === 'manual' && src !== 'manual') return false;
      if (sourceFilter === 'auto' && src !== 'auto') return false;
      if (!q) return true;
      return (
        e.tableName.toLowerCase().includes(q) ||
        (e.appliedRule || '').toLowerCase().includes(q) ||
        (e.note || '').toLowerCase().includes(q)
      );
    });
  }, [history, sourceFilter, query]);

  const counts = useMemo(() => {
    let manual = 0;
    let auto = 0;
    for (const e of history) {
      const s = inferBetSource(e);
      if (s === 'manual') manual += 1;
      else if (s === 'auto') auto += 1;
    }
    return { manual, auto, all: history.length };
  }, [history]);

  const exportCsv = () => {
    const rows = [
      ['구분', '일시', '테이블', '슈', '회차', '베팅', '결과', '승패', '금액', '손익', '단계', '상태', '규칙', '메모'],
      ...filtered.map((e) => {
        const src = inferBetSource(e);
        const wl = resolveBetWl(e);
        return [
          src === 'auto' ? '오토' : src === 'manual' ? '직접' : '-',
          formatHistoryDateTime(e.at, e.time),
          e.tableName,
          e.shoeNumber,
          String(e.round || ''),
          displaySide(e.userSelection),
          e.actualResult === 'NONE' ? '-' : e.actualResult,
          betWlLabel(wl),
          String(e.amount || 0),
          String(e.pnl || 0),
          String(e.martingaleStage || ''),
          e.dataStatus,
          e.appliedRule,
          e.note || '',
        ];
      }),
    ];
    const csv = rows.map((r) => r.map(csvEscape).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bet-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'all' as const, label: `전체 ${counts.all}` },
              { id: 'manual' as const, label: `직접 ${counts.manual}` },
              { id: 'auto' as const, label: `오토 ${counts.auto}` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSourceFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                sourceFilter === tab.id
                  ? tab.id === 'auto'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : tab.id === 'manual'
                      ? 'bg-blue-600/20 border-blue-400 text-blue-200'
                      : 'bg-zinc-800 border-zinc-600 text-white'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <span className="text-[11px] text-zinc-500 ml-1">
            오늘 정산 {today.count}건
            {today.count > 0 && (
              <>
                {' '}
                · <span className="text-emerald-400">{today.wins}승</span>
                <span className="text-zinc-600"> </span>
                <span className="text-rose-400">{today.losses}패</span>
                <span className="text-zinc-600"> </span>
                <span className="text-zinc-400">{today.ties}무</span>
              </>
            )}
            {' '}
            · 손익{' '}
            <span
              className={
                today.pnl > 0 ? 'text-emerald-400' : today.pnl < 0 ? 'text-red-400' : 'text-zinc-400'
              }
            >
              {today.pnl > 0 ? '+' : ''}
              {today.pnl.toLocaleString()}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="테이블·메모 검색"
              className="bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500/50 w-44"
            />
          </div>
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      <div className="hidden md:block flex-1 overflow-auto custom-scrollbar border border-zinc-800 rounded-xl bg-zinc-900/50 min-h-[280px]">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-zinc-950/80 text-zinc-500 sticky top-0 z-10 border-b border-zinc-800">
            <tr>
              <th className="px-3 py-3 font-medium">구분</th>
              <th className="px-3 py-3 font-medium">일시</th>
              <th className="px-3 py-3 font-medium">테이블</th>
              <th className="px-3 py-3 font-medium">슈/회차</th>
              <th className="px-3 py-3 font-medium">베팅</th>
              <th className="px-3 py-3 font-medium text-right">금액</th>
              <th className="px-3 py-3 font-medium text-center">결과</th>
              <th className="px-3 py-3 font-medium text-center">승패</th>
              <th className="px-3 py-3 font-medium text-right">손익</th>
              <th className="px-3 py-3 font-medium">단계</th>
              <th className="px-3 py-3 font-medium">상태</th>
              <th className="px-3 py-3 font-medium text-center">상세</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-12 text-center text-zinc-500">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Search size={32} className="opacity-20" />
                    <p>표시할 기록이 없습니다.</p>
                    <p className="text-[11px] text-zinc-600 max-w-xs">
                      직접 베팅과 오토베팅 정산이 끝나면 여기에 구분되어 표시됩니다.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((entry) => (
                <HistoryRow
                  key={entry.id}
                  entry={entry}
                  onOpen={() => setSelectedEntry(entry)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden flex-1 overflow-auto custom-scrollbar flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 border border-zinc-800 rounded-xl bg-zinc-900/50">
            표시할 기록이 없습니다.
          </div>
        ) : (
          filtered.map((entry) => {
            const src = inferBetSource(entry);
            const wl = resolveBetWl(entry);
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => setSelectedEntry(entry)}
                className="text-left bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <SourceBadge source={src} />
                      <WlBadge wl={wl} />
                      <StatusBadge status={entry.dataStatus} />
                    </div>
                    <p className="font-bold text-zinc-200 text-sm truncate">{entry.tableName}</p>
                    <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                      {formatHistoryDateTime(entry.at, entry.time)}
                      {entry.round > 0 ? ` · ${entry.round}회` : ''}
                      {entry.shoeNumber && entry.shoeNumber !== '-'
                        ? ` · ${entry.shoeNumber}`
                        : ''}
                    </p>
                  </div>
                  <span
                    className={`font-mono font-bold text-sm ${
                      entry.pnl > 0
                        ? 'text-emerald-400'
                        : entry.pnl < 0
                          ? 'text-red-400'
                          : 'text-zinc-500'
                    }`}
                  >
                    {entry.pnl > 0 ? '+' : ''}
                    {entry.pnl === 0 ? '-' : entry.pnl.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-bold ${getResultColor(entry.userSelection, 'text')}`}>
                    {displaySide(entry.userSelection)}
                    <span className="text-zinc-600 font-normal mx-1">→</span>
                    <span
                      className={`inline-flex w-5 h-5 items-center justify-center rounded text-[10px] text-white ${getResultColor(entry.actualResult, 'bg')}`}
                    >
                      {entry.actualResult === 'NONE' ? '-' : getResultLabel(entry.actualResult)}
                    </span>
                  </span>
                  <span className="font-mono text-zinc-400">
                    {entry.amount > 0 ? entry.amount.toLocaleString() : '-'}
                    {src === 'auto' && entry.martingaleStage > 0
                      ? ` · ${entry.martingaleStage}단`
                      : ''}
                  </span>
                </div>
                {entry.note && (
                  <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">{entry.note}</p>
                )}
              </button>
            );
          })
        )}
      </div>

      <HistoryDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </div>
  );
}

function HistoryRow({ entry, onOpen }: { entry: GameHistoryEntry; onOpen: () => void }) {
  const src = inferBetSource(entry);
  const wl = resolveBetWl(entry);
  return (
    <tr className="hover:bg-zinc-800/30 transition-colors">
      <td className="px-3 py-3">
        <SourceBadge source={src} />
      </td>
      <td className="px-3 py-3 font-mono text-zinc-400 text-[11px]">
        {formatHistoryDateTime(entry.at, entry.time)}
      </td>
      <td className="px-3 py-3 font-medium text-zinc-200 max-w-[140px] truncate">{entry.tableName}</td>
      <td className="px-3 py-3 text-zinc-500">
        {entry.shoeNumber && entry.shoeNumber !== '-' ? entry.shoeNumber : '-'}
        <span className="text-zinc-600 mx-1">|</span>
        {entry.round > 0 ? `${entry.round}회` : '-'}
      </td>
      <td className="px-3 py-3">
        <span className={`font-bold ${getResultColor(entry.userSelection, 'text')}`}>
          {displaySide(entry.userSelection)}
        </span>
      </td>
      <td className="px-3 py-3 text-right font-mono text-zinc-300">
        {entry.amount > 0 ? entry.amount.toLocaleString() : '-'}
      </td>
      <td className="px-3 py-3 text-center">
        <span
          className={`inline-flex items-center justify-center w-5 h-5 rounded font-bold text-[10px] text-white ${getResultColor(entry.actualResult, 'bg')}`}
        >
          {entry.actualResult === 'NONE' ? '-' : getResultLabel(entry.actualResult)}
        </span>
      </td>
      <td className="px-3 py-3 text-center">
        <WlBadge wl={wl} />
      </td>
      <td
        className={`px-3 py-3 text-right font-mono font-bold ${
          entry.pnl > 0 ? 'text-emerald-400' : entry.pnl < 0 ? 'text-red-400' : 'text-zinc-500'
        }`}
      >
        {entry.pnl > 0 ? '+' : ''}
        {entry.pnl === 0 ? '-' : entry.pnl.toLocaleString()}
      </td>
      <td className="px-3 py-3 text-zinc-400">
        {src === 'auto' ? `${entry.martingaleStage}단` : '-'}
      </td>
      <td className="px-3 py-3">
        <StatusBadge status={entry.dataStatus} />
      </td>
      <td className="px-3 py-3 text-center">
        <button
          type="button"
          onClick={onOpen}
          className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded transition-colors inline-flex"
          aria-label="상세"
        >
          <Eye size={14} />
        </button>
      </td>
    </tr>
  );
}

function WlBadge({ wl }: { wl: BetWlResult }) {
  if (wl === 'win') {
    return (
      <span className="inline-flex px-1.5 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-[10px] font-bold">
        승
      </span>
    );
  }
  if (wl === 'loss') {
    return (
      <span className="inline-flex px-1.5 py-0.5 rounded border border-rose-500/40 bg-rose-500/10 text-rose-300 text-[10px] font-bold">
        패
      </span>
    );
  }
  if (wl === 'tie') {
    return (
      <span className="inline-flex px-1.5 py-0.5 rounded border border-zinc-500/40 bg-zinc-700/40 text-zinc-300 text-[10px] font-bold">
        무
      </span>
    );
  }
  return <span className="text-zinc-600 text-[10px]">-</span>;
}

function SourceBadge({ source }: { source: 'manual' | 'auto' | 'unknown' }) {
  if (source === 'auto') {
    return (
      <span className="inline-flex px-1.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 text-[10px] font-bold">
        오토
      </span>
    );
  }
  if (source === 'manual') {
    return (
      <span className="inline-flex px-1.5 py-0.5 rounded border border-blue-500/40 bg-blue-500/10 text-blue-300 text-[10px] font-bold">
        직접
      </span>
    );
  }
  return (
    <span className="inline-flex px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-500 text-[10px] font-bold">
      -
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cancelled = status === '취소';
  return (
    <span
      className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border ${
        cancelled
          ? 'border-zinc-600 text-zinc-400 bg-zinc-800/80'
          : 'border-emerald-500/30 text-emerald-400/90 bg-emerald-500/10'
      }`}
    >
      {cancelled ? '취소' : status === '정상' ? '정산' : status || '정산'}
    </span>
  );
}

function displaySide(sel: string) {
  if (['WAIT', 'SKIP', 'PAUSE'].includes(sel)) return '관망';
  if (sel === 'PLAYER') return 'Player';
  if (sel === 'BANKER') return 'Banker';
  if (sel === 'TIE') return 'Tie';
  return sel;
}

function csvEscape(v: string) {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
