'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n';
import Image from 'next/image';

const FOOTER_LINKS = [
  { labelKey: 'news', href: '/news' },
  { labelKey: 'courses', href: '/courses' },
  { labelKey: 'about', href: '/about' },
];

export function Footer() {
  const t = useTranslations('common');

  return (
    <footer className="border-t border-white/5 bg-black/40 backdrop-blur-2xl">
      <div className="container py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Image 
              src="/images/ainews-logo.png" 
              alt="AINews Logo" 
              width={32}
              height={32}
              className="drop-shadow-[0_0_10px_rgba(104,58,255,0.4)]"
            />
            <div>
              <p className="text-lg font-semibold text-white">AINews</p>
              <p className="text-sm text-muted-foreground">
                {t('footer.builtWith')}
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {FOOTER_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-full px-3 py-1 transition-colors hover:bg-white/10 hover:text-white">
                {t(`nav.${link.labelKey}`)}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>{t('footer.copyright')}</p>
          <div className="flex items-center gap-4">
            <a href="https://github.com" target="_blank" rel="noreferrer" className="transition-colors hover:text-white">
              GitHub
            </a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="transition-colors hover:text-white">
              X
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="transition-colors hover:text-white">
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
