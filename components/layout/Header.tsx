'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { UserAvatarMenu } from '@/components/layout/UserAvatarMenu';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { Search } from '@/components/search/Search';
import { useUser } from '@/lib/hooks/useUser';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Primary navigation items (always visible in navbar)
const NAV_ITEMS: Array<{ key: 'news' | 'courses' | 'chat'; href: string }> = [
  { key: 'news', href: '/news' },
  { key: 'courses', href: '/courses' },
  { key: 'chat', href: '/chat' },
];

export function Header() {
  const t = useTranslations('common.nav');
  const pathname = usePathname();
  const { profile, locale } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeSegment = useMemo(() => {
    if (!pathname) {
      return '';
    }

    const [, maybeLocale, ...segments] = pathname.split('/');
    if (maybeLocale && maybeLocale.length === 2) {
      if (segments.length === 0 || segments[0] === '') {
        return '';
      }
      return segments[0];
    }

    if (pathname === '/' || pathname === '') {
      return '';
    }

    return pathname.split('/')[1] ?? '';
  }, [pathname]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/40 shadow-[0_10px_35px_rgba(8,8,28,0.45)] backdrop-blur-2xl">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center gap-4">
          {/* Logo & Title - Left Aligned */}
          <Link 
            href="/" 
            className="group flex items-center gap-2 font-semibold text-lg tracking-tight shrink-0"
            onClick={closeMobileMenu}
          >
            <div className="relative w-8 h-8 md:w-10 md:h-10 transition-transform group-hover:scale-105 drop-shadow-[0_0_15px_rgba(104,58,255,0.6)]">
              <Image
                src="/images/ainews-logo.png"
                alt="AINEWS Logo"
                fill
                sizes="40px"
                className="object-contain"
                priority
              />
            </div>
            <span className="text-sm md:text-base font-semibold uppercase tracking-[0.2rem] md:tracking-[0.35rem] text-muted-foreground transition-colors group-hover:text-white">
              AINEWS
            </span>
          </Link>

          {/* Desktop Navigation - Flex Grow */}
          <nav className="hidden lg:flex items-center gap-3 xl:gap-6 text-sm font-medium flex-1">
            {NAV_ITEMS.map((item) => {
              const isActive = activeSegment === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`relative px-3 py-1 transition-colors duration-300 whitespace-nowrap ${
                    isActive
                      ? 'text-white'
                      : 'text-muted-foreground hover:text-white'
                  }`}
                >
                  {t(item.key)}
                  {isActive && (
                    <span className="absolute inset-x-0 -bottom-2 h-0.5 rounded-full bg-gradient-to-r from-primary via-fuchsia-500 to-cyan-400" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Side Actions - Flex Shrink */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Search */}
            <Search locale={locale} />
            
            {/* Language Switcher - Desktop */}
            <div className="hidden sm:flex">
              <LanguageSwitcher />
            </div>
            
            {/* User Menu - Always Show Avatar */}
            {profile ? (
              <div className="flex items-center gap-2">
                <NotificationBell />
                <UserAvatarMenu profile={profile} locale={locale} />
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                {/* Secondary Navigation Dropdown for Non-Authenticated Users */}
                <div className="relative group">
                  <button className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:text-white transition-colors whitespace-nowrap gap-1">
                    {locale === 'en' ? 'More' : 'Más'}
                    <svg className="h-4 w-4 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-56 origin-top-right scale-0 opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
                    <div className="glass rounded-xl border border-white/10 p-2 shadow-xl">
                      <Link href="/bookmarks" className="flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all hover:bg-primary/10">
                        <span className="text-xl">🔖</span>
                        <span className="font-medium text-sm">{locale === 'en' ? 'Saved' : 'Guardados'}</span>
                      </Link>
                      <Link href="/trending" className="flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all hover:bg-primary/10">
                        <span className="text-xl">🔥</span>
                        <span className="font-medium text-sm">{locale === 'en' ? 'Trending' : 'Tendencias'}</span>
                      </Link>
                      <Link href="/kg" className="flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all hover:bg-primary/10">
                        <span className="text-xl">🕸️</span>
                        <span className="font-medium text-sm">{locale === 'en' ? 'Knowledge Graph' : 'Grafo de Conocimiento'}</span>
                      </Link>
                      <Link href="/leaderboard" className="flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all hover:bg-primary/10">
                        <span className="text-xl">🏆</span>
                        <span className="font-medium text-sm">{locale === 'en' ? 'Leaderboard' : 'Clasificación'}</span>
                      </Link>
                    </div>
                  </div>
                </div>
                
                {/* Guest Avatar Menu */}
                <div className="relative group">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-2 backdrop-blur-xl transition-all hover:border-primary/30 hover:bg-black/30"
                  >
                    {/* Guest Avatar */}
                    <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-gradient-to-br from-primary/20 to-purple-600/20">
                      <div className="flex h-full w-full items-center justify-center text-xl font-bold text-primary">
                        👤
                      </div>
                    </div>
                    {/* Dropdown Icon */}
                    <svg
                      className="h-4 w-4 text-muted-foreground transition-transform group-hover:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </motion.button>
                  
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 top-full mt-2 w-56 origin-top-right scale-0 opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
                    <div className="glass rounded-xl border border-white/10 p-2 shadow-xl">
                      <Link
                        href={{ pathname: '/auth', query: { mode: 'signin' } }}
                        className="flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all hover:bg-primary/10 w-full text-left"
                      >
                        <span className="text-xl">🔑</span>
                        <span className="font-medium text-sm">{t('login')}</span>
                      </Link>
                      <Link
                        href={{ pathname: '/auth', query: { mode: 'signup' } }}
                        className="flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all hover:bg-primary/10 w-full text-left"
                      >
                        <span className="text-xl">✨</span>
                        <span className="font-medium text-sm">{t('signup')}</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden border-t border-white/10 bg-black/95 backdrop-blur-xl overflow-hidden"
          >
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-2">
              {NAV_ITEMS.map((item) => {
                const isActive = activeSegment === item.key;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={`px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-primary/20 text-white font-medium'
                        : 'text-muted-foreground hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {t(item.key)}
                  </Link>
                );
              })}

              {/* Secondary Navigation Section */}
              <div className="mt-2 pt-2 border-t border-white/10">
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {locale === 'en' ? 'More' : 'Más'}
                </div>
                <Link
                  href="/bookmarks"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-muted-foreground hover:bg-white/5 hover:text-white"
                >
                  <span className="text-xl">🔖</span>
                  <span>{locale === 'en' ? 'Saved' : 'Guardados'}</span>
                </Link>
                <Link
                  href="/trending"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-muted-foreground hover:bg-white/5 hover:text-white"
                >
                  <span className="text-xl">🔥</span>
                  <span>{locale === 'en' ? 'Trending' : 'Tendencias'}</span>
                </Link>
                <Link
                  href="/kg"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-muted-foreground hover:bg-white/5 hover:text-white"
                >
                  <span className="text-xl">🕸️</span>
                  <span>{locale === 'en' ? 'Knowledge Graph' : 'Grafo de Conocimiento'}</span>
                </Link>
                <Link
                  href="/leaderboard"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-muted-foreground hover:bg-white/5 hover:text-white"
                >
                  <span className="text-xl">🏆</span>
                  <span>{locale === 'en' ? 'Leaderboard' : 'Clasificación'}</span>
                </Link>
              </div>

              {/* Mobile-only settings */}
              <div className="sm:hidden flex items-center justify-between px-4 py-3 mt-2 border-t border-white/10">
                <span className="text-sm text-muted-foreground">{t('language') || 'Language'}</span>
                <LanguageSwitcher />
              </div>

              {/* Auth section on mobile (when not logged in) */}
              {!profile && (
                <div className="md:hidden mt-2 pt-2 border-t border-white/10">
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {locale === 'en' ? 'Account' : 'Cuenta'}
                  </div>
                  <Link
                    href={{ pathname: '/auth', query: { mode: 'signin' } }}
                    onClick={closeMobileMenu}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-muted-foreground hover:bg-white/5 hover:text-white w-full text-left"
                  >
                    <span className="text-xl">🔑</span>
                    <span>{t('login')}</span>
                  </Link>
                  <Link
                    href={{ pathname: '/auth', query: { mode: 'signup' } }}
                    onClick={closeMobileMenu}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-muted-foreground hover:bg-white/5 hover:text-white w-full text-left"
                  >
                    <span className="text-xl">✨</span>
                    <span>{t('signup')}</span>
                  </Link>
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
