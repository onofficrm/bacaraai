/** 로그인 패널용 시뮬레이션 피드 (마케팅·데모, 실제 수익 아님) */

export type SimFeedKind = 'win' | 'wincut' | 'losscut' | 'rule';

export type SimFeedItem = {
  id: string;
  kind: SimFeedKind;
  text: string;
};

const SURNAMES = [
  '김',
  '이',
  '박',
  '최',
  '정',
  '강',
  '조',
  '윤',
  '장',
  '임',
  '한',
  '오',
  '서',
  '신',
  '권',
  '황',
  '안',
  '송',
  '전',
  '홍',
];

const GIVEN = [
  '민',
  '서',
  '지',
  '하',
  '윤',
  '준',
  '우',
  '현',
  '예',
  '수',
  '도',
  '아',
  '연',
  '시',
  '은',
  '재',
  '호',
  '진',
  '유',
  '채',
];

/** 연습머니 현실 구간 (원) */
const WIN_TIERS = [
  80_000, 120_000, 150_000, 180_000, 220_000, 280_000, 320_000, 380_000, 450_000, 520_000, 680_000,
  750_000, 890_000, 1_050_000, 1_240_000, 1_480_000, 1_820_000, 2_150_000,
];

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)]!;
}

function maskName(rand: () => number): string {
  const a = pick(rand, SURNAMES);
  const b = pick(rand, GIVEN);
  // 김민** / 이서** 형태
  return `${a}${b}**`;
}

function formatWon(n: number): string {
  return new Intl.NumberFormat('ko-KR').format(n);
}

function buildLine(rand: () => number, kind: SimFeedKind, lastAmount: number): { text: string; amount: number } {
  const name = maskName(rand);
  let amount = pick(rand, WIN_TIERS);
  // 연속 동일 금액 회피
  if (amount === lastAmount) {
    amount = pick(rand, WIN_TIERS.filter((v) => v !== lastAmount));
  }

  switch (kind) {
    case 'win':
      return {
        amount,
        text: `오늘 ${name}님이 연습머니 ${formatWon(amount)}원을 이겼습니다`,
      };
    case 'wincut':
      return {
        amount,
        text: `${name}님이 윈컷에 도달해 세션을 종료했습니다 (+${formatWon(amount)})`,
      };
    case 'losscut':
      return {
        amount: Math.min(amount, 680_000),
        text: `${name}님이 로스컷으로 손실을 멈췄습니다`,
      };
    case 'rule':
      return {
        amount,
        text: `${name}님의 규칙이 발동되어 참고 베팅이 안내되었습니다`,
      };
  }
}

const KIND_WEIGHTS: SimFeedKind[] = [
  'win',
  'win',
  'win',
  'win',
  'win',
  'wincut',
  'win',
  'losscut',
  'win',
  'rule',
];

/** 시드 기반 고정·재현 가능한 피드 목록 생성 */
export function generateSimWinFeed(count = 28, seed?: number): SimFeedItem[] {
  const daySeed =
    seed ??
    (() => {
      const d = new Date();
      return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    })();
  const rand = mulberry32(daySeed ^ 0xba0a);
  const items: SimFeedItem[] = [];
  let lastAmount = 0;

  for (let i = 0; i < count; i += 1) {
    const kind = pick(rand, KIND_WEIGHTS);
    const { text, amount } = buildLine(rand, kind, lastAmount);
    lastAmount = amount;
    items.push({
      id: `sim-${daySeed}-${i}`,
      kind,
      text,
    });
  }
  return items;
}
