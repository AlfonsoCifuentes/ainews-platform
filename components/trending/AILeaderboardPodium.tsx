"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, TrendingUp } from 'lucide-react';
import { logger } from '@/lib/utils/logging';
import Image from 'next/image';

interface AIModel {
  rank: number;
  name: string;
  provider: string;
  company_logo_url?: string;
  performance_score: number;
  description?: string;
  url?: string;
}

interface AILeaderboardPodiumProps {
  locale: 'en' | 'es';
}

// Direct SVG data URIs to avoid Next.js Image Optimizer
const SVG_LOGOS: Record<string, string> = {
  'OpenAI': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="45" fill="%23fff" stroke="%23000" stroke-width="2"/%3E%3Ctext x="50" y="62" text-anchor="middle" font-size="45" font-weight="bold" fill="%23000"%3EO%3C/text%3E%3C/svg%3E',
  'Anthropic': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Cpolygon points="50,15 85,85 15,85" fill="%23673AB7" stroke="%23fff" stroke-width="2"/%3E%3Ctext x="50" y="70" text-anchor="middle" font-size="30" font-weight="bold" fill="%23fff"%3EA%3C/text%3E%3C/svg%3E',
  'Google DeepMind': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect x="20" y="20" width="60" height="60" rx="10" fill="%234285F4" stroke="%23fff" stroke-width="2"/%3E%3Ctext x="50" y="65" text-anchor="middle" font-size="35" font-weight="bold" fill="%23fff"%3EG%3C/text%3E%3C/svg%3E',
  'Google': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="40" fill="%234285F4" stroke="%23fff" stroke-width="2"/%3E%3Ctext x="50" y="65" text-anchor="middle" font-size="40" font-weight="bold" fill="%23fff"%3EG%3C/text%3E%3C/svg%3E',
  'Meta': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect x="15" y="15" width="70" height="70" rx="12" fill="%231877F2" stroke="%23fff" stroke-width="2"/%3E%3Ctext x="50" y="65" text-anchor="middle" font-size="40" font-weight="bold" fill="%23fff"%3EM%3C/text%3E%3C/svg%3E',
  'Mistral': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Cpolygon points="50,10 90,90 10,90" fill="%23FF6B35" stroke="%23fff" stroke-width="2"/%3E%3Ctext x="50" y="70" text-anchor="middle" font-size="30" font-weight="bold" fill="%23fff"%3EM%3C/text%3E%3C/svg%3E',
  'Groq': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect x="20" y="20" width="60" height="60" rx="8" fill="%23FF0000" stroke="%23fff" stroke-width="2"/%3E%3Ctext x="50" y="65" text-anchor="middle" font-size="35" font-weight="bold" fill="%23fff"%3EG%3C/text%3E%3C/svg%3E',
  'xAI': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="40" fill="%23000" stroke="%23fff" stroke-width="2"/%3E%3Ctext x="50" y="65" text-anchor="middle" font-size="45" font-weight="bold" fill="%23fff"%3Ex%3C/text%3E%3C/svg%3E',
  'Together': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="35" cy="50" r="18" fill="%239C27B0"/%3E%3Ccircle cx="50" cy="50" r="18" fill="%239C27B0"/%3E%3Ccircle cx="65" cy="50" r="18" fill="%239C27B0"/%3E%3C/svg%3E',
  'default': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect x="20" y="20" width="60" height="60" rx="8" fill="none" stroke="%23666" stroke-width="2"/%3E%3Ctext x="50" y="65" text-anchor="middle" font-size="30" fill="%23666"%3EAI%3C/text%3E%3C/svg%3E'
};

export function AILeaderboardPodium({ locale }: AILeaderboardPodiumProps) {
  const [models, setModels] = useState<AIModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = {
    en: {
      title: "Top AI Models",
      subtitle: "Best performing AI models right now",
      loading: "Loading leaderboard...",
      error: "Failed to load leaderboard",
      citation: "Data from",
      citationUrl: "https://artificialanalysis.ai/leaderboards/models",
    },
    es: {
      title: "Top Modelos IA",
      subtitle: "Los mejores modelos de IA en este momento",
      loading: "Cargando ranking...",
      error: "No se pudo cargar el ranking",
      citation: "Datos de",
      citationUrl: "https://artificialanalysis.ai/leaderboards/models",
    }
  };

  const texts = t[locale];

  const fetchLeaderboard = useCallback(async () => {
    try {
      logger.info('AILeaderboard', 'Starting fetch leaderboard');
      setIsLoading(true);
      setError(null);
      // First try to fetch from our API endpoint
      const response = await fetch('/api/ai-leaderboard');
      logger.debug('AILeaderboard', 'API response received', { status: response.status, ok: response.ok });
      
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      
      const data = await response.json();
      logger.info('AILeaderboard', 'API data parsed successfully', { modelsCount: data.models?.length });
      
      if (data.models && Array.isArray(data.models)) {
        setModels(data.models.slice(0, 3));
        logger.info('AILeaderboard', 'Models state updated', { topModels: data.models.slice(0, 3).map((m: AIModel) => m.name) });
      }
    } catch (err) {
      logger.error('AILeaderboard', 'Error fetching leaderboard', err);
      console.error('Error fetching leaderboard:', err);
      // Use fallback data
      const fallbackModels = [
        { rank: 1, name: 'GPT-4o', provider: 'OpenAI', performance_score: 98.5, description: 'Most advanced reasoning' },
        { rank: 2, name: 'Claude 3.5 Sonnet', provider: 'Anthropic', performance_score: 97.8, description: 'Excellent analysis' },
        { rank: 3, name: 'Gemini 2.0', provider: 'Google DeepMind', performance_score: 97.5, description: 'Powerful multimodal' },
      ];
      setModels(fallbackModels);
      logger.info('AILeaderboard', 'Using fallback models');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    logger.info('AILeaderboard', 'Component mounted, triggering fetchLeaderboard');
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const getCompanyLogo = useCallback((provider: string): string => {
    return SVG_LOGOS[provider] || SVG_LOGOS.default;
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{texts.loading}</p>
        </div>
      </div>
    );
  }

  if (error && models.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{texts.error}</p>
      </div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full py-6 px-4 max-h-[600px] overflow-visible"
    >
      {/* Header */}
      <div className="mb-6 text-center">
        <h3 className="text-xl md:text-2xl font-bold mb-1 flex items-center justify-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          {texts.title}
        </h3>
        <p className="text-xs text-muted-foreground">{texts.subtitle}</p>
      </div>

      {/* Podium - Compact version */}
      <div className="w-full px-2 sm:px-4 mb-4">
        {/* Mobile: Stack vertically | Desktop: Horizontal podium */}
        <div className="flex flex-col md:flex-row md:justify-center md:items-end md:gap-2 lg:gap-3">
          {/* Silver (2nd) - Hidden on mobile, shows on desktop */}
          {models[1] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="hidden md:flex flex-col items-center flex-shrink-0 w-full md:w-auto"
            >
              {/* Card */}
              <motion.div
                className="w-full md:w-24 lg:w-28 bg-gradient-to-b from-slate-700 to-slate-800 rounded-xl p-2 md:p-3 border border-slate-600 text-center shadow-lg"
                whileHover={{ translateY: -2 }}
              >
                <p className="text-2xl md:text-3xl mb-1">🥈</p>
                <div className="relative w-12 h-12 md:w-14 md:h-14 mx-auto mb-1 flex items-center justify-center bg-white/10 rounded-lg overflow-hidden">
                  <Image
                    src={getCompanyLogo(models[1].provider)}
                    alt={models[1].provider}
                    width={40}
                    height={40}
                    className="object-contain w-8 h-8 md:w-10 md:h-10"
                  />
                </div>
                <h3 className="font-bold text-xs md:text-sm text-white leading-tight truncate">{models[1].name}</h3>
                <p className="text-[10px] text-slate-300 mt-0.5 truncate">{models[1].provider}</p>
                <p className="text-sm md:text-base font-bold text-blue-400 mt-1">{models[1].performance_score}%</p>
              </motion.div>
              
              {/* Position number - simplified */}
              <p className="font-bold text-white text-xl mt-2">2</p>
            </motion.div>
          )}

          {/* Gold (1st) - Full width mobile, centered desktop */}
          {models[0] && (
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center w-full md:w-auto flex-shrink-0 md:z-10"
            >
              {/* Crown - positioned behind top of card */}
              <div className="relative w-20 h-6 md:w-24 md:h-8 flex items-center justify-center -mb-1 md:-mb-2 z-10">
                <p className="text-3xl md:text-4xl filter drop-shadow-lg">👑</p>
              </div>
              
              {/* Larger card */}
              <motion.div
                className="w-full md:w-28 lg:w-32 bg-gradient-to-b from-yellow-600 to-amber-700 rounded-xl p-3 md:p-4 border-2 border-yellow-500 text-center shadow-2xl relative"
                whileHover={{ translateY: -3 }}
              >
                <p className="text-4xl md:text-5xl mb-2">🥇</p>
                <div className="relative w-16 h-16 md:w-20 md:h-20 mx-auto mb-2 flex items-center justify-center bg-white/20 rounded-lg overflow-hidden">
                  <Image
                    src={getCompanyLogo(models[0].provider)}
                    alt={models[0].provider}
                    width={64}
                    height={64}
                    className="object-contain w-12 h-12 md:w-16 md:h-16"
                  />
                </div>
                <h3 className="font-bold text-sm md:text-base text-white leading-tight truncate">{models[0].name}</h3>
                <p className="text-[10px] text-yellow-100 mt-0.5 truncate">{models[0].provider}</p>
                <p className="text-base md:text-lg font-bold text-white mt-1">{models[0].performance_score}%</p>
              </motion.div>
              
              {/* Position number - simplified */}
              <p className="font-bold text-white text-2xl md:text-3xl mt-2">1</p>
            </motion.div>
          )}

          {/* Bronze (3rd) - Hidden on mobile, shows on desktop */}
          {models[2] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="hidden md:flex flex-col items-center flex-shrink-0 w-full md:w-auto"
            >
              {/* Card */}
              <motion.div
                className="w-full md:w-24 lg:w-28 bg-gradient-to-b from-orange-700 to-orange-800 rounded-xl p-2 md:p-3 border border-orange-600 text-center shadow-lg"
                whileHover={{ translateY: -2 }}
              >
                <p className="text-2xl md:text-3xl mb-1">🥉</p>
                <div className="relative w-12 h-12 md:w-14 md:h-14 mx-auto mb-1 flex items-center justify-center bg-white/10 rounded-lg overflow-hidden">
                  <Image
                    src={getCompanyLogo(models[2].provider)}
                    alt={models[2].provider}
                    width={40}
                    height={40}
                    className="object-contain w-8 h-8 md:w-10 md:h-10"
                  />
                </div>
                <h3 className="font-bold text-xs md:text-sm text-white leading-tight truncate">{models[2].name}</h3>
                <p className="text-[10px] text-orange-200 mt-0.5 truncate">{models[2].provider}</p>
                <p className="text-sm md:text-base font-bold text-orange-300 mt-1">{models[2].performance_score}%</p>
              </motion.div>
              
              {/* Position number - simplified */}
              <p className="font-bold text-white text-xl mt-2">3</p>
            </motion.div>
          )}
        </div>

        {/* Mobile: Show all 3 as cards stacked */}
        <div className="md:hidden space-y-2 mt-4">
          {[0, 1, 2].map((idx) => models[idx] && (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="w-full bg-gradient-to-r from-slate-800 to-slate-900 rounded-lg p-3 border border-slate-700 flex items-center gap-3"
            >
              <div className="text-2xl">
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-white/10 rounded-lg overflow-hidden">
                    <Image
                      src={getCompanyLogo(models[idx].provider)}
                      alt={models[idx].provider}
                      width={32}
                      height={32}
                      className="object-contain w-7 h-7"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-white truncate">{models[idx].name}</p>
                    <p className="text-xs text-slate-400">{models[idx].provider}</p>
                  </div>
                </div>
                <p className="text-base font-bold text-yellow-400">#{idx + 1} - {models[idx].performance_score}%</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Citation moved directly under podium */}
      <p className="text-center text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1">
        {texts.citation}{' '}
        <a
          href={texts.citationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline flex items-center gap-1"
        >
          Artificial Analysis <ExternalLink className="w-3 h-3" />
        </a>
      </p>
    </motion.section>
  );
}
