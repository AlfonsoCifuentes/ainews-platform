'use client';

import { useMemo, useState, useEffect, useId } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { Search } from '@/components/search/Search';
import { SITE_SHORT_NAME } from '@/lib/config/site';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Primary navigation — news-only
const NAV_ITEMS: Array<{ key: 'news' | 'trending' | 'about'; href: string }> = [
  { key: 'news', href: '/news' },
  { key: 'trending', href: '/trending' },
  { key: 'about', href: '/about' },
];

export function Header() {
  const t = useTranslations('common.nav');
  const locale = useLocale();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const mobileMenuId = useId();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [mobileMenuOpen]);

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

  return (
    <motion.header
      className={`no-print fixed top-0 left-0 right-0 z-50 px-3 md:px-6 py-3 transition-all duration-500 ${
        scrolled ? 'bg-black/90 backdrop-blur-lg border-b border-white/5 py-2' : 'bg-transparent'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="w-full flex items-center justify-between gap-3">
        {/* Left: Wordmark */}
        <Link href="/" className="flex items-center gap-2 shrink-0" onClick={closeMobileMenu}>
          <span className="font-black text-lg tracking-tight text-white">
            {SITE_SHORT_NAME}
            <span className="text-[#6366f1]">.</span>
          </span>
        </Link>

        {/* Center: Navigation */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-mono uppercase tracking-wider text-[#888]">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSegment === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`relative hover:text-white transition-colors whitespace-nowrap ${isActive ? 'text-white' : ''}`}
              >
                {t(item.key)}
                {isActive && (
                  <span className="pointer-events-none absolute -bottom-2 left-0 h-px w-full bg-gradient-to-r from-transparent via-white to-transparent" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right: Search + Language */}
        <div className="flex items-center gap-3 shrink-0">
          <Search locale={locale as 'en' | 'es'} />
          <div className="hidden sm:flex">
            <LanguageSwitcher />
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
            aria-controls={mobileMenuId}
            aria-haspopup="menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.button
            key="mobile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 top-[60px] bg-black/65 backdrop-blur-sm md:hidden"
            onClick={closeMobileMenu}
            aria-label={locale === 'en' ? 'Close menu' : 'Cerrar menú'}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            id={mobileMenuId}
            className="relative z-50 md:hidden mt-4 border-t border-white/10 bg-black/95 backdrop-blur-xl overflow-hidden"
          >
            <nav className="py-4 flex flex-col gap-2">
              {NAV_ITEMS.map((item) => {
                const isActive = activeSegment === item.key;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={`px-4 py-3 transition-all ${isActive ? 'text-white font-medium' : 'text-[#888] hover:text-white'}`}
                  >
                    {t(item.key)}
                  </Link>
                );
              })}
              <div className="sm:hidden flex items-center justify-between px-4 py-3 mt-2 border-t border-white/10">
                <span className="text-sm text-[#888]">{locale === 'es' ? 'Idioma' : 'Language'}</span>
                <LanguageSwitcher />
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
