import { useEffect, useState } from 'react';

/** Tailwind `xl` = 1280px — 데스크톱 사이드 패널 기준 */
const DESKTOP_MQ = '(min-width: 1280px)';

export default function useIsDesktopXl() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(DESKTOP_MQ).matches : true,
  );

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return isDesktop;
}
