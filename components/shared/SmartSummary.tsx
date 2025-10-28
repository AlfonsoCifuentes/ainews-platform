'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Book, BookOpen, ChevronDown, Loader2 } from 'lucide-react';

interface SummaryLevelOption {
  level: 'tldr' | 'quick' | 'standard';
  icon: typeof Zap;
  label: { en: string; es: string };
  description: { en: string; es: string };
  color: string;
}

const summaryLevels: SummaryLevelOption[] = [
  {
    level: 'tldr',
    icon: Zap,
    label: { en: 'TL;DR', es: 'Ultra Rápido' },
    description: { en: '30 seconds', es: '30 segundos' },
    color: 'from-yellow-500 to-orange-500'
  },
  {
    level: 'quick',
    icon: Book,
    label: { en: 'Quick Read', es: 'Lectura Rápida' },
    description: { en: '2 minutes', es: '2 minutos' },
    color: 'from-blue-500 to-cyan-500'
  },
  {
    level: 'standard',
    icon: BookOpen,
    label: { en: 'Full Summary', es: 'Resumen Completo' },
    description: { en: '5 minutes', es: '5 minutos' },
    color: 'from-primary to-accent'
  }
];

interface SmartSummaryProps {
  contentId: string;
  contentType: 'article' | 'course';
  locale: 'en' | 'es';
  defaultLevel?: 'tldr' | 'quick' | 'standard';
}

export default function SmartSummary({
  contentId,
  contentType,
  locale,
  defaultLevel = 'quick'
}: SmartSummaryProps) {
  const [selectedLevel, setSelectedLevel] = useState<'tldr' | 'quick' | 'standard'>(defaultLevel);
  const [summary, setSummary] = useState<{
    summary_text: string;
    key_points: string[];
    reading_time_seconds: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const loadSummary = async (level: 'tldr' | 'quick' | 'standard') => {
    setLoading(true);
    setSelectedLevel(level);

    try {
      const response = await fetch(
        `/api/summarize?contentId=${contentId}&contentType=${contentType}&level=${level}`
      );
      const data = await response.json();
      setSummary(data.summary);
      setExpanded(true);
    } catch (error) {
      console.error('Error loading summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const t = {
    en: {
      smartSummary: 'Smart Summary',
      choose: 'Choose your reading level',
      keyPoints: 'Key Points',
      readFull: 'Read Full Article'
    },
    es: {
      smartSummary: 'Resumen Inteligente',
      choose: 'Elige tu nivel de lectura',
      keyPoints: 'Puntos Clave',
      readFull: 'Leer Artículo Completo'
    }
  };

  return (
    <div className="mb-8 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          className="w-6 h-6 text-primary"
        >
          <Zap className="w-6 h-6" />
        </motion.div>
        <h3 className="text-lg font-bold">{t[locale].smartSummary}</h3>
      </div>

      {/* Level Selector */}
      <div className="grid grid-cols-3 gap-3">
        {summaryLevels.map((levelOption) => {
          const Icon = levelOption.icon;
          const isSelected = selectedLevel === levelOption.level;

          return (
            <motion.button
              key={levelOption.level}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => loadSummary(levelOption.level)}
              disabled={loading}
              className={`
                relative overflow-hidden rounded-2xl p-4 border-2 transition-all
                ${
                  isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-white/20 bg-white/5 hover:border-white/40'
                }
              `}
            >
              {/* Gradient background */}
              {isSelected && (
                <motion.div
                  layoutId="selectedGradient"
                  className={`absolute inset-0 bg-gradient-to-br ${levelOption.color} opacity-10`}
                />
              )}

              <div className="relative space-y-2">
                <div className={`w-10 h-10 mx-auto rounded-xl bg-gradient-to-br ${levelOption.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-sm">{levelOption.label[locale]}</p>
                  <p className="text-xs text-muted-foreground">{levelOption.description[locale]}</p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Summary Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-3xl backdrop-blur-xl bg-white/10 border border-white/20 p-6 space-y-4"
          >
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : summary ? (
              <>
                {/* Summary Text */}
                <div className="prose prose-invert max-w-none">
                  <p className="text-base leading-relaxed">{summary.summary_text}</p>
                </div>

                {/* Key Points */}
                {summary.key_points && summary.key_points.length > 0 && (
                  <div className="pt-4 border-t border-white/10">
                    <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                      <ChevronDown className="w-4 h-4 text-primary" />
                      {t[locale].keyPoints}
                    </h4>
                    <ul className="space-y-2">
                      {summary.key_points.map((point, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start gap-2 text-sm"
                        >
                          <span className="text-primary font-bold">•</span>
                          <span>{point}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Reading Time */}
                <div className="text-xs text-muted-foreground text-center pt-2">
                  {Math.ceil(summary.reading_time_seconds / 60)} {locale === 'en' ? 'min read' : 'min lectura'}
                </div>
              </>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
