'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  due_at: string;
}

export function FlashcardReviewer() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ due: 0, total: 0, mastered: 0 });

  useEffect(() => {
    loadFlashcards();
    loadStats();
  }, []);

  const loadFlashcards = async () => {
    try {
      const res = await fetch('/api/flashcards?limit=20');
      if (res.ok) {
        const data = await res.json();
        setFlashcards(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load flashcards:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch('/api/flashcards?action=stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleReview = async (quality: number) => {
    const card = flashcards[currentIndex];
    if (!card) return;

    try {
      await fetch('/api/flashcards?action=review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flashcardId: card.id,
          quality,
        }),
      });

      // Move to next card
      if (currentIndex < flashcards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
      } else {
        // Finished all cards
        setFlashcards([]);
        loadStats();
      }
    } catch (error) {
      console.error('Failed to record review:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading flashcards...</p>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-bold">Flashcard Review</h2>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-lg mb-4">No flashcards due for review!</p>
            <div className="flex gap-4 justify-center text-sm">
              <div>
                <span className="font-semibold">{stats.total}</span> total
              </div>
              <div>
                <span className="font-semibold">{stats.mastered}</span> mastered
              </div>
              <div>
                <span className="font-semibold">{stats.due}</span> due
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4 flex justify-between items-center">
        <Badge variant="outline">
          {currentIndex + 1} / {flashcards.length}
        </Badge>
        <div className="text-sm text-muted-foreground">
          {stats.due} due today
        </div>
      </div>

      <Card className="min-h-[400px] flex flex-col">
        <CardHeader>
          <div className="text-sm text-muted-foreground">
            Repetitions: {currentCard.repetitions} • Interval: {currentCard.interval_days} days
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-center">
          <div className="text-center mb-8">
            <h3 className="text-xl font-semibold mb-4">Question:</h3>
            <p className="text-lg">{currentCard.front}</p>
          </div>

          {showAnswer && (
            <div className="text-center border-t pt-6">
              <h3 className="text-xl font-semibold mb-4">Answer:</h3>
              <p className="text-lg">{currentCard.back}</p>
            </div>
          )}

          {!showAnswer ? (
            <button
              onClick={() => setShowAnswer(true)}
              className="mt-auto px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Show Answer
            </button>
          ) : (
            <div className="mt-auto">
              <p className="text-center text-sm text-muted-foreground mb-3">
                How well did you know this?
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleReview(1)}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  Again
                </button>
                <button
                  onClick={() => handleReview(3)}
                  className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                >
                  Hard
                </button>
                <button
                  onClick={() => handleReview(5)}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                >
                  Easy
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
