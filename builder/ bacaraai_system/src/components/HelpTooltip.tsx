import { HelpCircle, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GLOSSARY, type GlossaryTerm } from '../help/glossary';

type HelpTooltipProps = {
  termId?: string;
  label?: string;
  text?: string;
  example?: string;
  className?: string;
};

export default function HelpTooltip({ termId, label, text, example, className = '' }: HelpTooltipProps) {
  const term: GlossaryTerm | undefined = termId
    ? GLOSSARY.find((t) => t.id === termId)
    : undefined;
  const title = label || term?.label || '도움말';
  const body = text || term?.short || '';
  const tipExample = example || term?.example;
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open || !btnRef.current) return;

    const update = () => {
      if (!btnRef.current) return;
      const rect = btnRef.current.getBoundingClientRect();
      const width = 280;
      let left = rect.left + rect.width / 2 - width / 2;
      left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
      setPos({ top: rect.bottom + 8, left });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  if (!body) return null;

  return (
    <span className={`inline-flex items-center align-middle ${className}`}>
      <button
        ref={btnRef}
        type="button"
        aria-label={`${title} 설명`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="p-0.5 rounded text-zinc-500 hover:text-amber-400 hover:bg-zinc-800 transition-colors"
      >
        <HelpCircle size={14} />
      </button>

      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[520]" onClick={() => setOpen(false)} aria-hidden="true" />
            <div
              id={panelId}
              role="dialog"
              className="fixed z-[530] w-[280px] max-w-[calc(100vw-24px)] rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl p-3.5"
              style={{ top: pos.top, left: pos.left }}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-sm font-bold text-amber-400">{title}</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-zinc-500 hover:text-white p-0.5"
                  aria-label="닫기"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">{body}</p>
              {tipExample && (
                <p className="mt-2 text-[11px] text-zinc-500 leading-relaxed border-t border-zinc-800 pt-2">
                  {tipExample}
                </p>
              )}
            </div>
          </>,
          document.body,
        )}
    </span>
  );
}
