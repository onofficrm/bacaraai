import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function FooterDisclaimer() {
  return (
    <footer className="bg-zinc-950 border-t border-zinc-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-500" />
            <span className="font-bold text-xl text-white">바카라 AI 도우미</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <Link to="/terms" className="hover:text-zinc-300">이용약관</Link>
            <Link to="/privacy" className="hover:text-zinc-300">개인정보처리방침</Link>
          </div>
        </div>
        
        <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
          <h4 className="text-sm font-bold text-zinc-400 mb-2">책임 있는 이용 안내</h4>
          <p className="text-xs text-zinc-500 leading-relaxed">
            바카라 AI 도우미는 게임의 결과를 예측하거나 수익을 보장하는 시스템이 아닙니다. 
            제공되는 AI 분석과 통계 자료는 과거의 데이터와 설정된 규칙에 기반한 참고 정보일 뿐이며, 이를 활용한 모든 판단과 그로 인해 발생하는 금전적 결과에 대한 책임은 전적으로 사용자 본인에게 있습니다. 
            감정에 치우치지 않는 안전한 자금 관리와 본인만의 철저한 원칙 내에서만 보조 도구로 활용하시기 바랍니다.
          </p>
        </div>
        
        <div className="text-center text-xs text-zinc-600 mt-8">
          &copy; {new Date().getFullYear()} 바카라 AI 도우미. All rights reserved. (Demo Landing Page)
        </div>
      </div>
    </footer>
  );
}
