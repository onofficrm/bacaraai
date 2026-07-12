import { useState } from 'react';
import { Eye, EyeOff, LogIn, MessageSquare } from 'lucide-react';
import { PLATFORM_LINKS } from '../constants';

type LoginFormProps = {
  showTelegram?: boolean;
  submitLabel?: string;
};

export default function LoginForm({
  showTelegram = true,
  submitLabel = '플랫폼 로그인',
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={PLATFORM_LINKS.loginCheck} method="post" className="space-y-6">
      <input type="hidden" name="url" value={PLATFORM_LINKS.system} />

      <div className="space-y-2">
        <label htmlFor="mb_id" className="text-sm font-medium text-zinc-300 ml-1">
          아이디
        </label>
        <input
          id="mb_id"
          name="mb_id"
          type="text"
          required
          autoComplete="username"
          placeholder="아이디를 입력하세요"
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="mb_password" className="text-sm font-medium text-zinc-300 ml-1">
          비밀번호
        </label>
        <div className="relative">
          <input
            id="mb_password"
            name="mb_password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            placeholder="비밀번호를 입력하세요"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-4 pr-12 py-3.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            name="auto_login"
            value="1"
            className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500/50 focus:ring-offset-zinc-900"
          />
          <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
            로그인 상태 유지
          </span>
        </label>

        <a
          href={PLATFORM_LINKS.passwordLost}
          className="text-sm text-zinc-500 hover:text-white transition-colors"
        >
          비밀번호 찾기
        </a>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <LogIn className="w-5 h-5" />
          {submitLabel}
        </button>
      </div>

      {showTelegram && (
        <div className="pt-4 border-t border-zinc-800/50">
          <a
            href={PLATFORM_LINKS.telegram}
            className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-3.5 rounded-xl transition-all"
          >
            <MessageSquare className="w-4 h-4 text-zinc-400" />
            텔레그램으로 계정 문의
          </a>
        </div>
      )}
    </form>
  );
}
