import { motion } from 'motion/react';
import { Activity, Bell, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';

const activities = [
  { icon: Activity, text: "AI가 8개 테이블의 새로운 패턴을 분석 중입니다.", color: "text-blue-400" },
  { icon: CheckCircle2, text: "사용자 '위험관리**'님이 설정한 윈컷에 도달하여 세션을 종료했습니다.", color: "text-teal-400" },
  { icon: AlertTriangle, text: "Claude가 테이블 C의 마틴 단계 위험을 경고했습니다.", color: "text-amber-400" },
  { icon: Bell, text: "사용자 규칙 'P 3연속'이 감지되었습니다.", color: "text-purple-400" },
  { icon: Activity, text: "Gemini가 새로운 슈 시작을 감지하여 데이터를 초기화했습니다.", color: "text-blue-400" },
];

export default function LiveActivityTicker() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activities.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full bg-zinc-950/80 border-b border-zinc-800/50 backdrop-blur-sm overflow-hidden py-2.5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-3">
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="text-xs font-bold text-zinc-500 tracking-wider">LIVE</span>
        </div>
        
        <div className="relative flex-1 h-5 overflow-hidden">
          {activities.map((activity, idx) => {
            const Icon = activity.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: currentIndex === idx ? 1 : 0, 
                  y: currentIndex === idx ? 0 : -20 
                }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 flex items-center gap-2"
                style={{ pointerEvents: currentIndex === idx ? 'auto' : 'none' }}
              >
                <Icon className={`w-3.5 h-3.5 ${activity.color}`} />
                <span className="text-xs text-zinc-400 truncate">{activity.text}</span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
