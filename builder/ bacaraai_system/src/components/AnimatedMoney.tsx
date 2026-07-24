import { formatMoney } from '../hooks/useSession';
import { useCountTo } from '../hooks/useCountUp';
import { useFxIntensity } from '../hooks/useFxIntensity';

type Props = {
  value: number;
  /** 부호 포함 (+/−) */
  withSign?: boolean;
  className?: string;
  /** 수익=골드 / 손실=뮤트 로즈 톤 자동 */
  toneBySign?: boolean;
  durationMs?: number;
  /** 원 단위 생략 (이미 부모가 붙일 때) */
  hideWonSuffix?: boolean;
};

/**
 * 잔액·손익용 프리미엄 카운트 숫자.
 * tabular-nums 고정폭 + 값 변경 시 부드럽게 보간.
 */
export default function AnimatedMoney({
  value,
  withSign = false,
  className = '',
  toneBySign = false,
  durationMs = 750,
}: Props) {
  const { reduced } = useFxIntensity();
  const display = useCountTo(value, { enabled: !reduced, durationMs });

  const tone = toneBySign
    ? display > 0
      ? 'text-amber-300'
      : display < 0
        ? 'text-rose-300/85'
        : 'text-zinc-300'
    : '';

  return (
    <span className={`font-mono tabular-nums ${tone} ${className}`.trim()}>
      {formatMoney(display, withSign)}
    </span>
  );
}
