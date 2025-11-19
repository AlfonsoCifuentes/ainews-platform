"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { ExternalLink, TrendingUp } from 'lucide-react';

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
      setIsLoading(true);
      // First try to fetch from our API endpoint
      const response = await fetch('/api/ai-leaderboard');
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      
      const data = await response.json();
      if (data.models && Array.isArray(data.models)) {
        setModels(data.models.slice(0, 3));
        setFullLeaderboard(data.models);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(texts.error);
      // Use fallback data
      const fallbackModels = [
        { rank: 1, name: 'GPT-4o', provider: 'OpenAI', performance_score: 98.5, description: 'Most advanced reasoning' },
        { rank: 2, name: 'Claude 3.5 Sonnet', provider: 'Anthropic', performance_score: 97.8, description: 'Excellent analysis' },
        { rank: 3, name: 'Gemini 2.0', provider: 'Google DeepMind', performance_score: 97.5, description: 'Powerful multimodal' },
      ];
      setModels(fallbackModels);
      setFullLeaderboard(fallbackModels);
    } finally {
      setIsLoading(false);
    }
  }, [texts]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const getPodiumPosition = (rank: number) => {
    switch (rank) {
      case 1: return { height: 'h-32', medal: '🥇', bgGradient: 'from-yellow-600 to-yellow-800' };
      case 2: return { height: 'h-24', medal: '🥈', bgGradient: 'from-gray-400 to-gray-600' };
      case 3: return { height: 'h-20', medal: '🥉', bgGradient: 'from-orange-600 to-orange-800' };
      default: return { height: 'h-16', medal: '', bgGradient: 'from-slate-600 to-slate-800' };
    }
  };

  const getCompanyLogo = (provider: string) => {
    const logos: Record<string, string> = {
      'OpenAI': '/logos/openai.svg',
      'Anthropic': '/logos/anthropic.svg',
      'Google': '/logos/google.svg',
      'Google DeepMind': '/logos/google-deepmind.svg',
      'Meta': '/logos/meta.svg',
      'Mistral': '/logos/mistral.svg',
      'Groq': '/logos/groq.svg',
      'xAI': '/logos/xai.svg',
      'Together': '/logos/together.svg',
    };
    return logos[provider] || '/logos/ai-default.svg';
  };

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

      {/* Podium */}
      <div className="mb-16">
        <div className="flex justify-center items-end gap-4 h-64 mb-8">
          {/* Silver (2nd) */}
          {models[1] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center"
            >
              <div className="mb-4 text-center">
                <p className="text-4xl mb-2">🥈</p>
                <div className="relative w-16 h-16 mb-2">
                  <Image
                    src={getCompanyLogo(models[1].provider)}
                    alt={models[1].provider}
                    width={64}
                    height={64}
                    className="object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/logos/ai-default.svg';
                    }}
                  />
                </div>
                <h3 className="font-bold text-lg">{models[1].name}</h3>
                <p className="text-sm text-muted-foreground">{models[1].provider}</p>
              </div>
              <div className={`w-20 bg-gradient-to-t ${getPodiumPosition(2).bgGradient} rounded-t-lg flex items-end justify-center ${getPodiumPosition(2).height}`}>
                <p className="font-bold text-white text-lg mb-2">2</p>
              </div>
            </motion.div>
          )}

          {/* Gold (1st) */}
          {models[0] && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center"
            >
              <div className="mb-4 text-center">
                <p className="text-5xl mb-2">🥇</p>
                <div className="relative w-20 h-20 mb-2">
                  <Image
                    src={getCompanyLogo(models[0].provider)}
                    alt={models[0].provider}
                    width={80}
                    height={80}
                    className="object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/logos/ai-default.svg';
                    }}
                  />
                </div>
                <h3 className="font-bold text-xl">{models[0].name}</h3>
                <p className="text-sm text-muted-foreground">{models[0].provider}</p>
                <p className="text-sm font-semibold text-primary mt-1">{models[0].performance_score}%</p>
              </div>
              <div className={`w-24 bg-gradient-to-t ${getPodiumPosition(1).bgGradient} rounded-t-lg flex items-end justify-center ${getPodiumPosition(1).height}`}>
                <p className="font-bold text-white text-2xl mb-2">1</p>
              </div>
            </motion.div>
          )}

          {/* Bronze (3rd) */}
          {models[2] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center"
            >
              <div className="mb-4 text-center">
                <p className="text-4xl mb-2">🥉</p>
                <div className="relative w-16 h-16 mb-2">
                  <Image
                    src={getCompanyLogo(models[2].provider)}
                    alt={models[2].provider}
                    width={64}
                    height={64}
                    className="object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/logos/ai-default.svg';
                    }}
                  />
                </div>
                <h3 className="font-bold text-lg">{models[2].name}</h3>
                <p className="text-sm text-muted-foreground">{models[2].provider}</p>
              </div>
              <div className={`w-20 bg-gradient-to-t ${getPodiumPosition(3).bgGradient} rounded-t-lg flex items-end justify-center ${getPodiumPosition(3).height}`}>
                <p className="font-bold text-white text-lg mb-2">3</p>
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
