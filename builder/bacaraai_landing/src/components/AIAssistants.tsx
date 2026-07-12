import { motion } from 'motion/react';
import { Database, Eye, ShieldAlert, Info } from 'lucide-react';

export default function AIAssistants() {
  const assistants = [
    {
      name: 'GPT',
      role: '데이터 분석가',
      icon: Database,
      color: 'from-emerald-500/20 to-emerald-500/5',
      iconColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/20',
      tasks: [
        '최근 결과 요약',
        '사용자 규칙 검토',
        '유사 상황 분석',
        '현재 의견의 근거 설명',
        '과거 데이터 비교',
      ]
    },
    {
      name: 'Gemini',
      role: '실시간 관찰자',
      icon: Eye,
      color: 'from-blue-500/20 to-blue-500/5',
      iconColor: 'text-blue-400',
      borderColor: 'border-blue-500/20',
      tasks: [
        '테이블 화면 변화 감지',
        '게임 진행 상태 확인',
        '결과와 마감 시간 확인',
        '새로운 슈 감지',
        '화면 데이터 상태 점검',
      ]
    },
    {
      name: 'Claude',
      role: '위험관리 검토자',
      icon: ShieldAlert,
      color: 'from-amber-500/20 to-amber-500/5',
      iconColor: 'text-amber-400',
      borderColor: 'border-amber-500/20',
      tasks: [
        '로스컷 상태 검토',
        '마틴 고단계 위험 확인',
        '표본 부족과 과도한 조건 경고',
        '관망과 중단 필요성 검토',
        '무리한 금액 증가 점검',
      ]
    }
  ];

  return (
    <section id="ai-analysis" className="py-24 bg-zinc-950 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 items-center gap-12 mb-16">
          <div className="text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              세 개의 AI는 <span className="text-amber-500">서로 다른 역할</span>을 담당합니다.
            </h2>
            <p className="text-lg text-zinc-400">
              혼자서 모든 데이터를 파악할 필요가 없습니다. 데이터 분석, 실시간 관찰, 위험 관리라는 각기 다른 시선으로 당신의 판단을 돕습니다.
            </p>
          </div>
          <div className="relative h-48 md:h-64 rounded-2xl overflow-hidden border border-zinc-800">
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-transparent to-transparent z-10"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent z-10"></div>
            <img src="https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?auto=format&fit=crop&w=800&q=80" alt="AI 의견을 검토하는 사용자" className="w-full h-full object-cover opacity-70" />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {assistants.map((ai, idx) => {
            const Icon = ai.icon;
            return (
              <motion.div
                key={ai.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true, margin: "-50px" }}
                className={`bg-zinc-900/50 border ${ai.borderColor} rounded-2xl p-8 flex flex-col relative overflow-hidden group`}
              >
                <div className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-b ${ai.color} opacity-50 pointer-events-none`}></div>
                
                <div className="relative z-10 flex items-center gap-4 mb-8">
                  <div className={`w-12 h-12 rounded-xl bg-zinc-950 border ${ai.borderColor} flex items-center justify-center shadow-lg`}>
                    <Icon className={`w-6 h-6 ${ai.iconColor}`} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">{ai.name}</h3>
                    <p className={`text-sm font-medium ${ai.iconColor}`}>{ai.role}</p>
                  </div>
                </div>

                <ul className="relative z-10 space-y-4 flex-1">
                  {ai.tasks.map((task, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${ai.iconColor}`}></div>
                      <span className="text-zinc-300 leading-relaxed">{task}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-start gap-4 max-w-3xl mx-auto">
          <Info className="w-5 h-5 text-zinc-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-zinc-400 leading-relaxed">
            세 AI의 의견이 같더라도 게임 결과가 보장되는 것은 아닙니다. AI 의견 일치도는 실제 승리 확률과 다른 정보입니다.
          </p>
        </div>
      </div>
    </section>
  );
}
