import { ArrowRight, Play, MessageSquare } from 'lucide-react';
import { PLATFORM_LINKS } from '../constants';

export default function FirstCTA() {
  return (
    <section className="py-20 border-t border-zinc-900 bg-zinc-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-zinc-900 rounded-3xl p-8 md:p-12 text-center border border-zinc-800 shadow-2xl relative overflow-hidden">
          {/* Subtle background element */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
              AI와 데이터가 실제 판단 과정에서<br className="hidden sm:block" />
              어떻게 활용되는지 확인하세요.
            </h2>
            
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <a
                href={PLATFORM_LINKS.login}
                className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition-all"
              >
                플랫폼 화면 보기
                <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href={PLATFORM_LINKS.latestVideo}
                className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium border border-zinc-700 transition-all"
              >
                <Play className="w-4 h-4 text-red-500" />
                유튜브 실전 기록
              </a>
              <a
                href={PLATFORM_LINKS.telegram}
                className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 text-zinc-300 font-medium border border-zinc-800 transition-all"
              >
                <MessageSquare className="w-4 h-4 text-zinc-400" />
                텔레그램 문의
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
