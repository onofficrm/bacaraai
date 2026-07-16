import { useEffect, useState } from 'react';

const KEY = 'bacara_beginner_mode';

export default function useBeginnerMode() {
  const [enabled, setEnabled] = useState(() => {
    const saved = localStorage.getItem(KEY);
    return saved === null ? true : saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem(KEY, enabled ? 'true' : 'false');
  }, [enabled]);

  return {
    beginnerMode: enabled,
    setBeginnerMode: setEnabled,
    toggleBeginnerMode: () => setEnabled((v) => !v),
  };
}
