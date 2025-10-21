'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';

const NAV_ITEMS: Array<{ key: 'home' | 'news' | 'courses' | 'about'; href: string }> = [
  { key: 'home', href: '/' },
  { key: 'news', href: '/news' },
  { key: 'courses', href: '/courses' },
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
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/60">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <span className="rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-2 text-white shadow-lg">
            AI
          </span>
          <span className="hidden sm:inline">AINews</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSegment === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`relative transition-colors hover:text-primary ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {t(item.key)}
                {isActive ? (
                  <span className="absolute inset-x-0 -bottom-2 h-0.5 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
