import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, LayoutDashboard, Settings, AlertTriangle, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartSetup: () => void;
}

export default function OnboardingModal({ isOpen, onClose, onStartSetup }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  if (!isOpen) return null;

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleStartSetup = () => {
    onClose();
    onStartSetup();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors z-10"
        >
          <X size={20} />
        </button>

        <div className="p-8 pb-6 flex-1 flex flex-col items-center text-center min-h-[300px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center gap-6"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <LayoutDashboard size={32} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-100 mb-3">AI 게임 분석 도우미에 오신 것을 환영합니다.</h2>
                  <p className="text-sm text-zinc-400 leading-relaxed max-w-sm">
                    여러 테이블의 결과와 사용자 규칙, AI 분석 의견, 시드와 위험 상태를 한 화면에서 확인할 수 있습니다.
                  </p>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center gap-6 w-full"
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Settings size={32} />
                </div>
                <div className="w-full">
                  <h2 className="text-xl font-bold text-zinc-100 mb-3">먼저 세션 기준을 설정하세요.</h2>
                  <div className="grid grid-cols-2 gap-3 text-left w-full mt-4">
                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                      <span className="text-xs text-zinc-500 block mb-1">시작 시드</span>
                      <span className="text-sm font-bold text-zinc-200">1,000,000</span>
                    </div>
                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                      <span className="text-xs text-zinc-500 block mb-1">초기 금액</span>
                      <span className="text-sm font-bold text-zinc-200">10,000</span>
                    </div>
                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                      <span className="text-xs text-emerald-500 block mb-1">윈컷 (목표)</span>
                      <span className="text-sm font-bold text-emerald-400">+500,000</span>
                    </div>
                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                      <span className="text-xs text-red-500 block mb-1">로스컷 (위험)</span>
                      <span className="text-sm font-bold text-red-400">-300,000</span>
                    </div>
                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                      <span className="text-xs text-zinc-500 block mb-1">최대 단계</span>
                      <span className="text-sm font-bold text-zinc-200">8단계</span>
                    </div>
                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                      <span className="text-xs text-zinc-500 block mb-1">최대 이용 시간</span>
                      <span className="text-sm font-bold text-zinc-200">2시간</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center gap-6"
              >
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <AlertTriangle size={32} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-100 mb-3">AI 의견은 참고 자료입니다.</h2>
                  <p className="text-sm text-zinc-400 leading-relaxed max-w-sm">
                    AI 의견 일치도와 과거 패턴 출현 빈도는 다음 결과를 보장하지 않습니다.
                  </p>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center gap-6"
              >
                <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
                  <ShieldAlert size={32} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-100 mb-3">관망과 위험 차단도 중요한 결과입니다.</h2>
                  <p className="text-sm text-zinc-400 leading-relaxed max-w-sm">
                    데이터가 부족하거나 위험 한도가 부족한 경우 시스템은 참여 대신 관망 또는 중단을 표시합니다.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 pt-0 flex flex-col gap-4">
          <div className="flex justify-center gap-1.5 mb-2">
            {[1, 2, 3, 4].map(i => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${step === i ? 'w-6 bg-blue-500' : 'w-2 bg-zinc-700'}`}
              ></div>
            ))}
          </div>

          <div className="flex gap-3 w-full">
            {step > 1 ? (
              <button 
                onClick={prevStep}
                className="px-4 py-3 rounded-lg font-medium text-sm text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors flex-1"
              >
                이전
              </button>
            ) : (
              <button 
                onClick={onClose}
                className="px-4 py-3 rounded-lg font-medium text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors flex-1"
              >
                온보딩 건너뛰기
              </button>
            )}

            {step < totalSteps ? (
              <button 
                onClick={nextStep}
                className="px-4 py-3 rounded-lg font-bold text-sm text-white bg-blue-600 hover:bg-blue-500 transition-colors flex-1 flex items-center justify-center gap-1"
              >
                다음
              </button>
            ) : (
              <button 
                onClick={handleStartSetup}
                className="px-4 py-3 rounded-lg font-bold text-sm text-white bg-blue-600 hover:bg-blue-500 transition-colors flex-[2] flex items-center justify-center gap-1"
              >
                세션 설정 시작
              </button>
            )}
          </div>
          
          {step === totalSteps && (
            <button 
              onClick={onClose}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              데모로 둘러보기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
