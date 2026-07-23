import { getResultColor, getResultLabel } from '../utils/colors';
import React from 'react';
import { Maximize2, Star } from 'lucide-react';
import { AiOpinion, TableData, TableStatus } from '../types';
import { STATUS_GUIDE } from '../help/glossary';
import Roadmap from './Roadmap';

interface TableCardProps {
  table: TableData;
  isSelected?: boolean;
  isFavorite?: boolean;
  beginnerMode?: boolean;
  onSelect?: (id: string) => void;
  onZoom?: (id: string) => void;
  onToggleFavorite?: (id: string, e: React.MouseEvent) => void;
}

export default function TableCard({
  table,
  isSelected,
  isFavorite,
  beginnerMode = true,
  onSelect,
  onZoom,
  onToggleFavorite,
}: TableCardProps) {
  const isBetting = table.status === 'betting' || table.status === 'rule_triggered' || table.status === 'waiting_user';
  const isPassive = ['WAIT', 'SKIP', 'PAUSE', 'STOP', 'ERROR', 'DATA_ERROR'].includes(table.ai.finalOpinion);
  
  let cardClass = "bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors group rounded-xl p-3 sm:p-4 flex flex-col gap-3 relative cursor-pointer ";
  if (isSelected) {
    cardClass += " ring-2 ring-amber-500 border-amber-500/60 shadow-lg shadow-amber-900/20 ";
  }
  if (table.status === 'rule_triggered') {
    cardClass += " border-amber-500/50 ";
  } else if (table.status === 'risk_blocked') {
    cardClass += " border-red-900/50 ";
  }

  return (
    <div className={cardClass} onClick={() => onSelect?.(table.id)}>
      {table.status === 'risk_blocked' && (
        <div className="absolute inset-0 rounded-xl overflow-hidden bg-red-950/20 backdrop-blur-[1px] z-10 flex items-center justify-center">
          <div className="bg-zinc-900 border border-red-900 text-red-400 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            위험 한도 차단됨
          </div>
        </div>
      )}

      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-zinc-100">{table.name}</h3>
            {isSelected && (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
                선택됨
              </span>
            )}
            {!beginnerMode && (
              <span className="text-xs text-zinc-500 font-mono">{table.gameCode}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {table.live ? (
              <>
                <span
                  title={table.live.error || 'DB 결과를 2초마다 확인합니다.'}
                  className={`text-[10px] px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${
                    table.live.connected
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : table.live.loading
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full bg-current ${
                      table.live.connected || table.live.loading ? 'animate-pulse' : ''
                    }`}
                  />
                  {table.live.connected ? 'LIVE' : table.live.loading ? '연결 중' : '연결 오류'}
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  {table.live.gameNo != null ? `G${table.live.gameNo} · ` : ''}
                  {formatDetectedAt(table.live.latestDetectedAt)}
                </span>
              </>
            ) : (
              <>
                <StatusBadge status={table.status} />
                <div className={`text-xs font-mono font-bold flex items-center gap-1 ${
                  isBetting ? 'text-amber-500' : 'text-zinc-400'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${isBetting ? 'bg-amber-500 animate-ping' : 'bg-zinc-500'}`}></div>
                  {table.timer}초
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className={`flex items-center gap-1 transition-opacity z-20 ${isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <button 
            className={`p-1.5 rounded transition-colors ${isFavorite ? 'text-amber-400 bg-amber-400/10' : 'text-zinc-500 hover:text-amber-400 hover:bg-zinc-800'}`} 
            onClick={(e) => onToggleFavorite?.(table.id, e)}
          >
            <Star size={16} fill={isFavorite ? "currentColor" : "none"} />
          </button>
          <button className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors" onClick={(e) => { e.stopPropagation(); onZoom?.(table.id); }}>
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      <Roadmap data={table.roadmap} />

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex flex-col">
            <span className="text-zinc-500">Player(P)</span>
            <span className="text-blue-400 font-mono font-bold">{table.stats.player}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-zinc-500">Banker(B)</span>
            <span className="text-red-400 font-mono font-bold">{table.stats.banker}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-zinc-500">Tie(T)</span>
            <span className="text-emerald-400 font-mono font-bold">{table.stats.tie}</span>
          </div>
        </div>
        
        <div className="flex flex-col items-end text-xs justify-center gap-1">
          <div className="flex items-center gap-1">
            <span className="text-zinc-500">연속:</span>
            <span className={`font-medium ${table.stats.currentStreak.includes('Player') ? 'text-blue-400' : table.stats.currentStreak.includes('Banker') ? 'text-red-400' : 'text-emerald-400'}`}>
              {table.stats.currentStreak}
            </span>
          </div>
        </div>
      </div>

      {/* Core AI summary — always visible */}
      <div className="mt-1 pt-3 border-t border-zinc-800/80 flex flex-col gap-2">
        {!beginnerMode && (
          <div className="hidden sm:flex justify-between items-center text-[10px]">
            <div className="flex gap-1.5">
              <AiBadge model="GPT" opinion={table.ai.gpt.opinion} />
              <AiBadge model="Gem" opinion={table.ai.gemini.opinion} />
              <AiBadge model="Cld" opinion={table.ai.claude.opinion} />
            </div>
            <div className="text-zinc-500 font-medium">
              일치도: <span className={table.ai.consensus.includes('3/3') ? 'text-amber-400' : 'text-zinc-300'}>{table.ai.consensus}</span>
            </div>
          </div>
        )}
        
        <div className={`rounded border p-2.5 flex justify-between items-center ${
          isSelected ? 'bg-amber-500/5 border-amber-500/30' : 'bg-zinc-950 border-zinc-800/80'
        }`}>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-zinc-500">
              {table.ai.shadowMode ? 'AI 의견 · 섀도' : 'AI 의견'}
            </span>
            <span className={`text-sm font-bold ${getOpinionColor(table.ai.finalOpinion)}`}>
              {getOpinionText(table.ai.finalOpinion, beginnerMode)}
            </span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[10px] text-zinc-500">참고 금액</span>
            <span className="text-sm font-mono font-bold text-zinc-200">
              {isPassive || table.ai.shadowMode ? '-' : table.ai.recommendedAmount.toLocaleString() + '원'}
            </span>
          </div>
        </div>

        {beginnerMode ? (
          <p className="text-[11px] text-zinc-500 px-0.5">
            {isSelected
              ? '하단 시트에서 금액을 확인하고 확정하세요.'
              : '카드를 눌러 베팅 화면을 여세요.'}
          </p>
        ) : (
          <div className="flex justify-between text-[10px] px-1 text-zinc-500">
            <span>분석 신뢰도: {table.ai.finalConfidence}%</span>
            <span className="text-amber-500/80">{table.ai.appliedRule}</span>
          </div>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(table.id);
          }}
          className="xl:hidden w-full min-h-[48px] mt-1 rounded-xl bg-blue-600 active:bg-blue-500 text-white text-sm font-bold touch-manipulation shadow-lg shadow-blue-600/20"
        >
          {isSelected ? '베팅 계속하기' : '베팅하기'}
        </button>
      </div>
    </div>
  );
}

function AiBadge({ model, opinion }: { model: string, opinion: AiOpinion }) {
  const bgClass = getResultColor(opinion, 'bg');
  const textClass = getResultColor(opinion, 'text');
  const borderClass = getResultColor(opinion, 'border');
  const label = getResultLabel(opinion);

  return (
    <div className={`px-1.5 py-0.5 rounded border flex items-center gap-1 ${bgClass} bg-opacity-20 ${textClass} ${borderClass}`}>
      <span>{model}</span>
      <span className="w-1 h-1 rounded-full bg-current opacity-70"></span>
      <span className="font-bold">{label.charAt(0)}</span>
    </div>
  );
}

function getOpinionText(opinion: AiOpinion, friendly = false) {
  return getResultLabel(opinion, friendly);
}

function getOpinionColor(opinion: AiOpinion) {
  return getResultColor(opinion, 'text');
}

function formatDetectedAt(value: string | null): string {
  if (!value) return '결과 대기';
  const time = value.match(/\d{2}:\d{2}:\d{2}/)?.[0];
  return time ? `최근 ${time}` : value;
}

function StatusBadge({ status }: { status: TableStatus }) {
  let text = STATUS_GUIDE[status]?.label || '관찰 중';
  let classes = 'bg-teal-500/10 text-teal-400 border-teal-500/20';
  const tip = STATUS_GUIDE[status]?.tip || '테이블 상태를 확인하세요.';

  switch (status) {
    case 'analyzing':
      classes = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      break;
    case 'rule_triggered':
      classes = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      break;
    case 'waiting_user':
      classes = 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse';
      break;
    case 'checking_result':
      classes = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      break;
    case 'paused':
      classes = 'bg-zinc-800 text-zinc-400 border-zinc-700';
      break;
    case 'error':
      classes = 'bg-red-500/10 text-red-400 border-red-500/20';
      break;
    case 'risk_blocked':
      classes = 'bg-red-900/30 text-red-500 border-red-900/50';
      break;
    case 'betting':
      classes = 'bg-amber-500/20 text-amber-500 border-amber-500/30';
      break;
    case 'waiting':
      classes = 'bg-zinc-800 text-zinc-400 border-zinc-700';
      break;
  }

  return (
    <span
      title={tip}
      className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${classes}`}
    >
      {status === 'analyzing' && <div className="w-1.5 h-1.5 rounded-full bg-current animate-ping mr-0.5"></div>}
      {text}
    </span>
  );
}
