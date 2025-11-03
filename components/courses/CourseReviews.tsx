'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, ThumbsUp, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getSupabaseClient } from '@/lib/db/supabase';
import { useToast } from '@/components/shared/ToastProvider';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Review {
  id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  helpful_count: number;
  user_profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface CourseReviewsProps {
  locale: 'en' | 'es';
  courseId: string;
  reviews: Review[];
  userReview?: Review;
  canReview: boolean;
}

export function CourseReviews({ 
  locale, 
  courseId, 
  reviews, 
  userReview,
  canReview 
}: CourseReviewsProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isWritingReview, setIsWritingReview] = useState(false);
  const [rating, setRating] = useState(userReview?.rating || 0);
  const [comment, setComment] = useState(userReview?.comment || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = locale === 'en' ? {
    writeReview: 'Write a Review',
    yourRating: 'Your Rating',
    yourReview: 'Your Review',
    submit: 'Submit Review',
    submitting: 'Submitting...',
    update: 'Update Review',
    cancel: 'Cancel',
    helpful: 'Helpful',
    reply: 'Reply',
    success: 'Review submitted successfully!',
    error: 'Failed to submit review',
    enrollRequired: 'Enroll in this course to leave a review',
    noReviews: 'No reviews yet. Be the first to review!',
  } : {
    writeReview: 'Escribir una Reseña',
    yourRating: 'Tu Calificación',
    yourReview: 'Tu Reseña',
    submit: 'Enviar Reseña',
    submitting: 'Enviando...',
    update: 'Actualizar Reseña',
    cancel: 'Cancelar',
    helpful: 'Útil',
    reply: 'Responder',
    success: '¡Reseña enviada exitosamente!',
    error: 'Error al enviar reseña',
    enrollRequired: 'Inscríbete en este curso para dejar una reseña',
    noReviews: '¡Aún no hay reseñas. Sé el primero en opinar!',
  };

  const handleSubmitReview = async () => {
    if (rating === 0) {
      showToast(locale === 'en' ? 'Please select a rating' : 'Por favor selecciona una calificación', 'error');
      return;
    }

    if (!comment.trim()) {
      showToast(locale === 'en' ? 'Please write a review' : 'Por favor escribe una reseña', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = getSupabaseClient();

      if (userReview) {
        // Update existing review
        const { error } = await supabase
          .from('course_reviews')
          .update({
            rating,
            comment: comment.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', userReview.id);

        if (error) throw error;
      } else {
        // Create new review
        const { error } = await supabase
          .from('course_reviews')
          .insert({
            course_id: courseId,
            rating,
            comment: comment.trim(),
          });

        if (error) throw error;
      }

      showToast(t.success, 'success');
      setIsWritingReview(false);
      router.refresh();
    } catch (error) {
      console.error('Review submission error:', error);
      showToast(t.error, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const avgRating = reviews.length > 0
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: reviews.filter(r => r.rating === stars).length,
    percentage: reviews.length > 0 
      ? (reviews.filter(r => r.rating === stars).length / reviews.length) * 100 
      : 0,
  }));

  return (
    <div className="space-y-8">
      {/* Rating Summary */}
      <div className="grid md:grid-cols-2 gap-8 p-6 rounded-xl bg-secondary/50">
        <div className="text-center">
          <div className="text-5xl font-bold mb-2">{avgRating.toFixed(1)}</div>
          <div className="flex items-center justify-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-6 h-6 ${
                  star <= avgRating
                    ? 'text-yellow-500 fill-yellow-500'
                    : 'text-muted-foreground'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {reviews.length} {locale === 'en' ? 'reviews' : 'reseñas'}
          </p>
        </div>

        <div className="space-y-2">
          {ratingDistribution.map(({ stars, count, percentage }) => (
            <div key={stars} className="flex items-center gap-3">
              <span className="text-sm w-12">{stars} <Star className="w-3 h-3 inline" /></span>
              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-sm text-muted-foreground w-8">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Write Review */}
      {canReview && (
        <div>
          {!isWritingReview ? (
            <Button
              onClick={() => setIsWritingReview(true)}
              variant="outline"
              className="w-full md:w-auto"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              {userReview ? t.update : t.writeReview}
            </Button>
          ) : (
            <div className="p-6 rounded-xl border bg-card space-y-4">
              <h3 className="font-semibold">{t.writeReview}</h3>

              {/* Star Rating */}
              <div>
                <label className="text-sm font-medium mb-2 block">{t.yourRating}</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= rating
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="text-sm font-medium mb-2 block">{t.yourReview}</label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={locale === 'en' 
                    ? 'Share your experience with this course...' 
                    : 'Comparte tu experiencia con este curso...'}
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={handleSubmitReview}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? t.submitting : (userReview ? t.update : t.submit)}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsWritingReview(false);
                    setRating(userReview?.rating || 0);
                    setComment(userReview?.comment || '');
                  }}
                  disabled={isSubmitting}
                >
                  {t.cancel}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {t.noReviews}
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-xl border bg-card"
            >
              <div className="flex items-start gap-4">
                <Image
                  src={review.user_profiles.avatar_url || '/images/default-avatar.png'}
                  alt={review.user_profiles.username}
                  width={48}
                  height={48}
                  className="rounded-full"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold">{review.user_profiles.username}</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= review.rating
                              ? 'text-yellow-500 fill-yellow-500'
                              : 'text-muted-foreground'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(review.created_at), {
                        addSuffix: true,
                        locale: locale === 'es' ? es : undefined,
                      })}
                    </span>
                  </div>

                  <p className="text-sm mb-3">{review.comment}</p>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                      <ThumbsUp className="w-4 h-4" />
                      {t.helpful} ({review.helpful_count || 0})
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
