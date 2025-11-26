'use client';

import { motion } from 'framer-motion';
import type { DomainDistribution } from '@/lib/types/news-analytics';

interface DomainDistributionProps {
  distribution: DomainDistribution;
  locale: 'en' | 'es';
}

const DOMAIN_CONFIG = {
  cv: {
    emoji: '👁️',
    color: 'from-purple-600 to-purple-400',
    bgColor: 'bg-purple-500/20',
    textColor: 'text-purple-400',
  },
  nlp: {
    emoji: '🧠',
    color: 'from-blue-600 to-blue-400',
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-400',
  },
  robotics: {
    emoji: '🤖',
    color: 'from-green-600 to-green-400',
    bgColor: 'bg-green-500/20',
    textColor: 'text-green-400',
  },
  ethics: {
    emoji: '🛡️',
    color: 'from-yellow-600 to-yellow-400',
    bgColor: 'bg-yellow-500/20',
    textColor: 'text-yellow-400',
  },
  tools: {
    emoji: '🔧',
    color: 'from-orange-600 to-orange-400',
    bgColor: 'bg-orange-500/20',
    textColor: 'text-orange-400',
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="w-full h-full bg-gradient-to-b from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700 p-4 md:p-6"
    >
      {/* Header */}
      <div className="mb-4 text-center">
        <h3 className="text-lg md:text-xl font-bold mb-1 flex items-center justify-center gap-2">
          <span className="text-2xl">🎯</span>
          {texts.title}
        </h3>
        <p className="text-xs text-muted-foreground">{texts.subtitle}</p>
      </div>

      {/* Domain Cards */}
      <div className="space-y-2">
        {sortedDomains.map(([domain, percentage], index) => {
          const config = DOMAIN_CONFIG[domain as keyof DomainDistribution];
          const domainKey = domain as keyof typeof texts;
          const label = texts[domainKey] as string;

          return (
            <motion.div
              key={domain}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
              className={`${config.bgColor} rounded-lg p-3 border border-slate-700/50`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{config.emoji}</span>
                  <span className="text-xs md:text-sm font-semibold text-white">
                    {label}
                  </span>
                </div>
                <span className={`text-sm md:text-base font-bold ${config.textColor}`}>
                  {percentage}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 1, delay: 0.6 + index * 0.1 }}
                  className={`h-full bg-gradient-to-r ${config.color} rounded-full`}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer Note */}
      <div className="mt-4 pt-3 border-t border-slate-700">
        <p className="text-[10px] text-center text-slate-500">
          {locale === 'en' ? 'Based on last 100 articles' : 'Basado en últimos 100 artículos'}
        </p>
      </div>
    </motion.div>
  );
}
