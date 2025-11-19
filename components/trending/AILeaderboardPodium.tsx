"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, TrendingUp } from 'lucide-react';
import { logger } from '@/lib/utils/logging';

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
  const [fullLeaderboard, setFullLeaderboard] = useState<AIModel[]>([]);
  const [showFullTable, setShowFullTable] = useState(false);

  const t = {
    en: {
      title: "🏆 Top AI Models Leaderboard",
      subtitle: "Best performing AI models right now",
      loading: "Loading leaderboard...",
      error: "Failed to load leaderboard",
      viewMore: "View Full Leaderboard",
      hideTable: "Hide Table",
      score: "Score",
      provider: "Provider",
      citation: "Data from Artificial Analysis",
      citationUrl: "https://artificialanalysis.ai/leaderboards/models",
    },
    es: {
      title: "🏆 Ranking de Mejores Modelos de IA",
      subtitle: "Los mejores modelos de IA en este momento",
      loading: "Cargando ranking...",
      error: "No se pudo cargar el ranking",
      viewMore: "Ver Ranking Completo",
      hideTable: "Ocultar Tabla",
      score: "Puntuación",
      provider: "Proveedor",
      citation: "Datos de Artificial Analysis",
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
        setFullLeaderboard(data.models);
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
      setFullLeaderboard(fallbackModels);
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
      className="w-full py-12 px-4"
    >
      {/* Header */}
      <div className="mb-12 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-2 flex items-center justify-center gap-2">
          <TrendingUp className="w-8 h-8 text-primary" />
          {texts.title}
        </h2>
        <p className="text-muted-foreground">{texts.subtitle}</p>
      </div>

      {/* Podium - Improved layout to prevent overlapping */}
      <div className="w-full max-w-4xl mx-auto mb-16">
        {/* Responsive podium with better spacing */}
        <div className="flex justify-center items-end gap-6 md:gap-8 h-80 mb-12">
          {/* Silver (2nd) */}
          {models[1] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center flex-shrink-0"
            >
              {/* Card with medal and logo */}
              <motion.div
                className="bg-gradient-to-b from-slate-700 to-slate-800 rounded-2xl p-6 mb-4 border-2 border-slate-600 min-w-[140px] text-center shadow-lg"
                whileHover={{ translateY: -4 }}
              >
                <p className="text-5xl mb-3">🥈</p>
                <div className="relative w-24 h-24 mx-auto mb-4 flex items-center justify-center bg-white/10 rounded-xl">
                  <img
                    src={getCompanyLogo(models[1].provider)}
                    alt={models[1].provider}
                    className="object-contain w-16 h-16"
                    loading="lazy"
                  />
                </div>
                <h3 className="font-bold text-lg text-white leading-tight">{models[1].name}</h3>
                <p className="text-sm text-slate-300 mt-1">{models[1].provider}</p>
                <p className="text-lg font-bold text-blue-400 mt-2">{models[1].performance_score}%</p>
              </motion.div>
              
              {/* Podium bar */}
              <div className="w-32 bg-gradient-to-t from-slate-600 to-slate-500 rounded-t-lg flex items-end justify-center h-40 border-2 border-slate-600 border-b-0">
                <p className="font-bold text-white text-3xl mb-3">2</p>
              </div>
            </motion.div>
          )}

          {/* Gold (1st) - Center and tallest */}
          {models[0] && (
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center flex-shrink-0 z-10"
            >
              {/* Larger card with medal and logo */}
              <motion.div
                className="bg-gradient-to-b from-yellow-600 to-amber-700 rounded-2xl p-8 mb-4 border-4 border-yellow-500 min-w-[160px] text-center shadow-2xl"
                whileHover={{ translateY: -6 }}
              >
                <p className="text-7xl mb-4">🥇</p>
                <div className="relative w-28 h-28 mx-auto mb-4 flex items-center justify-center bg-white/20 rounded-xl">
                  <img
                    src={getCompanyLogo(models[0].provider)}
                    alt={models[0].provider}
                    className="object-contain w-20 h-20"
                    loading="lazy"
                  />
                </div>
                <h3 className="font-bold text-2xl text-white leading-tight">{models[0].name}</h3>
                <p className="text-sm text-yellow-100 mt-1">{models[0].provider}</p>
                <p className="text-2xl font-bold text-white mt-3">{models[0].performance_score}%</p>
              </motion.div>
              
              {/* Podium bar - Tallest */}
              <div className="w-40 bg-gradient-to-t from-yellow-700 to-yellow-600 rounded-t-lg flex items-end justify-center h-56 border-4 border-yellow-600 border-b-0 shadow-lg">
                <p className="font-bold text-white text-5xl mb-4">1</p>
              </div>
            </motion.div>
          )}

          {/* Bronze (3rd) */}
          {models[2] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center flex-shrink-0"
            >
              {/* Card with medal and logo */}
              <motion.div
                className="bg-gradient-to-b from-orange-700 to-orange-800 rounded-2xl p-6 mb-4 border-2 border-orange-600 min-w-[140px] text-center shadow-lg"
                whileHover={{ translateY: -4 }}
              >
                <p className="text-5xl mb-3">🥉</p>
                <div className="relative w-24 h-24 mx-auto mb-4 flex items-center justify-center bg-white/10 rounded-xl">
                  <img
                    src={getCompanyLogo(models[2].provider)}
                    alt={models[2].provider}
                    className="object-contain w-16 h-16"
                    loading="lazy"
                  />
                </div>
                <h3 className="font-bold text-lg text-white leading-tight">{models[2].name}</h3>
                <p className="text-sm text-orange-200 mt-1">{models[2].provider}</p>
                <p className="text-lg font-bold text-orange-300 mt-2">{models[2].performance_score}%</p>
              </motion.div>
              
              {/* Podium bar */}
              <div className="w-32 bg-gradient-to-t from-orange-700 to-orange-600 rounded-t-lg flex items-end justify-center h-32 border-2 border-orange-600 border-b-0">
                <p className="font-bold text-white text-3xl mb-3">3</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Full Leaderboard Table Toggle */}
      {fullLeaderboard.length > 3 && (
        <div className="text-center mb-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFullTable(!showFullTable)}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            {showFullTable ? texts.hideTable : texts.viewMore}
          </motion.button>
        </div>
      )}

      {/* Full Leaderboard Table */}
      {showFullTable && fullLeaderboard.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-x-auto mb-8"
        >
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-muted-foreground/20 bg-muted/50">
                <th className="px-4 py-3 font-bold">#</th>
                <th className="px-4 py-3 font-bold">{locale === 'en' ? 'Model' : 'Modelo'}</th>
                <th className="px-4 py-3 font-bold">{texts.provider}</th>
                <th className="px-4 py-3 font-bold text-right">{texts.score}</th>
              </tr>
            </thead>
            <tbody>
              {fullLeaderboard.map((model, idx) => (
                <motion.tr
                  key={model.rank}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border-b border-muted-foreground/10 hover:bg-muted/50 transition-colors"
                >
                  <td className="px-4 py-3 font-bold text-primary">{model.rank}</td>
                  <td className="px-4 py-3 font-semibold">{model.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{model.provider}</td>
                  <td className="px-4 py-3 text-right font-semibold">{model.performance_score}%</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          <p className="text-center text-sm text-muted-foreground mt-6 flex items-center justify-center gap-2">
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
        </motion.div>
      )}
    </motion.section>
  );
}
