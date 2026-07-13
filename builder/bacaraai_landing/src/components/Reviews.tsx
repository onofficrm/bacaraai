import { motion } from 'motion/react';
import { MessageSquareQuote, Star } from 'lucide-react';

export default function Reviews() {
  const reviews = [
    {
      id: 1,
      text: "처음에는 단순히 결과를 알려주는 프로그램인 줄 알았습니다. 하지만 AI가 여러 관점에서 의견을 내고, 제가 관망해야 할 시점을 정확히 짚어주는 것을 보고 생각이 바뀌었습니다. 무작정 베팅하는 습관이 많이 고쳐졌습니다.",
      author: "데이터 기반 사용자 (데모 후기)",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80"
    },
    {
      id: 2,
      text: "가장 좋았던 점은 '관망'을 추천해준다는 점입니다. 예전에는 연속된 결과가 나오면 무조건 따라가다가 손실을 보는 경우가 많았는데, Claude가 마틴 단계 위험을 경고해주어 멈출 수 있었습니다.",
      author: "위험관리 중시 사용자 (데모 후기)",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80"
    },
    {
      id: 3,
      text: "8개 테이블을 한 화면에서 보면서 사용자 규칙을 모니터링할 수 있다는 것이 혁신적입니다. 내가 정한 조건에 맞는 테이블만 골라서 들어갈 수 있어서 시간이 크게 단축됩니다.",
      author: "시스템 트레이딩 사용자 (데모 후기)",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80"
    },
    {
      id: 4,
      text: "항상 윈컷을 정해두어도 막상 게임 중에는 감정을 제어하지 못하는 게 문제였습니다. 시스템이 로스컷과 마틴 단계를 계속 상기시켜주니 훨씬 이성적으로 접근할 수 있게 되었습니다.",
      author: "마인드 컨트롤 사용자 (데모 후기)",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80"
    },
    {
      id: 5,
      text: "GPT, Gemini, Claude가 동일한 상황을 두고 서로 다른 근거를 제시하는 점이 매우 흥미롭습니다. 맹신하기보다는 저만의 판단 기준을 세우는 데 훌륭한 참고 자료가 됩니다.",
      author: "AI 분석 활용 사용자 (데모 후기)",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80"
    },
    {
      id: 6,
      text: "과거 데이터를 바탕으로 백테스트를 해볼 수 있다는 점이 압도적입니다. 제가 만든 규칙이 정말 효과가 있는지 미리 검증하고 들어갈 수 있어 불안감이 크게 줄었습니다.",
      author: "전략 연구 사용자 (데모 후기)",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
    }
  ];

  return (
    <section id="reviews" className="py-24 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            사용자들의 <span className="text-amber-500">실제 경험</span>
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            바카라 AI 도우미를 활용해 게임 습관을 개선한 사용자들의 이야기입니다.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {reviews.map((review, idx) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 relative"
            >
              <MessageSquareQuote className="w-10 h-10 text-zinc-800 absolute top-6 right-6" />
              <div className="flex gap-1 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-4 h-4 text-amber-500 fill-amber-500" />
                ))}
              </div>
              <p className="text-zinc-300 leading-relaxed mb-6">"{review.text}"</p>
              <div className="flex items-center gap-3">
                <img src={review.avatar} alt="User Avatar" className="w-10 h-10 rounded-full object-cover border border-zinc-700" />
                <div className="text-sm font-medium text-zinc-400">{review.author}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
