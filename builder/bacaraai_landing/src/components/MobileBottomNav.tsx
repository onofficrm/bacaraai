import { LogIn, MessageSquare, ArrowRight } from 'lucide-react';
import { PLATFORM_LINKS } from '../constants';
import {
  usePlatformAuth,
  usePlatformEntryHref,
  usePlatformEntryLabel,
} from '../hooks/usePlatformAuth';

export default function MobileBottomNav() {
  const { loggedIn } = usePlatformAuth();
  const entryHref = usePlatformEntryHref();
  const entryLabel = usePlatformEntryLabel('로그인', '입장');

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
          href={entryHref}
          className="flex-[2] flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 text-zinc-950 font-bold active:bg-amber-400 transition-colors"
        >
          {loggedIn ? <ArrowRight className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
          <span className="text-sm">{entryLabel}</span>
        </a>
      </div>
    </div>
  );
}
