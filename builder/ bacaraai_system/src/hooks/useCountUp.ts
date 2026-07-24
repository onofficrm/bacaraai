import { useEffect, useRef, useState } from 'react';

/**
 * 목표값까지 ease-out 카운트업 (0 → target).
 * reduced / 비활성 시 즉시 목표값.
 */
export function useCountUp(
  target: number,
  opts?: {
    enabled?: boolean;
    durationMs?: number;
    /** 값이 바뀌면 애니메이션 재시작 */
    runKey?: string | number;
  },
): number {
  const enabled = opts?.enabled !== false;
  const durationMs = opts?.durationMs ?? 700;
  const runKey = opts?.runKey ?? target;
  const [value, setValue] = useState(enabled ? 0 : target);

  useEffect(() => {
    if (!enabled) {
      setValue(target);
      return;
    }
    const from = 0;
    const start = performance.now();
    let raf = 0;
    setValue(from);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled, target, durationMs, runKey]);

  return value;
}

/**
 * 이전 값에서 새 값으로 보간 (잔액·손익 갱신용).
 */
export function useCountTo(
  target: number,
  opts?: {
    enabled?: boolean;
    durationMs?: number;
  },
): number {
  const enabled = opts?.enabled !== false;
  const durationMs = opts?.durationMs ?? 750;
  const [value, setValue] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    if (!enabled) {
      prevRef.current = target;
      setValue(target);
      return;
    }
    if (target === prevRef.current) return;
    const from = prevRef.current;
    prevRef.current = target;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, enabled, durationMs]);

  return value;
}
