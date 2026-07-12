import { Check, X } from 'lucide-react';
import { motion } from 'motion/react';

export default function TargetAudience() {
  return (
    <section className="py-24 bg-zinc-900 border-t border-zinc-800">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            이런 분들을 위한 <span className="text-amber-500">시스템</span>입니다.
          </h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-zinc-950 border border-teal-500/20 rounded-2xl p-8"
          >
            <h3 className="text-xl font-bold text-teal-400 mb-6 flex items-center gap-2">
              <Check className="w-6 h-6" />
              이런 분들에게 추천합니다
            </h3>
            <ul className="space-y-4 text-zinc-300">
              <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 flex-shrink-0" />자신의 규칙이 확실하지만 관리가 어려운 분</li>
              <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 flex-shrink-0" />자주 윈컷/로스컷을 어기고 뇌동매매를 하시는 분</li>
              <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 flex-shrink-0" />여러 테이블을 동시에 모니터링하기 힘든 분</li>
              <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-2 flex-shrink-0" />과거 데이터로 전략을 검증(백테스트)하고 싶은 분</li>
            </ul>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-zinc-950 border border-red-500/20 rounded-2xl p-8"
          >
            <h3 className="text-xl font-bold text-red-400 mb-6 flex items-center gap-2">
              <X className="w-6 h-6" />
              이런 분들은 사용하지 마세요
            </h3>
            <ul className="space-y-4 text-zinc-300">
              <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />100% 승리나 수익 보장을 기대하시는 분</li>
              <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />아무런 본인 원칙 없이 AI 의견에만 맹신하는 분</li>
              <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />여윳돈이 아닌 생활비나 빚으로 게임하시는 분</li>
              <li className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />자동 베팅 프로그램을 찾고 계신 분</li>
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
