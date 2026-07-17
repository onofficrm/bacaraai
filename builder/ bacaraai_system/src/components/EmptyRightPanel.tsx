import React, { useMemo } from 'react';
import { MousePointerClick, Eye, ShieldCheck, Sparkles, ArrowRight, AlertTriangle } from 'lucide-react';
import { TableData, TableStatus } from '../types';
import { STATUS_GUIDE } from '../help/glossary';
import HelpTooltip from './HelpTooltip';

interface EmptyRightPanelProps {
  tables: TableData[];
  onSelectTable: (id: string) => void;
  beginnerMode?: boolean;
}

const STATUS_PRIORITY: Record<string, number> = {
  waiting_user: 100,
  rule_triggered: 90,
  betting: 80,
  analyzing: 70,
  checking_result: 60,
  observing: 40,
  waiting: 30,
  paused: 20,
  risk_blocked: 15,
  error: 10,
};

function pickSpotlightTables(tables: TableData[]): TableData[] {
  return [...tables]
    .sort((a, b) => {
      const pa = STATUS_PRIORITY[a.status] ?? 0;
      const pb = STATUS_PRIORITY[b.status] ?? 0;
      if (pb !== pa) return pb - pa;
      return b.ai.finalConfidence - a.ai.finalConfidence;
    })
    .slice(0, 3);
}

function statusAccent(status: TableStatus): string {
  switch (status) {
    case 'waiting_user':
    case 'rule_triggered':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
    case 'betting':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
    case 'analyzing':
      return 'border-sky-500/40 bg-sky-500/10 text-sky-200';
    case 'risk_blocked':
    case 'error':
      return 'border-rose-500/40 bg-rose-500/10 text-rose-200';
    default:
      return 'border-white/10 bg-white/[0.03] text-zinc-300';
  }
}

export default function EmptyRightPanel({
  tables,
  onSelectTable,
  beginnerMode = true,
}: EmptyRightPanelProps) {
  const spotlight = useMemo(() => pickSpotlightTables(tables), [tables]);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={14} className="text-amber-400" />
          <h2 className="text-sm font-bold text-zinc-100 tracking-tight">시작 가이드</h2>
        </div>
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          {beginnerMode
            ? '테이블을 고르기 전에, 아래 3단계만 기억하세요.'
            : '좌측 테이블을 선택하면 상세 분석이 열립니다.'}
        </p>
      </div>

      <div className="space-y-2">
        {[
          {
            step: 1,
            icon: MousePointerClick,
            title: '테이블 선택',
            desc: '왼쪽 카드 중 하나를 탭하세요.',
          },
          {
            step: 2,
            icon: Eye,
            title: 'AI 의견 확인',
            desc: '참고 의견·신뢰도·상태를 확인합니다.',
          },
          {
            step: 3,
            icon: ShieldCheck,
            title: '직접 판단',
            desc: '최종 베팅 여부는 항상 본인 결정입니다.',
          },
        ].map(({ step, icon: Icon, title, desc }) => (
          <div
            key={step}
            className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-black text-amber-300">{step}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon size={12} className="text-zinc-500" />
                <p className="text-xs font-bold text-zinc-200">{title}</p>
              </div>
              <p className="text-[10px] text-zinc-500 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            지금 주목할 테이블
          </h3>
          <span className="text-[9px] text-zinc-600">Top 3</span>
        </div>
        <div className="space-y-2">
          {spotlight.map((t) => {
            const guide = STATUS_GUIDE[t.status];
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectTable(t.id)}
                className={`w-full text-left rounded-xl border px-3 py-2.5 transition-all hover:brightness-110 active:scale-[0.99] ${statusAccent(t.status)}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-bold truncate">{t.name}</span>
                  <ArrowRight size={12} className="opacity-60 shrink-0" />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-[10px] font-semibold opacity-90 truncate">
                      {guide?.label ?? t.status}
                    </span>
                    {guide?.tip && (
                      <HelpTooltip label={guide.label} text={guide.tip} className="shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] font-mono opacity-70 shrink-0">
                    신뢰 {t.ai.finalConfidence}%
                  </span>
                </div>
                {beginnerMode && guide?.tip && (
                  <p className="mt-1.5 text-[9px] leading-relaxed opacity-70 line-clamp-2">
                    {guide.tip}
                  </p>
                )}
              </button>
            );
          })}
          {spotlight.length === 0 && (
            <p className="text-[11px] text-zinc-600 text-center py-4">표시할 테이블이 없습니다.</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-3 py-3 flex gap-2.5">
        <AlertTriangle size={14} className="text-rose-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-[11px] font-bold text-rose-200 mb-0.5">안전 안내</p>
          <p className="text-[10px] text-rose-200/70 leading-relaxed">
            이 화면의 AI 의견은 참고용입니다. 실제 베팅·손실에 대한 책임은 사용자에게 있습니다.
            감당 가능한 범위에서만 이용하세요.
          </p>
        </div>
      </div>
    </div>
  );
}
