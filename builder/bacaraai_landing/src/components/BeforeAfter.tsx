import { motion } from 'motion/react';
import { XCircle, CheckCircle2, TrendingDown, TrendingUp, Brain, Frown } from 'lucide-react';

export default function BeforeAfter() {
  return (
    <section className="py-24 bg-zinc-900 border-t border-zinc-800 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            감각에 의존하던 게임에서<br className="hidden sm:block" />
            <span className="text-amber-500">데이터 기반의 판단</span>으로
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Before */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-zinc-950 border border-red-500/20 rounded-3xl p-8 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl"></div>
            
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                <Frown className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-zinc-300">이전의 방식</h3>
            </div>

            <ul className="space-y-6">
              <li className="flex gap-4">
                <div className="mt-1 flex-shrink-0">
                  <XCircle className="w-5 h-5 text-red-500/70" />
                </div>
                <div>
                  <h4 className="text-white font-medium mb-1">감정에 휘둘리는 베팅</h4>
                  <p className="text-sm text-zinc-500 leading-relaxed">손실이 발생하면 만회하기 위해 충동적으로 금액을 올리거나 계획 없는 마틴게일을 시도합니다.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="mt-1 flex-shrink-0">
                  <XCircle className="w-5 h-5 text-red-500/70" />
                </div>
                <div>
                  <h4 className="text-white font-medium mb-1">제한적인 정보</h4>
                  <p className="text-sm text-zinc-500 leading-relaxed">눈에 보이는 한두 개 테이블의 단순한 줄이나 그림에만 의존하여 위험을 인지하지 못합니다.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="mt-1 flex-shrink-0">
                  <TrendingDown className="w-5 h-5 text-red-500/70" />
                </div>
                <div>
                  <h4 className="text-white font-medium mb-1">지켜지지 않는 원칙</h4>
                  <p className="text-sm text-zinc-500 leading-relaxed">윈컷과 로스컷을 마음속으로 정해두어도, 실제 게임 중에는 쉽게 무시하고 한도를 초과합니다.</p>
                </div>
              </li>
            </ul>
          </motion.div>

          {/* After */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-teal-500/30 rounded-3xl p-8 relative overflow-hidden shadow-[0_0_30px_rgba(20,184,166,0.05)]"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl"></div>
            
            <div className="flex items-center gap-3 mb-8 relative z-10">
              <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center border border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.2)]">
                <Brain className="w-5 h-5 text-teal-400" />
              </div>
              <h3 className="text-xl font-bold text-white">바카라 AI 도우미 활용</h3>
            </div>

            <ul className="space-y-6 relative z-10">
              <li className="flex gap-4">
                <div className="mt-1 flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h4 className="text-teal-50 font-medium mb-1">데이터 기반의 관망</h4>
                  <p className="text-sm text-zinc-400 leading-relaxed">AI가 위험도를 분석하여 불확실한 구간에서는 '관망'을 추천하여 불필요한 손실을 방지합니다.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="mt-1 flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h4 className="text-teal-50 font-medium mb-1">다각도 멀티 분석</h4>
                  <p className="text-sm text-zinc-400 leading-relaxed">8개 테이블을 동시에 관찰하고, 3개의 개별 AI가 서로 다른 관점에서 데이터를 교차 검증합니다.</p>
                </div>
              </li>
              <li className="flex gap-4">
                <div className="mt-1 flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h4 className="text-teal-50 font-medium mb-1">시스템화된 자금 관리</h4>
                  <p className="text-sm text-zinc-400 leading-relaxed">설정된 시드와 손익 한도를 바탕으로 시스템이 지속적으로 위험을 경고하고 안전장치를 제공합니다.</p>
                </div>
              </li>
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
