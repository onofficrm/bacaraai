import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-8 md:p-12">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </Link>
        <h1 className="text-3xl font-bold text-white mb-8">개인정보처리방침</h1>
        <div className="prose prose-invert prose-zinc max-w-none text-zinc-400">
          <p>
            AI Baccarat Assistant는 사용자의 개인정보 보호를 중요하게 생각하며, 관련 법령을 준수하기 위해 최선을 다하고 있습니다.
          </p>
          <h2 className="text-xl font-bold text-white mt-8 mb-4">1. 수집하는 개인정보 항목</h2>
          <p>
            원활한 서비스 제공을 위해 최소한의 개인정보만을 수집합니다. 수집 항목: 로그인 아이디(이메일 형태 포함), 접속 IP, 쿠키, 서비스 이용 기록(검색, 설정 규칙 등).
          </p>
          <h2 className="text-xl font-bold text-white mt-8 mb-4">2. 개인정보의 수집 및 이용 목적</h2>
          <p>
            수집된 개인정보는 서비스 로그인 유지, 사용자 맞춤형 규칙(백테스트, 알림 조건) 저장, 서비스 부정 이용 방지 및 통계 분석 목적으로만 활용됩니다.
          </p>
          <h2 className="text-xl font-bold text-white mt-8 mb-4">3. 개인정보의 보유 및 이용 기간</h2>
          <p>
            원칙적으로 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 부정 이용 방지를 위해 필요한 경우 일정 기간 동안 보관할 수 있습니다.
          </p>
          <p className="mt-8 text-sm">
            최종 수정일: 2023년 10월 25일
          </p>
        </div>
      </div>
    </div>
  );
}
