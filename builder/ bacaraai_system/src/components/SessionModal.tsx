import { X, Calculator, Info } from 'lucide-react';
import { useState } from 'react';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SessionModal({ isOpen, onClose }: SessionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Left Form Panel */}
        <div className="flex-1 p-6 lg:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <SettingsIcon />
              세션 설정
            </h2>
            <button onClick={onClose} className="md:hidden text-zinc-400 hover:text-white">
              <X size={24} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <InputGroup label="시작 시드 (원)" defaultValue="4,000,000" />
            <InputGroup label="초기 베팅액 (원)" defaultValue="10,000" />
            <InputGroup label="윈컷 (목표 수익)" defaultValue="+1,000,000" color="text-blue-400" />
            <InputGroup label="로스컷 (최대 손실)" defaultValue="-2,000,000" color="text-red-400" />
            
            <div className="col-span-1 sm:col-span-2 border-t border-zinc-800 pt-6 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <InputGroup label="최대 마틴 단계" defaultValue="8" type="number" />
              <InputGroup label="1회 최대 베팅액 (원)" defaultValue="2,000,000" />
              <InputGroup label="최대 동시 진행 테이블" defaultValue="1" type="number" />
              <InputGroup label="최대 세션 시간 (분)" defaultValue="90" type="number" />
            </div>
          </div>
        </div>

        {/* Right Summary Panel */}
        <div className="w-full md:w-80 bg-zinc-950 p-6 lg:p-8 border-l border-zinc-800 flex flex-col">
          <div className="hidden md:flex justify-end mb-6">
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <h3 className="text-sm font-bold text-zinc-400 mb-4 flex items-center gap-2">
            <Calculator size={16} />
            설정 요약
          </h3>

          <div className="flex flex-col gap-4 text-sm flex-1">
            <SummaryRow label="목표 시드" value="5,000,000원" valueColor="text-blue-400" />
            <SummaryRow label="강제 종료 시드" value="2,000,000원" valueColor="text-red-400" />
            
            <div className="bg-amber-950/30 border border-amber-900/50 rounded-lg p-4 mt-2">
              <div className="flex items-start gap-2 text-amber-500 mb-2">
                <Info size={16} className="mt-0.5 shrink-0" />
                <span className="font-medium text-sm">마틴 8단계 필요 자금</span>
              </div>
              <div className="text-2xl font-mono font-bold text-amber-400 tracking-tight">
                2,550,000<span className="text-sm font-sans ml-1 text-amber-500/70">원</span>
              </div>
              <p className="text-xs text-amber-500/70 mt-2">
                현재 설정된 시작 시드로 8단계 마틴게일 방어가 가능합니다.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-8">
            <button className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors">
              관찰 모드로 시작
            </button>
            <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-colors shadow-lg shadow-indigo-600/20">
              섀도 모드로 시작 (가상 시뮬레이션)
            </button>
            <button className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-lg font-bold transition-colors">
              세션 시작
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function InputGroup({ label, defaultValue, color = "text-white", type = "text" }: { label: string, defaultValue: string, color?: string, type?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      <input 
        type={type}
        defaultValue={defaultValue}
        className={`bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 font-mono text-sm outline-none focus:border-amber-500 transition-colors ${color}`}
      />
    </div>
  );
}

function SummaryRow({ label, value, valueColor = "text-white" }: { label: string, value: string, valueColor?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-zinc-500">{label}</span>
      <span className={`font-mono font-medium ${valueColor}`}>{value}</span>
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}
