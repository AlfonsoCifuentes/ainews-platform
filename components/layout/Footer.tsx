'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n';

const FOOTER_LINKS = [
  { labelKey: 'news', href: '/news' },
  { labelKey: 'courses', href: '/courses' },
  { labelKey: 'about', href: '/about' },
];

export function Footer() {
  const t = useTranslations('common');

  return (
    <footer className="border-t border-border/60 bg-background/80">
      <div className="container py-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-lg font-semibold">AINews</p>
            <p className="text-sm text-muted-foreground">
              {t('footer.builtWith')}
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {FOOTER_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-primary">
                {t(`nav.${link.labelKey}`)}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>{t('footer.copyright')}</p>
          <div className="flex items-center gap-4">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-primary">
              GitHub
            </a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-primary">
              X
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-primary">
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
