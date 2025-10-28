'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MessageSquare, ThumbsUp } from 'lucide-react';

interface Rating {
  id: string;
  user_id: string;
  rating: number;
  review_en?: string;
  review_es?: string;
  created_at: string;
}

interface RatingStats {
  average: number;
  count: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

interface CourseRatingsProps {
  courseId: string;
  locale: string;
  userId?: string;
}

export function CourseRatings({ courseId, locale, userId = 'demo-user' }: CourseRatingsProps) {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [stats, setStats] = useState<RatingStats | null>(null);
  const [userRating, setUserRating] = useState<number>(0);
  const [userReview, setUserReview] = useState<string>('');
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const t = {
    en: {
      averageRating: 'Average Rating',
      ratings: 'ratings',
      distribution: 'Rating Distribution',
      yourRating: 'Your Rating',
      addReview: 'Add a review',
      writeReview: 'Write your review...',
      submit: 'Submit Rating',
      submitting: 'Submitting...',
      reviews: 'Reviews',
      noReviews: 'No reviews yet. Be the first to review!',
      helpful: 'Helpful',
    },
    es: {
      averageRating: 'Calificación Promedio',
      ratings: 'calificaciones',
      distribution: 'Distribución de Calificaciones',
      yourRating: 'Tu Calificación',
      addReview: 'Agregar reseña',
      writeReview: 'Escribe tu reseña...',
      submit: 'Enviar Calificación',
      submitting: 'Enviando...',
      reviews: 'Reseñas',
      noReviews: '¡No hay reseñas aún. Sé el primero en opinar!',
      helpful: 'Útil',
    }
  };

  const text = t[locale as keyof typeof t] || t.en;

  useEffect(() => {
    fetchRatings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const fetchRatings = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}/ratings`);
      const data = await response.json();
      
      if (data.success) {
        setRatings(data.data.ratings);
        setStats(data.data.stats);
        
        // Find user's existing rating
        const existingRating = data.data.ratings.find((r: Rating) => r.user_id === userId);
        if (existingRating) {
          setUserRating(existingRating.rating);
          setUserReview(locale === 'es' ? existingRating.review_es || '' : existingRating.review_en || '');
        }
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
    }
  };

  const handleSubmitRating = async () => {
    if (userRating === 0) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/courses/${courseId}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          rating: userRating,
          [locale === 'es' ? 'review_es' : 'review_en']: userReview,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchRatings();
        setShowReviewForm(false);
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (rating: number, interactive: boolean = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            onClick={() => interactive && setUserRating(star)}
            className={`transition-all ${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
          >
            <Star
              className={`w-5 h-5 transition-colors ${
                star <= (interactive ? (hoverRating || userRating) : rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-600'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const renderDistributionBar = (count: number, total: number) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
          className="h-full bg-gradient-to-r from-yellow-400 to-orange-400"
        />
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Rating Overview */}
      {stats && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Average Rating */}
          <div className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10">
            <div className="text-center">
              <div className="text-5xl font-bold text-primary mb-2">
                {stats.average.toFixed(1)}
              </div>
              {renderStars(Math.round(stats.average))}
              <p className="text-sm text-muted-foreground mt-2">
                {stats.count} {text.ratings}
              </p>
            </div>
          </div>

          {/* Distribution */}
          <div className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10">
            <h3 className="font-semibold mb-4">{text.distribution}</h3>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => (
                <div key={star} className="flex items-center gap-3 text-sm">
                  <span className="w-8">{star} ★</span>
                  {renderDistributionBar(stats.distribution[star as keyof typeof stats.distribution], stats.count)}
                  <span className="w-8 text-right text-muted-foreground">
                    {stats.distribution[star as keyof typeof stats.distribution]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* User Rating Form */}
      <div className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10">
        <h3 className="font-semibold mb-4">{text.yourRating}</h3>
        {renderStars(userRating, true)}
        
        {userRating > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4"
          >
            <button
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="text-sm text-primary hover:underline mb-3"
            >
              {text.addReview}
            </button>

            <AnimatePresence>
              {showReviewForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <textarea
                    value={userReview}
                    onChange={(e) => setUserReview(e.target.value)}
                    placeholder={text.writeReview}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10
                             focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all
                             resize-none"
                    rows={4}
                  />
                  <button
                    onClick={handleSubmitRating}
                    disabled={isSubmitting}
                    className="px-6 py-2 rounded-lg bg-primary text-white hover:bg-primary/90
                             transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? text.submitting : text.submit}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Reviews List */}
      <div>
        <h3 className="text-2xl font-bold mb-6">{text.reviews}</h3>
        
        {ratings.length === 0 ? (
          <div className="p-8 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">{text.noReviews}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {ratings.map((rating) => {
              const review = locale === 'es' ? rating.review_es : rating.review_en;
              if (!review) return null;

              return (
                <motion.div
                  key={rating.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-600 
                                    flex items-center justify-center text-white font-bold">
                        {rating.user_id.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold">User {rating.user_id.substring(0, 8)}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(rating.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    {renderStars(rating.rating)}
                  </div>

                  <p className="text-muted-foreground mb-3">{review}</p>

                  <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                    <ThumbsUp className="w-4 h-4" />
                    <span>{text.helpful}</span>
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
