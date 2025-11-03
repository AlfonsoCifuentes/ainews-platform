"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

interface RatingStarsProps {
  articleId: string;
  locale: 'en' | 'es';
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  readonly?: boolean;
}

export function RatingStars({
  articleId,
  locale,
  size = 'md',
  showCount = true,
  readonly = false,
}: RatingStarsProps) {
  const [userRating, setUserRating] = useState<number | null>(null);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalRatings, setTotalRatings] = useState<number>(0);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchRating();
  }, [articleId]);

  const fetchRating = async () => {
    try {
      const response = await fetch(`/api/ratings?articleId=${articleId}`);
      const data = await response.json();

      if (response.ok) {
        setAverageRating(data.averageRating);
        setTotalRatings(data.totalRatings);
        setUserRating(data.userRating);
      }
    } catch (error) {
      console.error('Failed to fetch rating:', error);
    }
  };

  const handleRate = async (rating: number) => {
    if (readonly) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId, rating }),
      });

      const data = await response.json();

      if (response.ok) {
        setUserRating(rating);
        setAverageRating(data.averageRating);
        setTotalRatings(data.totalRatings);
      }
    } catch (error) {
      console.error('Failed to rate:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const displayRating = hoveredStar !== null ? hoveredStar : userRating || averageRating;

  const translations = {
    en: {
      rate: 'Rate this article',
      ratings: 'ratings',
      yourRating: 'Your rating',
    },
    es: {
      rate: 'Califica este artículo',
      ratings: 'calificaciones',
      yourRating: 'Tu calificación',
    },
  }[locale];

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.button
            key={star}
            whileHover={readonly ? {} : { scale: 1.2 }}
            whileTap={readonly ? {} : { scale: 0.9 }}
            onMouseEnter={() => !readonly && setHoveredStar(star)}
            onMouseLeave={() => !readonly && setHoveredStar(null)}
            onClick={() => handleRate(star)}
            disabled={isLoading || readonly}
            className={`transition-all ${readonly ? 'cursor-default' : 'cursor-pointer'} ${
              isLoading ? 'opacity-50' : ''
            }`}
            aria-label={`${star} ${translations.rate}`}
          >
            <Star
              className={`${sizeClasses[size]} transition-all ${
                star <= displayRating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'fill-transparent text-gray-400'
              }`}
            />
          </motion.button>
        ))}
      </div>

      {showCount && totalRatings > 0 && (
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold">{averageRating.toFixed(1)}</span>
          <span className="mx-1">•</span>
          <span>
            {totalRatings} {translations.ratings}
          </span>
        </div>
      )}

      {userRating && !readonly && (
        <div className="text-xs text-primary">
          {translations.yourRating}: {userRating}★
        </div>
      )}
    </div>
  );
}
