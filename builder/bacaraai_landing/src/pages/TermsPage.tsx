import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-8 md:p-12">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </Link>
        <h1 className="text-3xl font-bold text-white mb-8">이용약관</h1>
        <div className="prose prose-invert prose-zinc max-w-none text-zinc-400">
          <p>
            바카라 AI 도우미 플랫폼 (이하 "서비스") 이용약관입니다. 본 약관은 서비스의 이용조건 및 절차 등에 관한 사항을 규정함을 목적으로 합니다.
          </p>
          <h2 className="text-xl font-bold text-white mt-8 mb-4">1. 책임의 한계</h2>
          <p>
            서비스는 데이터 분석 및 사용자 설정 기반의 참고 정보를 제공할 뿐이며, 어떠한 경우에도 게임의 결과나 금전적 수익을 보장하지 않습니다. 사용자는 서비스가 제공하는 정보를 바탕으로 본인의 책임 하에 최종 판단을 내려야 합니다.
          </p>
          <h2 className="text-xl font-bold text-white mt-8 mb-4">2. 서비스의 성격</h2>
          <p>
            본 서비스는 통계 정보, AI 분석 의견, 백테스트 도구를 제공하는 분석 소프트웨어입니다. 자동 베팅 기능이나 특정 카지노 사이트 연동 기능은 지원하지 않으며, 사행성을 조장하지 않습니다.
          </p>
          <h2 className="text-xl font-bold text-white mt-8 mb-4">3. 계정 및 권한</h2>
          <p>
            본 서비스의 계정은 별도의 텔레그램 문의를 통해 발급됩니다. 사용자는 자신의 계정 정보를 안전하게 관리해야 하며, 타인에게 양도하거나 대여할 수 없습니다.
          </p>
          <p className="mt-8 text-sm">
            최종 수정일: 2023년 10월 25일
          </p>
        </div>
      </div>
    </div>
  );
}
