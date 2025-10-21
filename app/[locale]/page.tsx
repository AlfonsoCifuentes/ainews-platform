"use client";

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n';

export default function HomePage() {
  const t = useTranslations('home');

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 py-20 px-4 md:py-32">
        <div className="container mx-auto text-center text-white">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in">
            {t('hero.title')}
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-2xl mx-auto">
            {t('hero.subtitle')}
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/news"
              className="px-8 py-3 bg-white text-blue-600 rounded-full font-semibold hover:scale-105 transition-transform"
            >
              {t('hero.cta')}
            </Link>
            <Link
              href="/courses"
              className="px-8 py-3 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-full font-semibold hover:scale-105 transition-transform"
            >
              {t('hero.ctaSecondary')}
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              {t('features.title')}
            </h2>
            <p className="text-xl text-muted-foreground">
              {t('features.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="glass p-8 rounded-3xl hover:scale-105 transition-transform">
              <div className="text-4xl mb-4">📰</div>
              <h3 className="text-2xl font-bold mb-4">
                {t('features.news.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('features.news.description')}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass p-8 rounded-3xl hover:scale-105 transition-transform">
              <div className="text-4xl mb-4">🎓</div>
              <h3 className="text-2xl font-bold mb-4">
                {t('features.courses.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('features.courses.description')}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass p-8 rounded-3xl hover:scale-105 transition-transform">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-2xl font-bold mb-4">
                {t('features.learning.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('features.learning.description')}
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
