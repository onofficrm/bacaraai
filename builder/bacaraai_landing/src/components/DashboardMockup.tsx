import { Activity, ShieldCheck, Database, BrainCircuit, AlertTriangle, PlayCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function DashboardMockup() {
  const dummyTables = Array.from({ length: 8 }).map((_, i) => ({
    id: i + 1,
    name: `테이블 ${String.fromCharCode(65 + i)}`,
    status: i === 2 ? 'warning' : i === 5 ? 'danger' : 'normal',
    trend: i % 2 === 0 ? 'P' : 'B',
  }));

  return (
    <div className="relative w-full max-w-4xl mx-auto rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden ring-1 ring-white/10">
      {/* Top App Bar Mockup */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded bg-zinc-800 text-xs font-mono text-zinc-400">
            <Database className="w-3 h-3" />
            <span>SYNC_ACTIVE</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex flex-col items-end">
            <span className="text-zinc-500">현재 자금</span>
            <span className="text-amber-400 font-medium">1,250,000</span>
          </div>
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-zinc-500">윈컷 / 로스컷</span>
            <span className="text-zinc-300">1,500K / 900K</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 bg-zinc-950">
        {dummyTables.map((table, i) => (
          <motion.div
            key={table.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex flex-col p-3 rounded-xl border ${
              table.status === 'warning'
                ? 'border-orange-500/30 bg-orange-500/5'
                : table.status === 'danger'
                ? 'border-red-500/30 bg-red-500/5'
                : 'border-zinc-800 bg-zinc-900/50'
            }`}
          >
            {/* Table Header */}
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-semibold text-zinc-300">{table.name}</span>
              {table.status === 'normal' && (
                <div className="w-2 h-2 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.8)]"></div>
              )}
              {table.status === 'warning' && (
                <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
              )}
              {table.status === 'danger' && (
                <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
              )}
            </div>

            {/* AI Opinions */}
            <div className="flex gap-1 mb-3">
              <div className="flex-1 h-1.5 rounded-full bg-blue-500/20 overflow-hidden">
                <div className="h-full bg-blue-500 w-full opacity-70"></div>
              </div>
              <div className="flex-1 h-1.5 rounded-full bg-red-500/20 overflow-hidden">
                <div className="h-full bg-red-500 w-1/3 opacity-70"></div>
              </div>
              <div className="flex-1 h-1.5 rounded-full bg-green-500/20 overflow-hidden">
                <div className="h-full bg-green-500 w-1/4 opacity-70"></div>
              </div>
            </div>

            {/* AI Synthesis */}
            <div className="mt-auto pt-2 border-t border-zinc-800/50 flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                <BrainCircuit className="w-3 h-3" />
                <span>AI 판단</span>
              </div>
              {table.status === 'danger' ? (
                <span className="text-[10px] font-medium text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">
                  위험 차단
                </span>
              ) : table.status === 'warning' ? (
                <span className="text-[10px] font-medium text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded">
                  관망 권장
                </span>
              ) : (
                <span className="text-[10px] font-medium text-teal-400 bg-teal-400/10 px-1.5 py-0.5 rounded">
                  진행 가능
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800 bg-zinc-900/50 text-[10px] sm:text-xs text-zinc-500 font-mono">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-teal-500" />
            <span>GPT, Gemini, Claude 연결됨</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span>마틴: 2단계</span>
          <span className="text-zinc-700">|</span>
          <span>사용자 규칙 모니터링 중</span>
        </div>
      </div>

      {/* Overlay Badge */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="px-4 py-2 rounded-full bg-zinc-900/80 backdrop-blur border border-zinc-700/50 text-sm font-medium text-zinc-300 flex items-center gap-2 shadow-2xl">
          <PlayCircle className="w-4 h-4 text-amber-500" />
          플랫폼 데모 화면
        </div>
      </div>
    </div>
  );
}
