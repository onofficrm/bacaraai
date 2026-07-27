/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Activity, LayoutGrid } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import TableCard from './components/TableCard';
import LiveStreamModal from './components/LiveStreamModal';
import AdminControlPanel from './components/admin/AdminControlPanel';
import AdminStreamConsole from './components/admin/AdminStreamConsole';
import { MOCK_TABLES } from './data';
import { useAdminLiveControl } from './hooks/useAdminLive';
import useCompactLayout from './hooks/useCompactLayout';
import useStreamStatus from './hooks/useStreamStatus';

export default function AdminApp() {
  const compact = useCompactLayout();
  const [selectedTableId, setSelectedTableId] = useState<string>(MOCK_TABLES[0].id);
  const [liveStreamTableId, setLiveStreamTableId] = useState<string | null>(null);
  const ctrl = useAdminLiveControl(selectedTableId);
  const { statuses: streamStatuses } = useStreamStatus(true);
  const liveStreamTable =
    ctrl.tables.find((t) => t.id === liveStreamTableId) ||
    MOCK_TABLES.find((t) => t.id === liveStreamTableId) ||
    null;

  const openPreviewByCode = (tableCode: string) => {
    const code = tableCode.toUpperCase();
    const hit =
      ctrl.tables.find((t) => t.gameCode === code) ||
      MOCK_TABLES.find((t) => t.gameCode === code);
    if (hit) setLiveStreamTableId(hit.id);
  };

  return (
    <div className="min-h-dvh w-full bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="shrink-0 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-md px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-amber-400/90">
            BACARA AI · ADMIN
          </p>
          <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <LayoutGrid size={18} className="text-amber-400" />
            라이브 테이블 제어
          </h1>
        </div>
        <div className="text-right text-[11px] text-zinc-500">
          {ctrl.loading ? '동기화 중…' : '감지=표시 · 스트림 관제'}
          {ctrl.error ? (
            <p className="text-rose-400 mt-0.5 max-w-[220px] truncate">{ctrl.error}</p>
          ) : null}
          {ctrl.toast ? (
            <p className="text-amber-300 mt-0.5 max-w-[220px] truncate">{ctrl.toast}</p>
          ) : null}
        </div>
      </header>

      {ctrl.toast ? (
        <div className="shrink-0 px-4 pt-2">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 text-center">
            {ctrl.toast}
          </div>
        </div>
      ) : null}

      {ctrl.selectedTable?.live?.syncWarning ? (
        <div className="shrink-0 px-4 pt-2">
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100 text-center">
            {ctrl.selectedTable.live.syncWarning}
          </div>
        </div>
      ) : null}

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        <main className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 sm:p-4 lg:p-5">
          <div
            className={`grid gap-3 sm:gap-4 ${
              compact
                ? 'grid-cols-1 sm:grid-cols-2'
                : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
            }`}
          >
            <AnimatePresence mode="popLayout">
              {ctrl.tables.map((table) => (
                <motion.div
                  key={table.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <TableCard
                    table={table}
                    compact={compact}
                    adminMode
                    isSelected={table.id === selectedTableId}
                    onSelect={setSelectedTableId}
                    onOpenLive={setLiveStreamTableId}
                    streamOnline={
                      streamStatuses[table.gameCode]
                        ? streamStatuses[table.gameCode].online
                        : null
                    }
                    streamStalled={Boolean(streamStatuses[table.gameCode]?.stalled)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {ctrl.tables.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500 gap-2">
              <Activity size={32} className="opacity-50" />
              <p>테이블을 불러오는 중…</p>
            </div>
          )}
        </main>

        <aside className="shrink-0 lg:w-[340px] xl:w-[380px] border-t lg:border-t-0 lg:border-l border-zinc-800 bg-zinc-950/90 p-3 sm:p-4 max-h-[52vh] lg:max-h-none overflow-y-auto custom-scrollbar">
          <AdminControlPanel
            table={ctrl.selectedTable}
            tableCode={ctrl.selectedCode}
            shuffleActive={ctrl.shuffleActive}
            manualMode={ctrl.manualMode}
            busy={ctrl.busy}
            audit={ctrl.audit}
            onAdd={ctrl.addResult}
            onUndo={ctrl.undoLast}
            onNewGame={ctrl.newGame}
            onToggleShuffle={ctrl.setShuffle}
            onResumeAuto={ctrl.resumeAuto}
          />
          <AdminStreamConsole
            selectedCode={ctrl.selectedCode}
            onPreview={openPreviewByCode}
          />
        </aside>
      </div>

      <LiveStreamModal
        open={Boolean(liveStreamTable)}
        tableName={liveStreamTable?.name || ''}
        tableCode={liveStreamTable?.gameCode || ''}
        latestResultLabel={
          liveStreamTable
            ? `#${liveStreamTable.stats.currentRound || '-'} ${
                liveStreamTable.stats.recentResults?.slice(-1)[0] || ''
              }`.trim()
            : undefined
        }
        onClose={() => setLiveStreamTableId(null)}
      />
    </div>
  );
}
