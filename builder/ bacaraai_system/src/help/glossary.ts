import type { AiOpinion, TableStatus } from '../types';

export type GlossaryTerm = {
  id: string;
  label: string;
  short: string;
  example?: string;
};

export const GLOSSARY: GlossaryTerm[] = [
  {
    id: 'seed',
    label: '시드',
    short: '오늘 연습에 사용할 가상 게임머니입니다. 실제 돈이 아닙니다.',
    example: '예: 시드 400만원이면 그 금액 안에서만 시뮬레이션합니다.',
  },
  {
    id: 'wincut',
    label: '윈컷',
    short: '목표 수익에 도달하면 세션을 멈추는 기준입니다.',
    example: '예: 윈컷 +100만원이면 그만큼 수익 나면 종료를 권합니다.',
  },
  {
    id: 'losscut',
    label: '로스컷',
    short: '손실이 한도에 닿으면 강제 중단하는 안전장치입니다.',
    example: '예: 로스컷 -200만원이면 그 이상 손실 시 중단합니다.',
  },
  {
    id: 'martin',
    label: '마틴',
    short: '손실 후 다음 참고 금액이 커지는 단계입니다. 위험이 커질 수 있습니다.',
    example: '예: 2/8단계는 최대 8단계 중 2번째라는 뜻입니다.',
  },
  {
    id: 'consensus',
    label: '일치도',
    short: 'GPT·Gemini·Claude 중 몇 개가 같은 의견인지 보여줍니다.',
    example: '예: 2/3이면 3개 중 2개가 같은 쪽을 참고 의견으로 제시한 상태입니다.',
  },
  {
    id: 'virtual-money',
    label: '가상머니',
    short: '관리자가 지급한 연습용 시드입니다. 실제 결제가 아닙니다.',
    example: '잔액이 부족하면 관리자에게 추가 지급을 요청하세요.',
  },
];

export const SCREEN_HELP: Record<string, { title: string; body: string }> = {
  multitable: {
    title: '라이브 테이블',
    body: '여러 테이블 중 지금 주목할 곳을 빠르게 찾는 화면입니다. 카드를 누르면 AI 의견을 자세히 볼 수 있습니다.',
  },
  lab: {
    title: '규칙 연구실',
    body: '내 판단 기준을 만들고, 과거 데이터로 테스트해 보는 곳입니다. 초보자는 샘플 규칙부터 살펴보세요.',
  },
  insight: {
    title: '데이터 및 기록',
    body: '지난 선택이 좋았는지 복습하는 화면입니다. 손익·규칙·패턴을 함께 확인하세요.',
  },
  settings: {
    title: '설정',
    body: '시드·윈컷·로스컷 같은 안전장치와 초보자 모드를 정하는 곳입니다.',
  },
  help: {
    title: '도움말',
    body: '처음 사용하는 법, 용어 설명, 안전하게 쓰는 법을 모아 둔 가이드입니다.',
  },
};

export const STATUS_GUIDE: Record<
  TableStatus | string,
  { label: string; tip: string }
> = {
  observing: {
    label: '관찰 중',
    tip: '아직 베팅하지 말고 흐름만 보는 상태입니다.',
  },
  analyzing: {
    label: 'AI 분석 중',
    tip: 'AI들이 데이터를 확인하는 중입니다. 결과가 나올 때까지 기다려 주세요.',
  },
  rule_triggered: {
    label: '규칙 발동',
    tip: '설정한 조건에 맞는 상황이 감지되었습니다. 참고 의견을 확인하세요.',
  },
  waiting_user: {
    label: '사용자 확인 대기',
    tip: '시스템이 참고 의견을 제시했습니다. 최종 판단은 사용자에게 있습니다.',
  },
  checking_result: {
    label: '결과 확인 중',
    tip: '직전 선택의 결과를 반영하는 중입니다.',
  },
  paused: {
    label: '일시 정지',
    tip: '세션이 잠시 멈춘 상태입니다.',
  },
  error: {
    label: '오류',
    tip: '데이터에 문제가 있습니다. 관망하거나 다른 테이블을 보세요.',
  },
  risk_blocked: {
    label: '위험 차단',
    tip: '로스컷·마틴 단계 때문에 지금은 쉬는 것을 권장합니다.',
  },
  betting: {
    label: '베팅 구간',
    tip: '베팅 마감 전입니다. 참고 금액과 남은 시간을 확인하세요.',
  },
  waiting: {
    label: '대기',
    tip: '다음 회차를 기다리는 상태입니다.',
  },
};

export function getOpinionGuide(opinion: AiOpinion, consensus?: string): {
  title: string;
  action: string;
  tone: 'info' | 'warn' | 'danger' | 'ok';
} {
  const match = consensus || '';

  switch (opinion) {
    case 'PLAYER':
      return {
        title: `AI 참고 의견: Player`,
        action: match
          ? `일치도 ${match}입니다. 결과를 보장하지 않으니 소액만 참고하세요.`
          : 'Player를 참고 의견으로 제시했습니다. 무리하지 말고 소액만 참고하세요.',
        tone: 'ok',
      };
    case 'BANKER':
      return {
        title: `AI 참고 의견: Banker`,
        action: match
          ? `일치도 ${match}입니다. 결과를 보장하지 않으니 소액만 참고하세요.`
          : 'Banker를 참고 의견으로 제시했습니다. 무리하지 말고 소액만 참고하세요.',
        tone: 'ok',
      };
    case 'WAIT':
      return {
        title: '관망 권장',
        action: '데이터가 충분하지 않거나 확신이 낮습니다. 이번 회차는 쉬는 것을 권장합니다.',
        tone: 'info',
      };
    case 'SKIP':
      return {
        title: '건너뛰기 권장',
        action: '조건이 맞지 않습니다. 참여하지 말고 다음 기회를 기다리세요.',
        tone: 'info',
      };
    case 'PAUSE':
      return {
        title: '일시 중단',
        action: '지금은 판단하기 어렵습니다. 잠시 멈추고 상황을 다시 보세요.',
        tone: 'warn',
      };
    case 'STOP':
      return {
        title: '세션 중단 권장',
        action: '위험 한도 또는 세션 기준에 가까워졌습니다. 중단을 권장합니다.',
        tone: 'danger',
      };
    case 'ERROR':
    case 'DATA_ERROR':
      return {
        title: '데이터 오류',
        action: '화면 인식/데이터에 문제가 있습니다. 이 테이블은 건너뛰세요.',
        tone: 'danger',
      };
    default:
      return {
        title: '참고 정보',
        action: 'AI 의견은 보조 자료일 뿐이며 최종 판단은 사용자에게 있습니다.',
        tone: 'info',
      };
  }
}

export const BEGINNER_FLOW = [
  { step: 1, title: '테이블 선택', desc: '관심 있는 테이블 카드를 누릅니다.' },
  { step: 2, title: 'AI 의견 확인', desc: 'GPT·Gemini·Claude와 일치도를 봅니다.' },
  { step: 3, title: '참고 금액 확인', desc: '시드·마틴·로스컷을 기준으로 금액을 확인합니다.' },
  { step: 4, title: '기록·복습', desc: '선택 후 결과와 손익을 기록에서 복습합니다.' },
];
