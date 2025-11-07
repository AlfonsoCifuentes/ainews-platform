'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, MessageSquare, Send, Check } from 'lucide-react';

interface FeedbackButtonProps {
  contentType: 'article' | 'course' | 'module';
  contentId: string;
  className?: string;
}

export function FeedbackButton({ contentType, contentId, className = '' }: FeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!rating && !feedback.trim()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_type: contentType,
          content_id: contentId,
          rating,
          feedback_text: feedback.trim() || null,
        }),
      });

      if (response.ok) {
        setIsSubmitted(true);
        setTimeout(() => {
          setIsOpen(false);
          setRating(null);
          setFeedback('');
          setIsSubmitted(false);
        }, 2000);
      } else {
        console.error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="glass group flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm 
                   transition-all hover:border-primary/30 hover:shadow-lg"
        aria-label="Give feedback"
      >
        <MessageSquare className="h-4 w-4 transition-transform group-hover:scale-110" />
        <span>Feedback</span>
      </button>

      {/* Feedback Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-white/20 
                       bg-black/95 p-6 shadow-2xl backdrop-blur-xl"
          >
            {isSubmitted ? (
              // Success State
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-3 py-4 text-center"
              >
                <div className="rounded-full bg-green-500/20 p-3">
                  <Check className="h-6 w-6 text-green-500" />
                </div>
                <p className="text-sm font-medium text-white">
                  ¡Gracias por tu feedback!
                </p>
                <p className="text-xs text-muted-foreground">
                  Nos ayuda a mejorar continuamente
                </p>
              </motion.div>
            ) : (
              // Feedback Form
              <>
                <h3 className="mb-4 text-lg font-bold text-white">
                  ¿Cómo fue tu experiencia?
                </h3>

                {/* Rating */}
                <div className="mb-4">
                  <p className="mb-2 text-sm text-muted-foreground">
                    Calificación
                  </p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        onClick={() => setRating(value)}
                        className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-all
                          ${
                            rating === value
                              ? 'border-primary bg-primary/20 text-primary'
                              : 'border-white/10 text-muted-foreground hover:border-primary/30 hover:text-primary'
                          }`}
                        aria-label={`Rate ${value} stars`}
                      >
                        {value <= 2 ? (
                          <ThumbsDown className="h-5 w-5" />
                        ) : (
                          <ThumbsUp className="h-5 w-5" />
                        )}
                        <span className="sr-only">{value}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Feedback Text */}
                <div className="mb-4">
                  <p className="mb-2 text-sm text-muted-foreground">
                    Comentarios (opcional)
                  </p>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="¿Qué podríamos mejorar?"
                    rows={4}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm 
                             text-white placeholder-muted-foreground transition-colors
                             focus:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || (!rating && !feedback.trim())}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 
                           text-sm font-medium text-white transition-all hover:bg-primary/90
                           disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Enviar Feedback</span>
                    </>
                  )}
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
