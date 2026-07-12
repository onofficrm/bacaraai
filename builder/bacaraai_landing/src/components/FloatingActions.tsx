import { motion, useScroll, useSpring } from 'motion/react';
import { ArrowUp, MessageSquare, LogIn } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PLATFORM_LINKS } from '../constants';

export default function FloatingActions() {
  const [isVisible, setIsVisible] = useState(false);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 500) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Top Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-amber-500 transform origin-left z-[60]"
        style={{ scaleX }}
      />

      {/* Desktop Floating Action Button */}
      <div className={`hidden md:flex fixed bottom-8 right-8 flex-col gap-3 z-50 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
        
        <a 
          href={PLATFORM_LINKS.telegram}
          className="w-12 h-12 bg-blue-500 hover:bg-blue-400 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 group relative"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="absolute right-full mr-3 bg-zinc-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity pointer-events-none border border-zinc-800">
            텔레그램 문의
          </span>
        </a>
        
        <a 
          href={PLATFORM_LINKS.login}
          className="w-12 h-12 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 group relative"
        >
          <LogIn className="w-5 h-5" />
          <span className="absolute right-full mr-3 bg-zinc-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity pointer-events-none border border-zinc-800">
            플랫폼 로그인
          </span>
        </a>

        <button 
          onClick={scrollToTop}
          className="w-12 h-12 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 group relative border border-zinc-700"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      </div>
    </>
  );
}
