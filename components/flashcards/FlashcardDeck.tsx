'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  RotateCw, 
  CheckCircle, 
  XCircle,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { calculateSM2, getNextReviewDate } from '@/lib/algorithms/sm2';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  category: string;
  interval: number;
  repetitions: number;
  easeFactor: number;
  dueAt: string;
}

interface FlashcardDeckProps {
  contentId: string;
  contentType: 'article' | 'course';
  locale: 'en' | 'es';
}

export function FlashcardDeck({ contentId, contentType, locale }: FlashcardDeckProps) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ reviewed: 0, correct: 0, streak: 0 });

  const t = locale === 'en' ? {
    title: 'Review Flashcards',
    subtitle: 'Spaced repetition learning',
    flip: 'Flip Card',
    again: 'Again',
    hard: 'Hard',
    good: 'Good',
    easy: 'Easy',
    perfect: 'Perfect',
    completed: 'Deck Complete!',
    reviewed: 'Reviewed',
    accuracy: 'Accuracy',
    streak: 'Streak',
    noCards: 'No cards due for review',
    createCards: 'Generate Flashcards',
  } : {
    title: 'Revisar Tarjetas',
    subtitle: 'Aprendizaje por repetición espaciada',
    flip: 'Voltear',
    again: 'De Nuevo',
    hard: 'Difícil',
    good: 'Bien',
    easy: 'Fácil',
    perfect: 'Perfecto',
    completed: '¡Mazo Completado!',
    reviewed: 'Revisadas',
    accuracy: 'Precisión',
    streak: 'Racha',
    noCards: 'No hay tarjetas para revisar',
    createCards: 'Generar Tarjetas',
  };

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const response = await fetch(
          `/api/flashcards?contentId=${contentId}&contentType=${contentType}&dueOnly=true`
        );
        const data = await response.json();
        if (response.ok) {
          setCards(data.data || []);
        }
      } catch (error) {
        console.error('Failed to load flashcards:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCards();
  }, [contentId, contentType]);

  const loadCards = async () => {
    try {
      const response = await fetch(
        `/api/flashcards?contentId=${contentId}&contentType=${contentType}&dueOnly=true`
      );
      const data = await response.json();
      if (response.ok) {
        setCards(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load flashcards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async (quality: number) => {
    const card = cards[currentIndex];
    if (!card) return;

    // Calculate next review using SM-2
    const result = calculateSM2(
      quality,
      card.repetitions,
      card.easeFactor,
      card.interval
    );

    const nextReviewDate = getNextReviewDate(result.interval);

    // Update card in backend
    try {
      await fetch(`/api/flashcards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interval: result.interval,
          repetitions: result.repetitions,
          easeFactor: result.easeFactor,
          dueAt: nextReviewDate.toISOString(),
          lastReviewedAt: new Date().toISOString(),
        }),
      });

      // Update stats
      setStats(prev => ({
        reviewed: prev.reviewed + 1,
        correct: quality >= 3 ? prev.correct + 1 : prev.correct,
        streak: quality >= 3 ? prev.streak + 1 : 0,
      }));

      // Move to next card
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex(i => i + 1);
      }, 300);
    } catch (error) {
      console.error('Failed to update flashcard:', error);
    }
  };

  const generateCards = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/flashcards/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, contentType, locale }),
      });
      await loadCards();
    } catch (error) {
      console.error('Failed to generate flashcards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Brain className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="text-center p-12 rounded-3xl bg-white/5 border border-white/10">
        <Brain className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-bold mb-2">{t.noCards}</h3>
        <Button onClick={generateCards} className="mt-4">
          <Zap className="mr-2 h-4 w-4" />
          {t.createCards}
        </Button>
      </div>
    );
  }

  if (currentIndex >= cards.length) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center p-12 rounded-3xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30"
      >
        <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
        <h3 className="text-2xl font-bold mb-4">{t.completed}</h3>
        
        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
          <div className="p-4 rounded-xl bg-white/5">
            <div className="text-2xl font-bold">{stats.reviewed}</div>
            <div className="text-sm text-muted-foreground">{t.reviewed}</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5">
            <div className="text-2xl font-bold">
              {stats.reviewed > 0 ? Math.round((stats.correct / stats.reviewed) * 100) : 0}%
            </div>
            <div className="text-sm text-muted-foreground">{t.accuracy}</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5">
            <div className="text-2xl font-bold">{stats.streak}</div>
            <div className="text-sm text-muted-foreground">{t.streak}</div>
          </div>
        </div>
      </motion.div>
    );
  }

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            {t.title}
          </h3>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{currentIndex + 1}/{cards.length}</div>
            <div className="text-xs text-muted-foreground">Cards</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{stats.streak}</div>
            <div className="text-xs text-muted-foreground">{t.streak}</div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-cyan-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Flashcard */}
      <motion.div
        className="relative"
        style={{ perspective: 1000 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCard.id}
            initial={{ rotateY: 0 }}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6, type: 'spring' }}
            className="relative h-96 cursor-pointer"
            onClick={() => setIsFlipped(!isFlipped)}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Front */}
            <div
              className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-white/10 p-8 flex items-center justify-center"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(0deg)',
              }}
            >
              <div className="text-center">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-4">
                  {currentCard.category}
                </div>
                <h2 className="text-3xl font-bold">{currentCard.front}</h2>
              </div>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-white/10 p-8 flex items-center justify-center"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <div className="text-center">
                <p className="text-xl leading-relaxed">{currentCard.back}</p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Flip Button */}
        {!isFlipped && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFlipped((prev) => !prev)}
            >
              <RotateCw className="mr-2 h-4 w-4" />
              {t.flip}
            </Button>
          </motion.div>
        )}
      </motion.div>

      {/* Review Buttons (only show when flipped) */}
      <AnimatePresence>
        {isFlipped && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="grid grid-cols-2 md:grid-cols-5 gap-3"
          >
            <Button
              onClick={() => handleReview(0)}
              variant="outline"
              className="border-red-500/50 hover:bg-red-500/20"
            >
              <XCircle className="mr-2 h-4 w-4" />
              {t.again}
            </Button>
            <Button
              onClick={() => handleReview(2)}
              variant="outline"
              className="border-orange-500/50 hover:bg-orange-500/20"
            >
              {t.hard}
            </Button>
            <Button
              onClick={() => handleReview(3)}
              variant="outline"
              className="border-yellow-500/50 hover:bg-yellow-500/20"
            >
              {t.good}
            </Button>
            <Button
              onClick={() => handleReview(4)}
              variant="outline"
              className="border-green-500/50 hover:bg-green-500/20"
            >
              {t.easy}
            </Button>
            <Button
              onClick={() => handleReview(5)}
              variant="outline"
              className="border-cyan-500/50 hover:bg-cyan-500/20"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              {t.perfect}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
