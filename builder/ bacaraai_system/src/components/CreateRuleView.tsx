import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Save, X, Eye, HelpCircle, Check, Settings2, ShieldAlert, FlaskConical, Play, Database } from 'lucide-react';

interface CreateRuleViewProps {
  onBack: () => void;
}

export default function CreateRuleView({ onBack }: CreateRuleViewProps) {
  const [activeTab, setActiveTab] = useState<'condition' | 'betting' | 'safety'>('condition');

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="flex-none bg-zinc-900 border-b border-zinc-800 p-4 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex flex-col gap-1">
            <button 
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors w-fit mb-1"
            >
              <ArrowLeft size={14} />
              <span>규칙 연구실로 돌아가기</span>
            </button>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-white">새 규칙 만들기</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                초안 작성 중
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-medium">
              발동 조건, 참고 위치, 금액 진행 방식과 안전 조건을 설정하세요.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 mr-2">
            <Check size={14} />
            <span>초안 자동 저장됨 · 방금 전</span>
          </div>
          <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
            <HelpCircle size={18} />
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors">
            <Eye size={16} />
            <span className="hidden sm:inline">미리보기</span>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors">
            <Save size={16} />
            <span className="hidden sm:inline">초안 저장</span>
          </button>
          <button 
            onClick={onBack}
            className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Workspace Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Form Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-zinc-950">
          <div className="max-w-3xl mx-auto flex flex-col gap-8">
            
            {/* Rule Name & Description */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-zinc-400 mb-1.5 block">규칙 이름</label>
                <input 
                  type="text" 
                  placeholder="예: Banker 3연속 꺾기" 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 mb-1.5 block">설명 (선택)</label>
                <textarea 
                  placeholder="이 규칙의 목적과 활용 상황을 메모해 두세요." 
                  className="w-full h-20 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm resize-none"
                ></textarea>
              </div>
            </div>

            {/* Navigation Tabs for settings */}
            <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
              <button 
                onClick={() => setActiveTab('condition')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-colors ${activeTab === 'condition' ? 'bg-zinc-800 text-blue-400 shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Settings2 size={16} />
                발동 조건
              </button>
              <button 
                onClick={() => setActiveTab('betting')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-colors ${activeTab === 'betting' ? 'bg-zinc-800 text-amber-400 shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <Database size={16} />
                금액 진행 (마틴)
              </button>
              <button 
                onClick={() => setActiveTab('safety')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-colors ${activeTab === 'safety' ? 'bg-zinc-800 text-emerald-400 shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <ShieldAlert size={16} />
                안전 조건 (로스컷)
              </button>
            </div>

            {/* Setting Content */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 min-h-[400px]">
              {activeTab === 'condition' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col gap-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                    <div className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center text-blue-400">
                      <span className="font-bold text-xs">1</span>
                    </div>
                    <h3 className="font-bold text-white">어떤 패턴이 나올 때 발동할까요?</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-zinc-400">기준 패턴</label>
                      <select className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-300 outline-none focus:border-blue-500 cursor-pointer">
                        <option>Player 연속 출현</option>
                        <option>Banker 연속 출현</option>
                        <option>P B 퐁당 패턴</option>
                        <option>직접 입력 (고급)</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-zinc-400">연속 횟수</label>
                      <div className="flex items-center gap-2">
                        <input type="number" defaultValue={2} min={1} max={10} className="w-20 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-200 outline-none focus:border-blue-500 text-center" />
                        <span className="text-sm text-zinc-400">회 이상</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pb-2 border-b border-zinc-800 mt-4">
                    <div className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center text-blue-400">
                      <span className="font-bold text-xs">2</span>
                    </div>
                    <h3 className="font-bold text-white">다음 회차의 참고 위치는 어디인가요?</h3>
                  </div>

                  <div className="flex gap-3">
                    <label className="flex-1 cursor-pointer">
                      <input type="radio" name="targetSide" className="peer sr-only" defaultChecked />
                      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 peer-checked:border-blue-500 peer-checked:bg-blue-500/10 transition-colors flex flex-col items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">P</div>
                        <span className="font-bold text-zinc-300">Player</span>
                      </div>
                    </label>
                    <label className="flex-1 cursor-pointer">
                      <input type="radio" name="targetSide" className="peer sr-only" />
                      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 peer-checked:border-red-500 peer-checked:bg-red-500/10 transition-colors flex flex-col items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center font-bold">B</div>
                        <span className="font-bold text-zinc-300">Banker</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {activeTab === 'betting' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col gap-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                    <div className="w-6 h-6 rounded bg-amber-500/20 flex items-center justify-center text-amber-400">
                      <span className="font-bold text-xs">3</span>
                    </div>
                    <h3 className="font-bold text-white">금액 진행 방식 (마틴게일)</h3>
                  </div>

                  <div className="flex flex-col gap-4">
                    <label className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-950 cursor-pointer hover:border-zinc-700">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-zinc-200">고정 금액 (단폴)</span>
                        <span className="text-xs text-zinc-500">실패 시 금액을 올리지 않습니다.</span>
                      </div>
                      <input type="radio" name="betType" className="w-4 h-4 accent-amber-500" />
                    </label>
                    <label className="flex items-center justify-between p-4 rounded-xl border border-amber-500/50 bg-amber-500/5 cursor-pointer">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-amber-400">기본 마틴게일 (2배수)</span>
                        <span className="text-xs text-amber-500/70">실패 시 다음 회차에 2배로 진입합니다.</span>
                      </div>
                      <input type="radio" name="betType" className="w-4 h-4 accent-amber-500" defaultChecked />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-zinc-400">1단계 (초기) 기준 금액</label>
                      <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2">
                        <input type="number" defaultValue={1000} step={1000} className="w-full bg-transparent text-zinc-200 outline-none text-right font-mono font-bold" />
                        <span className="text-zinc-500 font-medium">원</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-medium text-zinc-400">최대 진행 단계 (마틴 한도)</label>
                      <select className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-300 outline-none focus:border-amber-500 cursor-pointer">
                        <option>3단계 (최대 4배)</option>
                        <option>4단계 (최대 8배)</option>
                        <option>5단계 (최대 16배)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'safety' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col gap-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                    <div className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <span className="font-bold text-xs">4</span>
                    </div>
                    <h3 className="font-bold text-white">손실 제한 및 안전 조건</h3>
                  </div>

                  <div className="flex flex-col gap-5">
                    <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-950">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-zinc-200">연속 실패 시 규칙 일시정지</span>
                        <span className="text-xs text-zinc-500">지정된 횟수만큼 연속으로 실패하면 규칙 작동을 멈춥니다.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="number" defaultValue={3} min={1} className="w-16 bg-zinc-900 border border-zinc-700 rounded-md px-2 py-1.5 text-zinc-200 outline-none text-center font-bold" />
                        <span className="text-sm text-zinc-400">회</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-950">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-zinc-200">누적 손실 한도 (로스컷)</span>
                        <span className="text-xs text-zinc-500">이 규칙으로 발생한 누적 손실이 한도를 넘으면 차단됩니다.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="number" defaultValue={50000} step={10000} className="w-24 bg-zinc-900 border border-zinc-700 rounded-md px-2 py-1.5 text-zinc-200 outline-none text-right font-mono font-bold" />
                        <span className="text-sm text-zinc-400">원</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-950 opacity-60">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-zinc-200">AI 합의 조건 (고급)</span>
                        <span className="text-xs text-zinc-500">AI 모델의 의견이 일치할 때만 규칙을 발동합니다.</span>
                      </div>
                      <select className="bg-zinc-900 border border-zinc-700 rounded-md px-2 py-1.5 text-sm text-zinc-300 outline-none" disabled>
                        <option>사용 안 함</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pb-8">
              <button 
                onClick={onBack}
                className="px-6 py-2.5 rounded-lg font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                취소
              </button>
              <button className="px-6 py-2.5 rounded-lg font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 transition-colors flex items-center gap-2">
                <Check size={18} />
                규칙 저장 후 백테스트
              </button>
            </div>

          </div>
        </div>

        {/* Right Panel: Sample Backtest / Simulation Area */}
        <div className="w-full lg:w-80 xl:w-96 border-l border-zinc-800 bg-zinc-900 flex flex-col shrink-0">
          <div className="p-4 border-b border-zinc-800 flex items-center gap-2 text-zinc-200 font-bold bg-zinc-950/50">
            <FlaskConical size={18} className="text-purple-400" />
            <h3>샘플 시뮬레이션 결과</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-3 py-8">
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Play size={20} className="text-purple-400 ml-1" />
              </div>
              <div>
                <p className="font-bold text-zinc-300 mb-1">시뮬레이션을 시작하세요</p>
                <p className="text-xs text-zinc-500 px-4">
                  현재 설정한 조건으로 최근 100개의 슈 데이터 기준 백테스트를 진행합니다.
                </p>
              </div>
              <button className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-purple-900/20">
                백테스트 실행
              </button>
            </div>

            <div className="opacity-30 pointer-events-none">
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-medium text-zinc-400">예상 승률</span>
                  <span className="text-lg font-bold text-emerald-400">54.2%</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden flex">
                  <div className="bg-emerald-500 h-full w-[54%]"></div>
                  <div className="bg-red-500 h-full w-[46%]"></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg flex flex-col gap-1">
                  <span className="text-[10px] text-zinc-500">발동 횟수</span>
                  <span className="text-sm font-bold text-zinc-300">128회</span>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg flex flex-col gap-1">
                  <span className="text-[10px] text-zinc-500">최대 낙폭</span>
                  <span className="text-sm font-bold text-red-400">-4.2%</span>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg flex flex-col gap-1 col-span-2">
                  <span className="text-[10px] text-zinc-500">가상 손익 (1단계 1천원 기준)</span>
                  <span className="text-base font-bold text-emerald-400 font-mono">+ 142,000원</span>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-4">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2 text-xs text-amber-500/90">
                <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                <p>
                  과거 데이터의 시뮬레이션 결과는 다음 게임 결과를 보장하지 않습니다. 실제 게임 적용 전 충분한 섀도 검증을 권장합니다.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
