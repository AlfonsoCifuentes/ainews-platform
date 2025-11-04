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

const NAV_ITEMS: Array<{ key: 'home' | 'news' | 'bookmarks' | 'courses' | 'trending' | 'kg' | 'leaderboard'; href: string }> = [
  { key: 'home', href: '/' },
  { key: 'news', href: '/news' },
  { key: 'bookmarks', href: '/bookmarks' },
  { key: 'courses', href: '/courses' },
  { key: 'trending', href: '/trending' },
  { key: 'kg', href: '/kg' },
  { key: 'leaderboard', href: '/leaderboard' },
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
        return 'home';
      }
      return segments[0];
    }

    if (pathname === '/' || pathname === '') {
      return 'home';
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
          <nav className="hidden lg:flex items-center gap-2 xl:gap-4 text-sm font-medium flex-1">
            {NAV_ITEMS.map((item) => {
              const isActive = activeSegment === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`relative px-2 py-1 transition-colors duration-300 whitespace-nowrap ${
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
            
            {/* User Menu */}
            {profile ? (
              <div className="flex items-center gap-2">
                <NotificationBell />
                <UserAvatarMenu profile={profile} locale={locale} />
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/auth"
                  className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:text-white transition-colors whitespace-nowrap"
                >
                  {t('login')}
                </Link>
                <Link
                  href="/auth?tab=signup"
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary to-primary/80 px-3 py-2 text-sm font-medium text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-105 whitespace-nowrap"
                >
                  {t('signup')}
                </Link>
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

              {/* Mobile-only settings */}
              <div className="sm:hidden flex items-center justify-between px-4 py-3 mt-2 border-t border-white/10">
                <span className="text-sm text-muted-foreground">{t('language') || 'Language'}</span>
                <LanguageSwitcher />
              </div>

              {/* Auth buttons on mobile (when not logged in) */}
              {!profile && (
                <div className="md:hidden flex flex-col gap-2 mt-2 pt-2 border-t border-white/10">
                  <Link
                    href="/auth"
                    onClick={closeMobileMenu}
                    className="w-full inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground hover:text-white transition-colors border border-white/10"
                  >
                    {t('login')}
                  </Link>
                  <Link
                    href="/auth?tab=signup"
                    onClick={closeMobileMenu}
                    className="w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary to-primary/80 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-primary/25"
                  >
                    {t('signup')}
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
