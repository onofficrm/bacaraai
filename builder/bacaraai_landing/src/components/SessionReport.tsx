import { motion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';

export default function SessionReport() {
  const stats = [
    { label: '시작 시드', value: '4,000,000원' },
    { label: '종료 자금', value: '4,180,000원' },
    { label: '최종 손익', value: '+180,000원', highlight: true },
    { label: '관찰 회차', value: '86회' },
    { label: '실제 선택', value: '17회' },
    { label: '관망', value: '69회', textAccent: true },
    { label: '최고 마틴', value: '3단계' },
    { label: '최대 낙폭', value: '-120,000원' },
    { label: '종료 사유', value: '윈컷 도달' },
  ];

  return (
    <section className="py-24 bg-zinc-900 border-t border-zinc-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            최종 결과뿐 아니라 <span className="text-amber-500">과정까지 함께 공개</span>합니다.
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            매 세션의 상세한 지표를 기록하여 투명하게 공유합니다.
          </p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-4 right-4 flex items-center gap-1 text-xs font-medium text-teal-400 bg-teal-500/10 px-2 py-1 rounded">
            <CheckCircle2 className="w-3.5 h-3.5" />
            검증된 세션 기록 (샘플)
          </div>

          <div className="mb-8 border-b border-zinc-800 pb-6 mt-4">
            <h3 className="text-xl font-bold text-white">세션 리포트 요약</h3>
            <p className="text-sm text-zinc-500 mt-1">2023년 10월 25일 기록</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {stats.map((stat, idx) => (
              <div key={idx} className={`p-4 rounded-xl border ${stat.highlight ? 'bg-teal-500/10 border-teal-500/30' : 'bg-zinc-900/50 border-zinc-800'}`}>
                <div className="text-sm text-zinc-400 mb-2">{stat.label}</div>
                <div className={`text-xl font-bold font-mono ${
                  stat.highlight ? 'text-teal-400' : stat.textAccent ? 'text-amber-400' : 'text-white'
                }`}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
