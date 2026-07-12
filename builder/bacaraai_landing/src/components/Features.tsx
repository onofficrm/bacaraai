import { motion } from 'motion/react';
import { Monitor, Bot, BrainCircuit, Wallet, Settings, FlaskConical, BarChart3, ListChecks } from 'lucide-react';

export default function Features() {
  const features = [
    {
      id: 1,
      title: '8개 테이블 동시 모니터링',
      description: '각 테이블의 Player, Banker, Tie 결과와 현재 흐름을 한 화면에서 확인합니다.',
      icon: Monitor,
      mockup: (
        <div className="grid grid-cols-4 gap-1.5 w-full h-full p-3 opacity-60 group-hover:opacity-100 transition-opacity">
          {Array.from({length: 8}).map((_, i) => (
            <div key={i} className={`rounded-sm border ${i === 2 ? 'bg-red-500/20 border-red-500/50' : 'bg-zinc-800/50 border-zinc-700'}`}></div>
          ))}
        </div>
      )
    },
    {
      id: 2,
      title: '3개 AI 개별 분석',
      description: 'GPT, Gemini, Claude가 동일한 데이터를 각각 검토하고 서로 다른 의견과 근거를 제공합니다.',
      icon: Bot,
      mockup: (
        <div className="flex gap-2 w-full h-full p-4 items-end opacity-60 group-hover:opacity-100 transition-opacity">
          <div className="flex-1 bg-emerald-500/20 border border-emerald-500/30 rounded-t h-[80%]"></div>
          <div className="flex-1 bg-blue-500/20 border border-blue-500/30 rounded-t h-[100%]"></div>
          <div className="flex-1 bg-amber-500/20 border border-amber-500/30 rounded-t h-[60%]"></div>
        </div>
      )
    },
    {
      id: 3,
      title: '최종 참고 의견',
      description: 'AI 의견, 사용자 규칙, 데이터 상태와 위험도를 종합하여 Player, Banker, 관망 또는 중단 상태를 표시합니다.',
      icon: BrainCircuit,
      mockup: (
        <div className="flex flex-col items-center justify-center w-full h-full opacity-60 group-hover:opacity-100 transition-opacity gap-2">
          <div className="w-12 h-12 rounded-full border-[3px] border-amber-500/50 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-amber-500/30"></div>
          </div>
          <div className="w-16 h-1.5 bg-zinc-800 rounded-full"></div>
        </div>
      )
    },
    {
      id: 4,
      title: '추천 금액과 자금관리',
      description: '시드, 윈컷, 로스컷, 현재 마틴 단계와 손실 여유를 기준으로 참고 금액을 확인합니다.',
      icon: Wallet,
      mockup: (
        <div className="flex flex-col justify-center w-full h-full p-4 gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div className="w-[70%] h-full bg-teal-500/50"></div>
          </div>
          <div className="flex justify-between w-full">
            <div className="w-8 h-1.5 bg-zinc-700 rounded-full"></div>
            <div className="w-12 h-1.5 bg-zinc-700 rounded-full"></div>
          </div>
        </div>
      )
    },
    {
      id: 5,
      title: '사용자 규칙 감지',
      description: 'Player 연속, Banker 연속, 특정 배열과 AI 의견 조건 등 사용자가 만든 규칙을 감지합니다.',
      icon: Settings,
      mockup: (
        <div className="flex items-center justify-center w-full h-full gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
          <div className="w-6 h-6 rounded bg-blue-500/20 border border-blue-500/30"></div>
          <div className="w-3 h-0.5 bg-zinc-700"></div>
          <div className="w-6 h-6 rounded bg-red-500/20 border border-red-500/30"></div>
          <div className="w-3 h-0.5 bg-zinc-700"></div>
          <div className="w-6 h-6 rounded bg-green-500/20 border border-green-500/30"></div>
        </div>
      )
    },
    {
      id: 6,
      title: '규칙 연구실',
      description: '규칙을 직접 만들고 과거 데이터로 백테스트한 뒤 섀도 모드에서 가상 검증할 수 있습니다.',
      icon: FlaskConical,
      mockup: (
        <div className="flex items-center justify-center w-full h-full p-4 opacity-60 group-hover:opacity-100 transition-opacity relative">
          <svg className="w-full h-12 text-zinc-700" viewBox="0 0 100 40" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M0,20 L20,10 L40,30 L60,15 L80,25 L100,5" />
          </svg>
          <div className="absolute right-4 top-4 w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"></div>
        </div>
      )
    },
    {
      id: 7,
      title: '데이터 인사이트',
      description: '그동안 쌓인 게임 데이터, 반복 패턴, 유사 상황과 다음 결과 분포를 확인합니다.',
      icon: BarChart3,
      mockup: (
        <div className="flex flex-col justify-end w-full h-full p-4 gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
          {[60, 80, 40, 90, 50].map((width, i) => (
            <div key={i} className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
               <div className="h-full bg-zinc-600" style={{ width: `${width}%` }}></div>
            </div>
          ))}
        </div>
      )
    },
    {
      id: 8,
      title: '전체 판단 기록',
      description: 'AI 의견, 사용자 선택, 금액, 게임 결과, 손익과 마틴 단계 변화를 기록합니다.',
      icon: ListChecks,
      mockup: (
        <div className="flex flex-col w-full h-full p-3 gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity overflow-hidden">
          {Array.from({length: 4}).map((_, i) => (
            <div key={i} className="flex items-center gap-2 w-full p-1.5 bg-zinc-800/30 rounded border border-zinc-800/50">
              <div className="w-2 h-2 rounded-full bg-zinc-600"></div>
              <div className="h-1.5 bg-zinc-700 rounded-full flex-1"></div>
            </div>
          ))}
        </div>
      )
    },
  ];

  return (
    <section id="features" className="py-24 bg-zinc-900 border-t border-zinc-800 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            AI Baccarat Assistant로 <span className="text-amber-500">할 수 있는 일</span>
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            게임 결과만 보여주는 것이 아니라 AI 분석, 사용자 규칙, 데이터와 위험 상태를 함께 확인합니다.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                viewport={{ once: true, margin: "-50px" }}
                className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 hover:border-amber-500/30 transition-colors group flex flex-col"
              >
                {/* Mini Mockup Area */}
                <div className="h-32 w-full bg-zinc-900 rounded-xl mb-6 border border-zinc-800/50 flex items-center justify-center overflow-hidden relative">
                   <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:opacity-0 transition-opacity duration-300">
                     <Icon className="w-12 h-12 text-white" />
                   </div>
                   {feature.mockup}
                </div>

                <h3 className="text-lg font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed mt-auto">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
