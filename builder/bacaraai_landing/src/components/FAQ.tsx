import { motion } from 'motion/react';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: "무조건 수익이 보장되나요?",
      a: "아니요, 결과를 보장하지 않습니다. AI Baccarat Assistant는 데이터를 분석하고 위험을 관리하도록 돕는 보조 도구입니다. 최종 판단은 사용자에게 있습니다."
    },
    {
      q: "어떤 AI 모델을 사용하나요?",
      a: "OpenAI의 GPT, Google의 Gemini, Anthropic의 Claude 모델을 동시에 활용하여 동일한 데이터를 각기 다른 관점에서 분석합니다."
    },
    {
      q: "실제 카지노 사이트와 연동되나요?",
      a: "아니요. 본 서비스는 자동 베팅 기능이나 특정 사이트 연동 기능을 제공하지 않습니다. 독립적인 데이터 분석 대시보드입니다."
    },
    {
      q: "모바일에서도 사용할 수 있나요?",
      a: "네, PC, 태블릿, 모바일 기기에 최적화된 반응형 웹으로 제공되어 어디서나 편리하게 모니터링할 수 있습니다."
    }
  ];

  return (
    <section id="faq" className="py-24 bg-zinc-900 border-t border-zinc-800">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            자주 묻는 질문
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden"
            >
              <button 
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="font-medium text-white">{faq.q}</span>
                <ChevronDown className={`w-5 h-5 text-zinc-500 transition-transform ${openIdx === idx ? 'rotate-180' : ''}`} />
              </button>
              {openIdx === idx && (
                <div className="px-6 pb-6 text-zinc-400 leading-relaxed">
                  {faq.a}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
