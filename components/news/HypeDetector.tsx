'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface HypeDetectorProps {
  hypeScore: number;
  substanceScore: number;
  hypeKeywords: string[];
  substanceKeywords: string[];
  locale: 'en' | 'es';
}

export function HypeDetector({
  hypeScore,
  substanceScore,
  hypeKeywords,
  substanceKeywords,
  locale,
}: HypeDetectorProps) {
  const t = {
    en: {
      title: 'Hype Detector',
      subtitle: 'Marketing vs Substance',
      hype: 'Hype',
      substance: 'Substance',
      keywords: 'Top words:',
      ratio: 'Ratio',
      balanced: 'Balanced',
      hypeHeavy: 'Hype-Heavy',
      substanceRich: 'Substance-Rich',
    },
    es: {
      title: 'Detector de Hype',
      subtitle: 'Marketing vs Sustancia',
      hype: 'Hype',
      substance: 'Sustancia',
      keywords: 'Palabras clave:',
      ratio: 'Ratio',
      balanced: 'Equilibrado',
      hypeHeavy: 'Mucho Hype',
      substanceRich: 'Rico en Sustancia',
    },
  };

  const texts = t[locale];

  // Calculate ratio and label
  const ratio = hypeScore > 0 ? (substanceScore / hypeScore).toFixed(1) : '∞';
  let label = texts.balanced;
  let labelColor = 'text-yellow-400';
  
  if (hypeScore > substanceScore * 1.3) {
    label = texts.hypeHeavy;
    labelColor = 'text-orange-400';
  } else if (substanceScore > hypeScore * 1.3) {
    label = texts.substanceRich;
    labelColor = 'text-green-400';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="w-full h-full bg-gradient-to-b from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700 p-4 md:p-6"
    >
      {/* Header */}
      <div className="mb-4 text-center">
        <h3 className="text-lg md:text-xl font-bold mb-1 flex items-center justify-center gap-2">
          <span className="text-2xl">🎭</span>
          {texts.title}
        </h3>
        <p className="text-xs text-muted-foreground">{texts.subtitle}</p>
      </div>

      {/* Comparative Bars */}
      <div className="space-y-4 mb-4">
        {/* Hype Bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-orange-400 flex items-center gap-1">
              🎪 {texts.hype}
            </span>
            <span className="text-sm font-bold text-orange-400">{hypeScore}%</span>
          </div>
          <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${hypeScore}%` }}
              transition={{ duration: 1, delay: 0.3 }}
              className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full"
            />
          </div>
          {/* Top hype keywords */}
          <p className="text-[10px] text-slate-400 mt-1 truncate">
            {texts.keywords} {hypeKeywords.slice(0, 3).join(', ')}
          </p>
        </div>

        {/* Substance Bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-blue-400 flex items-center gap-1">
              📐 {texts.substance}
            </span>
            <span className="text-sm font-bold text-blue-400">{substanceScore}%</span>
          </div>
          <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${substanceScore}%` }}
              transition={{ duration: 1, delay: 0.5 }}
              className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
            />
          </div>
          {/* Top substance keywords */}
          <p className="text-[10px] text-slate-400 mt-1 truncate">
            {texts.keywords} {substanceKeywords.slice(0, 3).join(', ')}
          </p>
        </div>
      </div>

      {/* Verdict/Label */}
      <div className="text-center pt-3 border-t border-slate-700">
        <p className="text-xs text-muted-foreground mb-1">{texts.ratio}</p>
        <p className={`text-lg font-bold ${labelColor}`}>{label}</p>
        {ratio !== '∞' && (
          <p className="text-xs text-slate-500 mt-1">
            {substanceScore > hypeScore ? (
              <TrendingUp className="w-3 h-3 inline mr-1" />
            ) : hypeScore > substanceScore ? (
              <TrendingDown className="w-3 h-3 inline mr-1" />
            ) : (
              <Minus className="w-3 h-3 inline mr-1" />
            )}
            {ratio}:1
          </p>
        )}
      </div>
    </motion.div>
  );
}
