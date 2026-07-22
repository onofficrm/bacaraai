import { ArrowRight, MessageSquare, Play } from 'lucide-react';
import { PLATFORM_LINKS } from '../constants';
import DashboardMockup from './DashboardMockup';
import { motion } from 'motion/react';
import {
  usePlatformEntryHref,
  usePlatformEntryLabel,
} from '../hooks/usePlatformAuth';

export default function Hero() {
  const entryHref = usePlatformEntryHref();
  const entryLabel = usePlatformEntryLabel('플랫폼 로그인', '플랫폼 입장');

  return (
    <section id="hero" className="relative pt-24 pb-20 lg:pt-32 lg:pb-32 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/20 to-transparent blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Text Content */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center text-center lg:items-start lg:text-left"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/50 border border-zinc-700/50 text-xs font-medium text-amber-400 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              GPT · Gemini · Claude 멀티 AI 분석
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-6 leading-snug">
              <span className="block">감으로만 판단하던 게임을</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">
                AI와 데이터로 다시 바라보다
              </span>
            </h1>
            
            <p className="text-lg text-zinc-400 mb-4 max-w-2xl">
              GPT, Gemini, Claude가 8개 테이블의 진행 상황과 누적 데이터를 분석하고, 사용자 규칙과 시드·윈컷·로스컷을 기준으로 판단을 돕습니다.
            </p>
            
            <p className="text-sm text-zinc-500 mb-8 max-w-2xl leading-relaxed bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
              결과를 예언하거나 수익을 보장하는 프로그램이 아닙니다. 여러 AI의 의견과 데이터, 사용자 규칙 및 위험 상태를 한 화면에서 확인하는 게임 분석 도우미입니다.
            </p>

            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-4">
              <a
                href={entryHref}
                className="inline-flex justify-center items-center gap-2 px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition-all hover:scale-105 active:scale-95"
              >
                {entryLabel}
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href={PLATFORM_LINKS.telegram}
                className="inline-flex justify-center items-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-all"
              >
                <MessageSquare className="w-4 h-4 text-zinc-400" />
                텔레그램으로 문의
              </a>
              <a
                href={PLATFORM_LINKS.latestVideo}
                className="inline-flex justify-center items-center gap-2 px-6 py-3.5 rounded-xl border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-medium transition-all"
              >
                <Play className="w-4 h-4 text-red-500" />
                실전 영상 보기
              </a>
            </div>
          </motion.div>

          {/* Visualization */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-full relative"
          >
            <div className="absolute -top-12 -right-12 w-[110%] h-[120%] rounded-3xl overflow-hidden opacity-30 hidden lg:block pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-l from-transparent to-zinc-950 z-10"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent z-10"></div>
              <img 
                src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1000&q=80" 
                alt="Focused user analyzing data" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="relative z-20">
              <DashboardMockup />
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
