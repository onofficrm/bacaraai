import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Info, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import type { AiOpinion } from '../types';
import { getOpinionGuide } from '../help/glossary';

type ActionGuidanceProps = {
  opinion: AiOpinion;
  consensus?: string;
  beginnerMode?: boolean;
  /** One-line by default; expand for full copy */
  compact?: boolean;
};

export default function ActionGuidance({
  opinion,
  consensus,
  beginnerMode = true,
  compact = false,
}: ActionGuidanceProps) {
  const [open, setOpen] = useState(false);
  if (!beginnerMode) return null;

  const guide = getOpinionGuide(opinion, consensus);
  const toneClass =
    guide.tone === 'ok'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : guide.tone === 'warn'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
        : guide.tone === 'danger'
          ? 'border-red-500/30 bg-red-500/10 text-red-300'
          : 'border-blue-500/30 bg-blue-500/10 text-blue-300';

  const Icon =
    guide.tone === 'ok'
      ? CheckCircle2
      : guide.tone === 'warn'
        ? AlertTriangle
        : guide.tone === 'danger'
          ? ShieldAlert
          : Info;

  if (compact) {
    return (
      <div className={`rounded-lg border px-3 py-2 ${toneClass}`}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-2 text-left"
        >
          <Icon size={14} className="shrink-0" />
          <p className="text-xs font-bold flex-1 truncate">{guide.title}</p>
          <span className="text-[11px] text-zinc-400 truncate max-w-[45%]">{guide.action}</span>
          {open ? <ChevronUp size={14} className="shrink-0 opacity-70" /> : <ChevronDown size={14} className="shrink-0 opacity-70" />}
        </button>
        {open && (
          <div className="mt-2 pt-2 border-t border-white/10">
            <p className="text-xs leading-relaxed text-zinc-200">{guide.action}</p>
            <p className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">
              AI 의견은 참고 자료이며 수익을 보장하지 않습니다. 최종 판단과 책임은 사용자에게 있습니다.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border px-3.5 py-3 ${toneClass}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={15} />
        <p className="text-sm font-bold">{guide.title}</p>
      </div>
      <p className="text-xs leading-relaxed opacity-95 text-zinc-200">{guide.action}</p>
      <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">
        AI 의견은 참고 자료이며 수익을 보장하지 않습니다. 최종 판단과 책임은 사용자에게 있습니다.
      </p>
    </div>
  );
}
