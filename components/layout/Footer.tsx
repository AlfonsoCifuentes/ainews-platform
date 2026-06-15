'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n';
import { SITE_NAME, SITE_SHORT_NAME } from '@/lib/config/site';

export function Footer() {
  const t = useTranslations();

  return (
    <footer className="no-print bg-black pt-24 pb-12 border-t border-[#1F1F1F] relative z-20">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-24">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="font-black text-2xl tracking-tighter text-white">
                {SITE_SHORT_NAME}
                <span className="text-[#6366f1]">.</span>
              </span>
            </div>
            <p className="text-[#888] text-sm leading-relaxed max-w-xs">
              {t('common.footer.builtWith')}
            </p>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">{t('common.nav.news')}</h4>
            <ul className="space-y-4 text-sm text-[#888]">
              <li>
                <Link href="/news" className="hover:text-white transition-colors">
                  {t('common.nav.news')}
                </Link>
              </li>
              <li>
                <Link href="/trending" className="hover:text-white transition-colors">
                  {t('common.nav.trending')}
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  {t('common.nav.about')}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  {t('common.nav.contact')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">LEGAL</h4>
            <ul className="space-y-4 text-sm text-[#888]">
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors" data-testid="footer-privacy-link">
                  {t('common.footer.privacyPolicy')}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors" data-testid="footer-terms-link">
                  {t('common.footer.termsOfService')}
                </Link>
              </li>
              <li>
                <button
                  data-testid="footer-cookie-settings-button"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const w = window as any;
                      w.googlefc = w.googlefc || {};
                      w.googlefc.callbackQueue = w.googlefc.callbackQueue || [];
                      w.googlefc.callbackQueue.push({
                        CONSENT_API_READY: () => {
                          try {
                            w.googlefc?.showRevocationMessage?.();
                          } catch {
                            // no-op
                          }
                        },
                      });
                    }
                  }}
                  className="hover:text-white cursor-pointer transition-colors text-left"
                >
                  {t('common.footer.cookieSettings')}
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">CONNECT</h4>
            <ul className="space-y-4 text-sm text-[#888]">
              <li>
                <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                  Twitter / X
                </a>
              </li>
              <li>
                <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                  GitHub
                </a>
              </li>
              <li>
                <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/5">
          <p className="text-xs text-[#888] font-mono uppercase tracking-widest">
            © {new Date().getFullYear()} {SITE_NAME}
          </p>
          <p className="text-xs text-[#888] font-mono mt-4 md:mt-0">
            {t('common.nav.news')}
          </p>
        </div>
      </div>
    </footer>
  );
}
