import { MessageSquare, ArrowRight, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import LoginForm from './LoginForm';
import { PLATFORM_LINKS } from '../constants';

export default function LoginSection() {
  return (
    <section className="py-24 bg-zinc-950 border-t border-zinc-900 relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-64 bg-amber-500/5 blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            이미 계정이 있다면 바로 <span className="text-amber-500">로그인</span>하세요.
          </h2>
          <p className="text-lg text-zinc-400">
            AI Baccarat Assistant 플랫폼은 로그인 후 이용할 수 있습니다.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 lg:gap-24 items-center max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 md:p-10 shadow-2xl"
          >
            <LoginForm />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col justify-center relative rounded-3xl overflow-hidden p-8"
          >
            <div className="absolute inset-0 pointer-events-none">
              <img
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80"
                alt="Users working"
                className="w-full h-full object-cover opacity-20"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent"></div>
            </div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6">
                <MessageSquare className="w-8 h-8 text-blue-400" />
              </div>

              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">새로 오셨나요?</h3>

              <p className="text-lg text-zinc-400 mb-8 leading-relaxed">
                회원가입 후 로그인하시면 AI 분석 시스템을 바로 이용할 수 있습니다.
                이용 문의는 텔레그램으로도 가능합니다.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={PLATFORM_LINKS.register}
                  className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition-all hover:scale-105"
                >
                  <UserPlus className="w-5 h-5" />
                  회원가입
                </a>
                <a
                  href={PLATFORM_LINKS.telegram}
                  className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold transition-all hover:scale-105"
                >
                  텔레그램 문의
                  <ArrowRight className="w-5 h-5" />
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
