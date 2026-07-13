import { Shuffle, TrendingUp, DollarSign, Target, ClipboardList, Frown } from 'lucide-react';
import { motion } from 'motion/react';

export default function Problems() {
  const problems = [
    {
      icon: Shuffle,
      text: '여러 테이블 중 어디를 먼저 봐야 할지 모르겠다',
    },
    {
      icon: TrendingUp,
      text: '연속 결과가 나오면 따라갈지 반대로 갈지 고민된다',
    },
    {
      icon: DollarSign,
      text: '손실 후 다음 금액을 얼마로 설정해야 할지 어렵다',
    },
    {
      icon: Target,
      text: '윈컷과 로스컷을 설정해도 실제로 지키기 어렵다',
    },
    {
      icon: ClipboardList,
      text: '내가 만든 규칙이 실제로 유효한지 확인하기 어렵다',
    },
    {
      icon: Frown,
      text: '감정적으로 금액을 변경하거나 손실을 추격하게 된다',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section className="py-24 bg-zinc-950 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center gap-8 mb-16">
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              게임을 하면서 가장 어려운 것은<br className="hidden md:block" />
              <span className="text-amber-500">결과보다 판단</span>입니다.
            </h2>
            <p className="text-lg text-zinc-400 max-w-xl mx-auto md:mx-0">
              매 순간 달라지는 상황 속에서 객관성을 유지하는 것은 쉽지 않습니다. 감정에 휘둘리지 않는 데이터 기반의 기준이 필요합니다.
            </p>
          </div>
          <div className="w-full md:w-1/3 aspect-[21/9] md:aspect-[4/3] rounded-2xl overflow-hidden relative border border-zinc-800">
            <div className="absolute inset-0 bg-gradient-to-tr from-zinc-950 via-zinc-950/40 to-transparent z-10"></div>
            <img src="https://images.unsplash.com/photo-1528716321680-815a8cdb8cbe?auto=format&fit=crop&w=800&q=80" alt="고민하는 사용자" className="w-full h-full object-cover opacity-60" />
          </div>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
        >
          {problems.map((prob, idx) => {
            const Icon = prob.icon;
            return (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:bg-zinc-800/50 transition-colors"
              >
                <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-zinc-400" />
                </div>
                <p className="text-zinc-300 font-medium leading-relaxed">
                  {prob.text}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="text-center bg-amber-500/10 border border-amber-500/20 rounded-2xl p-8">
          <p className="text-lg text-amber-200/90 font-medium">
            바카라 AI 도우미는 사용자의 판단 과정과 규칙, 금액 및 위험 상태를 기록하고 분석하도록 설계되었습니다.
          </p>
        </div>
      </div>
    </section>
  );
}
