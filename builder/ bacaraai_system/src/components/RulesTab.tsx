import { getResultColor, getResultLabel } from '../utils/colors';
import React from 'react';
import { Plus, Edit2, Copy, Trash2, Play, Pause, PlayCircle } from 'lucide-react';
import { RuleData } from '../types';

interface RulesTabProps {
  rules: RuleData[];
  onOpenCreateModal: () => void;
}

export default function RulesTab({ rules, onOpenCreateModal }: RulesTabProps) {
  return (
    <div className="flex-1 overflow-x-auto p-6 flex gap-4 custom-scrollbar items-start">
      {rules.map(rule => (
        <RuleCard key={rule.id} rule={rule} />
      ))}
      
      <div 
        onClick={onOpenCreateModal}
        className="w-80 shrink-0 h-[240px] border border-dashed border-zinc-700 rounded-xl flex flex-col items-center justify-center text-zinc-500 hover:text-amber-500 hover:border-amber-500/50 hover:bg-amber-500/5 cursor-pointer transition-colors"
      >
        <Plus size={32} className="mb-2" />
        <span className="text-sm font-medium">AI로 새 규칙 추가</span>
      </div>
    </div>
  );
}

function RuleCard({ rule }: { key?: React.Key, rule: RuleData }) {
  return (
    <div className={`w-80 shrink-0 rounded-xl border flex flex-col overflow-hidden transition-colors ${rule.active ? 'bg-zinc-900 border-amber-500/30 shadow-lg shadow-amber-900/10' : 'bg-zinc-900/50 border-zinc-800 opacity-80'}`}>
      <div className={`p-4 border-b ${rule.active ? 'border-amber-500/20 bg-amber-950/20' : 'border-zinc-800 bg-zinc-950/50'} flex justify-between items-start`}>
        <div className="flex flex-col gap-1.5">
          <h3 className="font-bold text-white text-sm">{rule.name}</h3>
          {rule.description && (
            <p className="text-[10px] text-zinc-400 leading-snug">{rule.description}</p>
          )}
          <div className="flex gap-1.5 mt-1">
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${`${getResultColor(rule.targetSide, 'bg') + ' bg-opacity-20'} ${getResultColor(rule.targetSide, 'text')} ${getResultColor(rule.targetSide, 'border')}`}`}>
              선택: {rule.targetSide}
            </span>
          </div>
        </div>
        
        <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${rule.active ? 'bg-amber-500' : 'bg-zinc-700'}`}>
          <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${rule.active ? 'translate-x-5' : 'translate-x-0'}`}></div>
        </div>
      </div>

      <div className="p-4 grid grid-cols-2 gap-y-3 gap-x-2 text-[10px] flex-1">
        <div className="flex flex-col gap-1">
          <span className="text-zinc-500">발동 조건</span>
          <span className="text-zinc-300 font-medium truncate" title={rule.triggerCondition}>{rule.triggerCondition}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-zinc-500">초기 / 방식</span>
          <span className="text-zinc-300 font-medium">{rule.initialAmount.toLocaleString()}원 / {rule.increaseMethod}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-zinc-500">최대 단계</span>
          <span className="text-zinc-300 font-medium">{rule.maxStages}단계</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-zinc-500">타이 처리</span>
          <span className="text-zinc-300 font-medium">{rule.tieHandling}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-zinc-500">적중 / 발동</span>
          <span className="text-amber-400 font-medium">{rule.hitCount} / {rule.triggerCount}회</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-zinc-500">현재 손익</span>
          <span className={`font-medium font-mono ${rule.currentPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {rule.currentPnL > 0 ? '+' : ''}{rule.currentPnL.toLocaleString()}원
          </span>
        </div>
      </div>

      <div className="px-3 py-2 border-t border-zinc-800 bg-zinc-950/50 flex justify-between items-center text-zinc-400">
        <div className="flex gap-1">
          <button className="p-1.5 hover:text-white hover:bg-zinc-800 rounded transition-colors"><Edit2 size={12} /></button>
          <button className="p-1.5 hover:text-white hover:bg-zinc-800 rounded transition-colors"><Copy size={12} /></button>
          <button className="p-1.5 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors"><Trash2 size={12} /></button>
        </div>
        <div className="flex gap-1.5">
          <button className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors">
            <PlayCircle size={10} /> 시뮬레이션
          </button>
          {rule.active ? (
            <button className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors">
              <Pause size={10} /> 중지
            </button>
          ) : (
            <button className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded transition-colors">
              <Play size={10} /> 활성화
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
