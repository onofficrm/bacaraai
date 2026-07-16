import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import type { AiOpinion } from '../types';
import { getOpinionGuide } from '../help/glossary';

type ActionGuidanceProps = {
  opinion: AiOpinion;
  consensus?: string;
  beginnerMode?: boolean;
};

export default function ActionGuidance({ opinion, consensus, beginnerMode = true }: ActionGuidanceProps) {
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
