import { MessageSquare, ArrowRight } from 'lucide-react';
import { PLATFORM_LINKS } from '../constants';

export default function TelegramContact() {
  return (
    <section className="py-24 bg-zinc-950 border-t border-zinc-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-blue-900/40 to-zinc-900 rounded-3xl p-8 md:p-12 text-center border border-blue-500/20 relative overflow-hidden">
          <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1000&q=80" alt="Support" className="absolute inset-0 w-full h-full object-cover opacity-10 mix-blend-overlay pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent opacity-80 pointer-events-none"></div>
          <div className="relative z-10">
            <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              궁금한 점이 있으신가요?
            </h2>
            <p className="text-lg text-blue-200/70 mb-8 max-w-xl mx-auto">
              플랫폼 이용 방법, 기능 문의 등 모든 질문은 텔레그램을 통해 빠르고 정확하게 안내해 드립니다.
            </p>
            
            <a
              href={PLATFORM_LINKS.telegram}
              className="inline-flex justify-center items-center gap-2 px-8 py-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold transition-all hover:scale-105"
            >
              텔레그램 전용 문의하기
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
