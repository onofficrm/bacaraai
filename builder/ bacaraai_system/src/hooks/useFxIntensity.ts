import { useCallback, useEffect, useState } from 'react';

export type FxIntensity = 'low' | 'medium' | 'high';

const KEY = 'bacara_fx_intensity';

function readIntensity(): FxIntensity {
  const raw = localStorage.getItem(KEY);
  if (raw === 'low' || raw === 'medium' || raw === 'high') return raw;
  return 'medium';
}

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function getFxIntensity(): FxIntensity {
  return typeof localStorage !== 'undefined' ? readIntensity() : 'medium';
}

export function setFxIntensity(level: FxIntensity) {
  localStorage.setItem(KEY, level);
  notify();
}

export function useFxIntensity() {
  const [intensity, setLevel] = useState<FxIntensity>(() =>
    typeof localStorage !== 'undefined' ? readIntensity() : 'medium',
  );

  useEffect(() => {
    const sync = () => setLevel(readIntensity());
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);

  const setIntensity = useCallback((level: FxIntensity) => {
    setFxIntensity(level);
    setLevel(level);
  }, []);

  const reduced =
    intensity === 'low' ||
    (typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  return {
    intensity,
    setIntensity,
    reduced,
    /** 파티클·스윕 등 화려함 배율 */
    scale: intensity === 'high' ? 1 : intensity === 'medium' ? 0.7 : 0.35,
    enableRadar: intensity !== 'low',
    enableParticles: intensity === 'high',
  };
}
