import { ShieldAlert, Monitor, Bot, Settings, Wallet } from 'lucide-react';
import LoginForm from '../components/LoginForm';
import DashboardMockup from '../components/DashboardMockup';
import { PLATFORM_LINKS } from '../constants';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex font-sans">
      <div className="hidden lg:flex w-[55%] flex-col p-12 border-r border-zinc-900 relative overflow-hidden bg-zinc-950">
        <img
          src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80"
          alt="Platform usage"
          className="absolute inset-0 w-full h-full object-cover opacity-10 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/50 via-zinc-950/80 to-zinc-950 pointer-events-none"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent pointer-events-none"></div>

        <div className="relative z-10 flex-1 flex flex-col max-w-2xl mx-auto w-full">
          <div className="mb-12">
            <a href="/" className="inline-flex items-center gap-2 mb-6 group">
              <div className="p-2 bg-zinc-900 rounded-xl group-hover:bg-zinc-800 transition-colors border border-zinc-800">
                <ShieldAlert className="w-6 h-6 text-amber-500" />
              </div>
              <span className="font-bold text-xl tracking-tight text-white">바카라 AI 도우미</span>
            </a>
            <h1 className="text-3xl font-bold text-white mb-4 leading-tight">
              감으로만 판단하던 게임을<br />
              <span className="text-amber-500">AI와 데이터로 다시 바라보다</span>
            </h1>
            <p className="text-zinc-400 text-lg">
              3개의 AI가 8개 테이블을 동시에 분석하고 사용자 규칙에 따라 판단을 돕습니다.
            </p>
          </div>

          <div className="mb-12 relative w-full aspect-video">
            <div className="absolute inset-0 scale-[0.85] origin-top-left">
              <DashboardMockup />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-auto">
            <div className="flex gap-3">
              <div className="mt-1 p-1.5 bg-zinc-900 rounded-lg text-zinc-400 border border-zinc-800 h-fit">
                <Monitor className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">8개 테이블 모니터링</h4>
                <p className="text-xs text-zinc-500">여러 테이블의 결과를 동시에 추적</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="mt-1 p-1.5 bg-zinc-900 rounded-lg text-zinc-400 border border-zinc-800 h-fit">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">GPT·Gemini·Claude 분석</h4>
                <p className="text-xs text-zinc-500">다양한 관점의 의견과 근거 제공</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="mt-1 p-1.5 bg-zinc-900 rounded-lg text-zinc-400 border border-zinc-800 h-fit">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">사용자 규칙 및 백테스트</h4>
                <p className="text-xs text-zinc-500">나만의 원칙을 시스템에 적용</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="mt-1 p-1.5 bg-zinc-900 rounded-lg text-zinc-400 border border-zinc-800 h-fit">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">시드·윈컷·로스컷 관리</h4>
                <p className="text-xs text-zinc-500">안전한 자금 보호를 위한 안전장치</p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-900 text-xs text-zinc-500 leading-relaxed">
            바카라 AI 도우미는 게임의 결과를 예측하거나 수익을 보장하는 시스템이 아닙니다. 제공되는 AI
            분석과 통계 자료는 참고 정보일 뿐이며, 판단과 책임은 전적으로 사용자에게 있습니다.
          </div>
        </div>
      </div>

      <div className="w-full lg:w-[45%] flex flex-col justify-center p-8 sm:p-12 md:p-24 bg-zinc-950 relative">
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/5 via-zinc-950 to-zinc-950 pointer-events-none"></div>

        <div className="lg:hidden mb-12 flex justify-center">
          <a href="/" className="inline-flex items-center gap-2">
            <div className="p-2 bg-zinc-900 rounded-xl border border-zinc-800">
              <ShieldAlert className="w-6 h-6 text-amber-500" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">바카라 AI 도우미</span>
          </a>
        </div>

        <div className="w-full max-w-md mx-auto relative z-10">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-2xl font-bold text-white mb-2">플랫폼 로그인</h2>
            <p className="text-zinc-400 text-sm">
              로그인 후 AI 분석 시스템으로 이동합니다. 계정이 없다면{' '}
              <a href={PLATFORM_LINKS.register} className="text-amber-500 hover:text-amber-400">
                회원가입
              </a>
              을 진행해 주세요.
            </p>
          </div>

          <LoginForm submitLabel="로그인" showTelegram={true} />
        </div>
      </div>
    </div>
  );
}
