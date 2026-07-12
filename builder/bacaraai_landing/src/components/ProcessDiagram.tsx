import { motion } from 'motion/react';
import { Database, CheckCircle, Settings, BrainCircuit, ShieldAlert, ArrowDown, ListChecks } from 'lucide-react';

export default function ProcessDiagram() {
  const steps = [
    { name: '게임 데이터 수집', icon: Database, img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=150&q=80' },
    { name: '결과 검증', icon: CheckCircle },
    { name: '사용자 규칙 감지', icon: Settings, img: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=150&q=80' },
    { name: 'GPT·Gemini·Claude 분석', icon: BrainCircuit, img: 'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?auto=format&fit=crop&w=150&q=80' },
    { name: '시드·윈컷·로스컷 검사', icon: ShieldAlert, img: 'https://images.unsplash.com/photo-1528716321680-815a8cdb8cbe?auto=format&fit=crop&w=150&q=80' },
    { name: '최종 참고 의견', icon: CheckCircle, highlight: true },
    { name: '사용자 최종 결정', icon: CheckCircle, highlight: true, accent: true, img: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=150&q=80' },
    { name: '결과 기록', icon: ListChecks },
  ];

  return (
    <section className="py-24 bg-zinc-900 border-t border-zinc-800 relative overflow-hidden">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            AI 판단 과정
          </h2>
        </div>

        <div className="relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-zinc-800 -translate-x-1/2"></div>
          
          <div className="space-y-4 relative z-10">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isHighlight = step.highlight;
              const isAccent = step.accent;

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  viewport={{ once: true, margin: "-50px" }}
                  className="flex flex-col items-center"
                >
                  <div 
                    className={`flex items-center gap-4 p-3 pr-6 rounded-2xl border backdrop-blur-sm w-full sm:w-2/3 max-w-sm overflow-hidden relative
                      ${isAccent 
                        ? 'bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
                        : isHighlight 
                          ? 'bg-zinc-800 border-zinc-700' 
                          : 'bg-zinc-950 border-zinc-800'
                      }`}
                  >
                    {step.img && (
                      <div className="absolute right-0 top-0 bottom-0 w-24 opacity-20 pointer-events-none">
                        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 to-transparent z-10"></div>
                        <img src={step.img} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className={`p-2 rounded-lg relative z-10 ${isAccent ? 'bg-amber-500/20' : 'bg-zinc-800'}`}>
                      <Icon className={`w-5 h-5 ${isAccent ? 'text-amber-400' : 'text-zinc-400'}`} />
                    </div>
                    <span className={`font-medium relative z-10 ${isAccent ? 'text-amber-400 font-bold' : isHighlight ? 'text-white' : 'text-zinc-300'}`}>
                      {step.name}
                    </span>
                  </div>
                  
                  {idx < steps.length - 1 && (
                    <div className="mt-4 text-zinc-700">
                      <ArrowDown className="w-5 h-5" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
