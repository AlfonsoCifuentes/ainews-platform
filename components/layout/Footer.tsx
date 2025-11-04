'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n';
import Image from 'next/image';

export function Footer() {
  const t = useTranslations('common');

  return (
    <footer className="border-t border-white/5 bg-black/40 backdrop-blur-2xl">
      <div className="container py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 drop-shadow-[0_0_10px_rgba(104,58,255,0.4)]">
              <Image
                src="/images/ainews-logo.png"
                alt="AINEWS Logo"
                fill
                sizes="32px"
                className="object-contain"
              />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">AINews</p>
              <p className="text-sm text-muted-foreground">
                {t('footer.builtWith')}
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <Link href="/news" className="rounded-full px-3 py-1 transition-colors hover:bg-white/10 hover:text-white">
              {t('nav.news')}
            </Link>
            <Link href="/courses" className="rounded-full px-3 py-1 transition-colors hover:bg-white/10 hover:text-white">
              {t('nav.courses')}
            </Link>
            <Link href="/about" className="rounded-full px-3 py-1 transition-colors hover:bg-white/10 hover:text-white">
              {t('nav.about')}
            </Link>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Alfonso Cifuentes Alonso. Todos los derechos reservados.</p>
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
