import { LogIn, MessageSquare } from 'lucide-react';
import { PLATFORM_LINKS } from '../constants';

export default function MobileBottomNav() {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800 pb-safe">
      <div className="flex p-3 gap-3">
        <a
          href={PLATFORM_LINKS.telegram}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-medium active:bg-zinc-700 transition-colors"
        >
          <MessageSquare className="w-5 h-5 text-zinc-400" />
          <span className="text-sm">문의</span>
        </a>
        <a
          href={PLATFORM_LINKS.login}
          className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 text-zinc-950 font-bold active:bg-amber-400 transition-colors"
        >
          <LogIn className="w-5 h-5" />
          <span className="text-sm">로그인</span>
        </a>
      </div>
    </div>
  );
}
