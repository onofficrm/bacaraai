import { useEffect, useState } from 'react';

/** Tailwind `md` = 768px — 이하면 1열 컴팩트 카드 */
const COMPACT_MQ = '(max-width: 767px)';

export default function useCompactLayout() {
  const [compact, setCompact] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(COMPACT_MQ).matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(COMPACT_MQ);
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return compact;
}
