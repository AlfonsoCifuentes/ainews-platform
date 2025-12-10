'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { UserAvatarMenu } from '@/components/layout/UserAvatarMenu';
import { XPAnimator } from '@/components/gamification/XPAnimator';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { Search } from '@/components/search/Search';
import { useUser } from '@/lib/hooks/useUser';
import { useBookMode } from '@/lib/hooks/useBookMode';
import { AuthModalProvider } from '@/components/auth/AuthModalProvider';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Primary navigation items
const NAV_ITEMS: Array<{ key: 'news' | 'courses' | 'coursesLibrary' | 'analytics' | 'chat'; href: string }> = [
  { key: 'news', href: '/news' },
  { key: 'courses', href: '/courses' },
  { key: 'coursesLibrary', href: '/courses-library' },
  { key: 'analytics', href: '/analytics' },
  { key: 'chat', href: '/chat' },
];

export function Header() {
  const t = useTranslations('common.nav');
  const pathname = usePathname();
  const { profile, locale } = useUser();
  const { isBookMode } = useBookMode();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const activeSegment = useMemo(() => {
    if (!pathname) return '';
    const [, maybeLocale, ...segments] = pathname.split('/');
    if (maybeLocale && maybeLocale.length === 2) {
      if (segments.length === 0 || segments[0] === '') return '';
      return segments[0];
    }
    if (pathname === '/' || pathname === '') return '';
    return pathname.split('/')[1] ?? '';
  }, [pathname]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const mapSegmentToKey = (segment: string): string => {
    if (segment === 'courses-library') return 'coursesLibrary';
    return segment;
  };

  const handleLoginClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('request-login', {}));
    closeMobileMenu();
  }, []);

  const handleSignupClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('request-signup', {}));
    closeMobileMenu();
  }, []);

  if (isBookMode) return null;

  return (
    <motion.header 
      className={`fixed top-0 left-0 right-0 z-50 px-2 md:px-4 py-3 transition-all duration-500 ${
        scrolled ? 'bg-black/90 backdrop-blur-lg border-b border-white/5 py-2' : 'bg-transparent'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="w-full flex items-center justify-between gap-3">
        {/* Left: Logo */}
        <Link 
          href="/" 
          className="flex items-center gap-2 shrink-0"
          onClick={closeMobileMenu}
        >
          <div className="relative w-6 h-6">
            <Image
              src="/logos/thotnet-core-white-only.svg"
              alt="ThotNet Core Logo"
              fill
              sizes="24px"
              className="object-contain"
              priority
            />
          </div>
          <span className="font-bold text-base tracking-tight text-white hidden sm:block">THOTNET</span>
        </Link>

        {/* Center: Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-mono uppercase tracking-wider text-[#888]">
          {NAV_ITEMS.map((item) => {
            const isActive = mapSegmentToKey(activeSegment) === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`hover:text-white transition-colors whitespace-nowrap ${isActive ? 'text-white' : ''}`}
              >
                {t(item.key)}
              </Link>
            );
          })}
        </nav>

        {/* Right: Search + Auth + Language */}
        <div className="flex items-center gap-3 shrink-0">
          <Search locale={locale} />
          
          {profile ? (
            <div className="flex items-center gap-2">
              <NotificationBell />
              <UserAvatarMenu profile={profile} locale={locale} />
            </div>
          ) : (
            <button 
              onClick={handleLoginClick}
              className="hidden md:block px-4 py-1.5 border border-white/20 text-white text-[10px] font-mono tracking-widest hover:bg-white hover:text-black transition-all"
            >
              LOGIN
            </button>
          )}
          
          <div className="hidden sm:flex">
            <LanguageSwitcher />
          </div>
          
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-white" />
            ) : (
              <Menu className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* XP Animator */}
      <XPAnimator />

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden mt-4 border-t border-white/10 bg-black/95 backdrop-blur-xl overflow-hidden"
          >
            <nav className="py-4 flex flex-col gap-2">
              {NAV_ITEMS.map((item) => {
                const isActive = mapSegmentToKey(activeSegment) === item.key;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={`px-4 py-3 transition-all ${
                      isActive ? 'text-white font-medium' : 'text-[#888] hover:text-white'
                    }`}
                  >
                    {t(item.key)}
                  </Link>
                );
              })}

              {/* Mobile Language Switcher */}
              <div className="sm:hidden flex items-center justify-between px-4 py-3 mt-2 border-t border-white/10">
                <span className="text-sm text-[#888]">{t('language') || 'Language'}</span>
                <LanguageSwitcher />
              </div>

              {/* Auth on mobile */}
              {!profile && (
                <div className="mt-2 pt-2 border-t border-white/10">
                  <button
                    onClick={handleLoginClick}
                    className="w-full px-4 py-3 text-left text-[#888] hover:text-white transition-colors"
                  >
                    {t('login')}
                  </button>
                  <button
                    onClick={handleSignupClick}
                    className="w-full px-4 py-3 text-left text-[#888] hover:text-white transition-colors"
                  >
                    {t('signup')}
                  </button>
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth Modal Provider */}
      <AuthModalProvider locale={locale} />
    </motion.header>
  );
}
