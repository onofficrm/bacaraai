import { Info, X } from 'lucide-react';
import { useState } from 'react';
import { SCREEN_HELP } from '../help/glossary';

type ScreenHelpBannerProps = {
  screen: keyof typeof SCREEN_HELP;
  beginnerMode?: boolean;
};

export default function ScreenHelpBanner({ screen, beginnerMode = true }: ScreenHelpBannerProps) {
  const key = `bacara_help_dismiss_${screen}`;
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(key) === '1');
  const help = SCREEN_HELP[screen];

  if (!beginnerMode || dismissed || !help) return null;

  return (
    <div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 flex gap-3 items-start">
      <Info size={18} className="text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-amber-300 mb-0.5">{help.title}</p>
        <p className="text-xs text-zinc-300 leading-relaxed">{help.body}</p>
      </div>
      <button
        type="button"
        aria-label="안내 닫기"
        className="text-zinc-500 hover:text-white shrink-0"
        onClick={() => {
          localStorage.setItem(key, '1');
          setDismissed(true);
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
