import { Play, ExternalLink, MonitorPlay, Youtube } from 'lucide-react';
import { PLATFORM_LINKS } from '../constants';
import { motion } from 'motion/react';

export default function YouTubeRecords() {
  const recentVideos = [
    {
      title: '8개 테이블을 AI가 동시에 분석한 실전 기록',
      date: '2023.10.25',
      tag: '목표 도달',
      tagColor: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
      seed: '4,000,000',
      pnl: '+180,000',
      martin: '3단계',
      wait: '69회',
    },
    {
      title: 'Player 2연속 규칙을 실제 데이터로 검증했습니다',
      date: '2023.10.24',
      tag: '규칙 검증',
      tagColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      seed: '1,000,000',
      pnl: '+50,000',
      martin: '2단계',
      wait: '45회',
    },
    {
      title: 'GPT·Gemini·Claude가 서로 다른 의견을 냈을 때',
      date: '2023.10.23',
      tag: 'AI 의견 불일치',
      tagColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      seed: '2,500,000',
      pnl: '-20,000',
      martin: '4단계',
      wait: '82회',
    },
    {
      title: '윈컷 도달 후 세션을 종료한 기록',
      date: '2023.10.22',
      tag: '손실 한도 종료',
      tagColor: 'text-red-400 bg-red-500/10 border-red-500/20',
      seed: '3,000,000',
      pnl: '-900,000',
      martin: '6단계',
      wait: '30회',
    },
    {
      title: '마틴 단계 증가로 관망을 선택한 세션',
      date: '2023.10.21',
      tag: '관망 중심',
      tagColor: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
      seed: '1,500,000',
      pnl: '-50,000',
      martin: '5단계',
      wait: '112회',
    },
    {
      title: '규칙 백테스트와 실제 결과 비교',
      date: '2023.10.20',
      tag: '섀도 테스트',
      tagColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      seed: '0',
      pnl: '0',
      martin: '-',
      wait: '150회',
    },
  ];

  return (
    <section id="records" className="py-24 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            매일 <span className="text-amber-500">실제 사용 과정</span>을 기록합니다.
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            좋은 결과만 편집하는 것이 아니라 관망, 손실, 중단, 규칙 변경과 위험관리 과정까지 함께 공개합니다.
          </p>
        </div>

        {/* Main Video */}
        <div className="mb-16">
          <div className="relative aspect-video max-w-4xl mx-auto bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl flex flex-col items-center justify-center group">
            <img src="https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=1200&q=80" alt="Recording setup" className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-900/80 to-transparent"></div>
            
            <div className="absolute top-4 left-4 flex gap-2 z-10">
              <span className="px-3 py-1 text-xs font-medium bg-red-500 text-white rounded">데모 영상</span>
            </div>

            <div className="relative z-10 flex flex-col items-center p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.3)] group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 text-white ml-1" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">AI 바카라 분석 도우미 실전 기록 – 오늘의 세션</h3>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8">
            <a href={PLATFORM_LINKS.latestVideo} className="inline-flex justify-center items-center gap-2 px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors w-full sm:w-auto">
              <Play className="w-4 h-4" />
              영상 재생
            </a>
            <a href={PLATFORM_LINKS.youtube} className="inline-flex justify-center items-center gap-2 px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium border border-zinc-700 transition-colors w-full sm:w-auto">
              <Youtube className="w-4 h-4 text-red-500" />
              유튜브에서 보기
            </a>
            <a href={PLATFORM_LINKS.login} className="inline-flex justify-center items-center gap-2 px-6 py-3 rounded-xl bg-zinc-950 hover:bg-zinc-900 text-zinc-300 font-medium border border-zinc-800 transition-colors w-full sm:w-auto">
              <MonitorPlay className="w-4 h-4" />
              플랫폼 화면 보기
            </a>
          </div>
        </div>

        {/* Recent Video Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {recentVideos.map((video, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              viewport={{ once: true }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden flex flex-col group relative"
            >
              <div className="h-40 bg-zinc-800 relative flex items-center justify-center overflow-hidden">
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur rounded text-[10px] font-medium text-white border border-white/10 z-10">
                  데모 영상 카드
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-xs font-mono text-white z-10">
                  12:45
                </div>
                <Youtube className="w-12 h-12 text-zinc-700 group-hover:text-red-500/50 transition-colors" />
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-zinc-500">{video.date}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${video.tagColor}`}>
                    {video.tag}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-white mb-4 line-clamp-2 leading-relaxed">
                  {video.title}
                </h4>
                
                <div className="mt-auto grid grid-cols-2 gap-2 text-xs font-mono mb-4">
                  <div className="bg-zinc-950 p-2 rounded border border-zinc-800">
                    <div className="text-zinc-500 mb-1">시작 시드</div>
                    <div className="text-zinc-300">{video.seed}</div>
                  </div>
                  <div className="bg-zinc-950 p-2 rounded border border-zinc-800">
                    <div className="text-zinc-500 mb-1">최종 손익</div>
                    <div className={`${video.pnl.startsWith('+') ? 'text-teal-400' : video.pnl === '0' ? 'text-zinc-300' : 'text-red-400'}`}>
                      {video.pnl}
                    </div>
                  </div>
                  <div className="bg-zinc-950 p-2 rounded border border-zinc-800">
                    <div className="text-zinc-500 mb-1">최고 마틴</div>
                    <div className="text-zinc-300">{video.martin}</div>
                  </div>
                  <div className="bg-zinc-950 p-2 rounded border border-zinc-800">
                    <div className="text-zinc-500 mb-1">관망 횟수</div>
                    <div className="text-amber-400">{video.wait}</div>
                  </div>
                </div>

                <a href={PLATFORM_LINKS.latestVideo} className="flex items-center justify-center gap-2 w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-white font-medium transition-colors">
                  <Play className="w-4 h-4" />
                  영상 보기
                </a>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <a href={PLATFORM_LINKS.youtube} className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-amber-500 hover:text-amber-400 transition-colors">
            유튜브 전체 기록 보기
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
