'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n';
import { useBookMode } from '@/lib/hooks/useBookMode';
import Image from 'next/image';

export function Footer() {
  const t = useTranslations();
  const { isBookMode } = useBookMode();

  if (isBookMode) return null;

  return (
    <footer className="bg-black pt-24 pb-12 border-t border-[#1F1F1F] relative z-20">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-24">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="relative w-8 h-8">
                <Image
                  src="/logos/thotnet-core-white-only.svg"
                  alt="ThotNet Core Logo"
                  fill
                  sizes="32px"
                  className="object-contain"
                />
              </div>
              <span className="font-bold text-xl tracking-tighter text-white">THOTNET</span>
            </div>
            <p className="text-[#888] text-sm leading-relaxed max-w-xs">
              {t('common.footer.builtWith')}
            </p>
          </div>
          
          <div>
            <h4 className="text-white font-bold mb-6">PLATFORM</h4>
            <ul className="space-y-4 text-sm text-[#888]">
              <li>
                <Link href="/news" className="hover:text-white transition-colors">
                  {t('common.nav.news')}
                </Link>
              </li>
              <li>
                <Link href="/courses" className="hover:text-white transition-colors">
                  {t('common.nav.courses')}
                </Link>
              </li>
              <li>
                <Link href="/kg" className="hover:text-white transition-colors">
                  Knowledge Graph
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">LEGAL</h4>
            <ul className="space-y-4 text-sm text-[#888]">
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  {t('common.footer.privacyPolicy')}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  {t('common.footer.termsOfService')}
                </Link>
              </li>
              <li>
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      // Prefer Google Privacy & Messaging (Funding Choices) revocation.
                      // Per Google docs, the supported way is to use the callbackQueue.
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
                  {t('gdpr.cookieSettings')}
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
            © {new Date().getFullYear()} ThotNet Core. All Systems Operational.
          </p>
          <p className="text-xs text-[#888] font-mono mt-4 md:mt-0">
            DESIGNED BY ALFONSO CIFUENTES
          </p>
        </div>
      </div>
    </footer>
  );
}
