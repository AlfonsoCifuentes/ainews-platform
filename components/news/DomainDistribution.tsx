'use client';

import type { DomainDistribution } from '@/lib/types/news-analytics';

interface DomainDistributionProps {
  distribution: DomainDistribution;
  locale: 'en' | 'es';
}

const DOMAIN_CONFIG = {
  cv: {
    emoji: '👁️',
  },
  nlp: {
    emoji: '🧠',
  },
  robotics: {
    emoji: '🤖',
  },
  ethics: {
    emoji: '🛡️',
  },
  tools: {
    emoji: '🔧',
  },
};

export function DomainDistribution({ distribution, locale }: DomainDistributionProps) {
  const t = {
    en: {
      title: 'Domain Focus',
      subtitle: 'AI subdomains this week',
      cv: 'Computer Vision',
      nlp: 'Language Models',
      robotics: 'Robotics',
      ethics: 'Ethics & Policy',
      tools: 'Tools & Infra',
    },
    es: {
      title: 'Enfoque por Dominio',
      subtitle: 'Subdominios IA esta semana',
      cv: 'Visión Artificial',
      nlp: 'Modelos de Lenguaje',
      robotics: 'Robótica',
      ethics: 'Ética y Políticas',
      tools: 'Herramientas e Infra',
    },
  };

  const texts = t[locale];

  // Sort domains by percentage (descending)
  const sortedDomains = Object.entries(distribution)
    .sort(([, a], [, b]) => b - a)
    .filter(([, percentage]) => percentage > 0);

  return (
    <div className="w-full h-full border border-[#1F1F1F] bg-[#0A0A0A] p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 text-center">
        <h3 className="text-sm font-mono uppercase tracking-widest text-[#EAEAEA] mb-1 flex items-center justify-center gap-2">
          <span className="text-lg">🎯</span>
          {texts.title}
        </h3>
        <p className="text-xs font-mono text-[#888888]">{texts.subtitle}</p>
      </div>

      {/* Domain Cards */}
      <div className="space-y-2">
        {sortedDomains.map(([domain, percentage]) => {
          const config = DOMAIN_CONFIG[domain as keyof DomainDistribution];
          const domainKey = domain as keyof typeof texts;
          const label = texts[domainKey] as string;

          return (
            <div
              key={domain}
              className="border border-[#1F1F1F] bg-[#020309] p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{config.emoji}</span>
                  <span className="text-xs font-mono uppercase tracking-wider text-[#EAEAEA]">
                    {label}
                  </span>
                </div>
                <span className="text-sm font-bold font-mono text-[#EAEAEA]">
                  {percentage}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-[#1F1F1F] overflow-hidden">
                <div
                  style={{ width: `${percentage}%` }}
                  className="h-full bg-[#EAEAEA]"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Note */}
      <div className="mt-4 pt-3 border-t border-[#1F1F1F]">
        <p className="text-[10px] text-center font-mono text-[#888888]">
          {locale === 'en' ? 'Based on last 100 articles' : 'Basado en últimos 100 artículos'}
        </p>
      </div>
    </div>
  );
}
