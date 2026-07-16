import React, { useState } from 'react';
import {
  X,
  LayoutGrid,
  ListOrdered,
  AlertTriangle,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BEGINNER_FLOW } from '../help/glossary';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartSetup: () => void;
}

export default function OnboardingModal({ isOpen, onClose, onStartSetup }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  if (!isOpen) return null;

  const finish = (startSetup: boolean) => {
    localStorage.setItem('onboardingComplete', 'true');
    onClose();
    if (startSetup) onStartSetup();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col relative">
        <button
          onClick={() => finish(false)}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors z-10"
          aria-label="닫기"
        >
          <X size={20} />
        </button>

        <div className="p-8 pb-6 flex-1 flex flex-col items-center text-center min-h-[340px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center gap-5"
              >
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <LayoutGrid size={32} />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-400 mb-2 tracking-wide">바카라 AI 도우미</p>
                  <h2 className="text-xl font-bold text-zinc-100 mb-3">
                    이 시스템은 예측기가 아니라<br />판단 보조 도구입니다
                  </h2>
                  <p className="text-sm text-zinc-400 leading-relaxed max-w-sm">
                    GPT·Gemini·Claude 의견과 규칙·시드·위험 상태를 한 화면에서 보여줍니다.
                    결과를 보장하지 않으며, 최종 판단은 사용자에게 있습니다.
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
                className="flex flex-col items-center gap-5 w-full"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <ListOrdered size={32} />
                </div>
                <div className="w-full">
                  <h2 className="text-xl font-bold text-zinc-100 mb-4">이렇게 사용하세요</h2>
                  <div className="space-y-2 text-left">
                    {BEGINNER_FLOW.map((item) => (
                      <div
                        key={item.step}
                        className="flex gap-3 items-start bg-zinc-950 border border-zinc-800 rounded-xl p-3"
                      >
                        <span className="text-xs font-bold text-amber-400 mt-0.5 w-10 shrink-0">
                          {item.step}단계
                        </span>
                        <div>
                          <p className="text-sm font-bold text-zinc-100">{item.title}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                    ))}
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
                className="flex flex-col items-center gap-5 w-full"
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Wallet size={32} />
                </div>
                <div className="w-full text-left">
                  <h2 className="text-xl font-bold text-zinc-100 mb-3 text-center">가상머니 = 연습용 시드</h2>
                  <div className="grid gap-2">
                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-sm text-zinc-300">
                      실제 돈이 아닙니다. 관리자가 지급한 금액으로 연습합니다.
                    </div>
                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-sm text-zinc-300">
                      <span className="text-emerald-400 font-bold">윈컷</span>은 목표 수익,
                      <span className="text-red-400 font-bold"> 로스컷</span>은 강제 중단 손실 한도입니다.
                    </div>
                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-sm text-zinc-300">
                      예: 시드 400만원 · 로스컷 -200만원이면 200만원 손실 시 중단을 권합니다.
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center gap-5"
              >
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <AlertTriangle size={32} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-100 mb-3">AI 의견은 참고 자료입니다</h2>
                  <p className="text-sm text-zinc-400 leading-relaxed max-w-sm">
                    일치도 2/3이어도 수익을 보장하지 않습니다.
                    “AI 2개가 Player를 참고로 제시했습니다” 정도의 정보로 이해해 주세요.
                  </p>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center gap-5"
              >
                <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
                  <ShieldAlert size={32} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-100 mb-3">관망과 위험 차단도 결과입니다</h2>
                  <p className="text-sm text-zinc-400 leading-relaxed max-w-sm">
                    데이터가 부족하거나 로스컷·마틴 위험이 크면 시스템은
                    참여 대신 관망/중단을 표시합니다. 쉬는 선택이 안전할 수 있습니다.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 pt-0 flex flex-col gap-4">
          <div className="flex justify-center gap-1.5 mb-2">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === i ? 'w-6 bg-amber-500' : 'w-2 bg-zinc-700'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3 w-full">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-3 rounded-lg font-medium text-sm text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors flex-1"
              >
                이전
              </button>
            ) : (
              <button
                onClick={() => finish(false)}
                className="px-4 py-3 rounded-lg font-medium text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors flex-1"
              >
                건너뛰기
              </button>
            )}

            {step < totalSteps ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-4 py-3 rounded-lg font-bold text-sm text-zinc-950 bg-amber-500 hover:bg-amber-400 transition-colors flex-1"
              >
                다음
              </button>
            ) : (
              <button
                onClick={() => finish(true)}
                className="px-4 py-3 rounded-lg font-bold text-sm text-zinc-950 bg-amber-500 hover:bg-amber-400 transition-colors flex-[2]"
              >
                시작하기
              </button>
            )}
          </div>

          {step === totalSteps && (
            <button
              onClick={() => finish(false)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              데모로 먼저 둘러보기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
