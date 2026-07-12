import { Menu, X, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { PLATFORM_LINKS } from '../constants';

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: '시스템 소개', href: '#hero' },
    { name: '주요 기능', href: '#features' },
    { name: 'AI 분석', href: '#ai-analysis' },
    { name: '실전 기록', href: '#records' },
    { name: '이용 후기', href: '#reviews' },
    { name: 'FAQ', href: '#faq' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0">
            <a href="#" className="flex items-center gap-2 group">
              <div className="p-1.5 bg-zinc-800 rounded-lg group-hover:bg-zinc-700 transition-colors">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
              </div>
              <span className="font-bold text-lg tracking-tight text-white">
                AI Baccarat Assistant
              </span>
            </a>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href={PLATFORM_LINKS.telegram}
              className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              텔레그램 문의
            </a>
            <a
              href={PLATFORM_LINKS.login}
              className="px-4 py-2 text-sm font-medium text-zinc-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors"
            >
              로그인
            </a>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-zinc-400 hover:text-white focus:outline-none"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-zinc-900 border-b border-zinc-800 absolute w-full">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-zinc-300 hover:text-white hover:bg-zinc-800"
              >
                {link.name}
              </a>
            ))}
            <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-col gap-2">
              <a
                href={PLATFORM_LINKS.telegram}
                className="block w-full text-center px-4 py-2 text-base font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
              >
                텔레그램 문의
              </a>
              <a
                href={PLATFORM_LINKS.login}
                className="block w-full text-center px-4 py-2 text-base font-medium text-zinc-950 bg-amber-500 hover:bg-amber-400 rounded-lg"
              >
                로그인
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
