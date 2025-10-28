'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

const NAV_ITEMS: Array<{ key: 'home' | 'news' | 'bookmarks' | 'courses' | 'trending' | 'kg' | 'about'; href: string }> = [
  { key: 'home', href: '/' },
  { key: 'news', href: '/news' },
  { key: 'bookmarks', href: '/bookmarks' },
  { key: 'courses', href: '/courses' },
  { key: 'trending', href: '/trending' },
  { key: 'kg', href: '/kg' },
  { key: 'about', href: '/about' },
];

export function Header() {
  const t = useTranslations('common.nav');
  const pathname = usePathname();

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

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/40 shadow-[0_10px_35px_rgba(8,8,28,0.45)] backdrop-blur-2xl">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="group flex items-center gap-3 font-semibold text-lg tracking-tight">
          <span className="relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-fuchsia-500 to-cyan-400 text-sm font-bold text-primary-foreground shadow-[0_8px_25px_rgba(104,58,255,0.55)] transition-transform group-hover:scale-105">
            AI
          </span>
          <span className="hidden sm:inline text-base font-semibold uppercase tracking-[0.35rem] text-muted-foreground transition-colors group-hover:text-white">
            AINEWS
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSegment === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`relative px-1 transition-colors duration-300 ${
                  isActive
                    ? 'text-white'
                    : 'text-muted-foreground hover:text-white'
                }`}
              >
                {t(item.key)}
                {isActive ? (
                  <span className="absolute inset-x-0 -bottom-2 h-0.5 rounded-full bg-gradient-to-r from-primary via-fuchsia-500 to-cyan-400" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
