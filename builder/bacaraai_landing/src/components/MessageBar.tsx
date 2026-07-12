import { CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function MessageBar() {
  const messages = [
    '3개 AI 분석',
    '8개 테이블 관찰',
    '사용자 규칙 엔진',
    '누적 데이터 분석',
    '시드·윈컷·로스컷',
    '전체 게임 기록',
  ];

  return (
    <div className="border-y border-zinc-800/50 bg-zinc-900/20 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4"
        >
          {messages.map((msg, idx) => (
            <div key={idx} className="flex items-center gap-2 text-zinc-300">
              <CheckCircle2 className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">{msg}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
