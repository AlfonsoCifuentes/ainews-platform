"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Loader2 } from 'lucide-react';
import { CommentForm } from './CommentForm';
import { CommentItem } from './CommentItem';
import { useUser } from '@/lib/hooks/useUser';
import type { Comment } from '@/types/comments';

interface CommentsSectionProps {
  articleId?: string;
  courseId?: string;
  locale: 'en' | 'es';
}

export function CommentsSection({ articleId, courseId, locale }: CommentsSectionProps) {
  const { profile } = useUser();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const translations = {
    en: {
      title: 'Comments',
      count: (n: number) => `${n} ${n === 1 ? 'comment' : 'comments'}`,
      signInToComment: 'Sign in to comment',
      noComments: 'No comments yet',
      beFirst: 'Be the first to comment!',
    },
    es: {
      title: 'Comentarios',
      count: (n: number) => `${n} ${n === 1 ? 'comentario' : 'comentarios'}`,
      signInToComment: 'Inicia sesión para comentar',
      noComments: 'No hay comentarios aún',
      beFirst: '¡Sé el primero en comentar!',
    },
  }[locale];

  useEffect(() => {
    fetchComments();
  }, [articleId, courseId]);

  const fetchComments = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (articleId) params.set('articleId', articleId);
      if (courseId) params.set('courseId', courseId);

      const response = await fetch(`/api/comments?${params}`);
      const data = await response.json();

      if (response.ok) {
        setComments(data.comments || []);
      } else {
        throw new Error(data.error || 'Failed to fetch comments');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReact = async (commentId: string) => {
    try {
      await fetch(`/api/comments/react?commentId=${commentId}`, {
        method: 'POST',
      });
      fetchComments(); // Refresh to show updated reactions
    } catch (error) {
      console.error('Failed to react:', error);
    }
  };

  const handleDelete = (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  return (
    <section className="py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <MessageCircle className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">{translations.title}</h2>
          <span className="rounded-full bg-primary/20 px-3 py-1 text-sm font-semibold text-primary">
            {translations.count(comments.length)}
          </span>
        </div>

        {/* Comment Form */}
        {profile ? (
          <CommentForm
            articleId={articleId}
            courseId={courseId}
            onSuccess={fetchComments}
            userAvatar={profile.avatar_url}
          />
        ) : (
          <div className="rounded-xl border border-white/20 bg-black/20 p-6 text-center backdrop-blur-xl">
            <p className="text-muted-foreground">{translations.signInToComment}</p>
          </div>
        )}

        {/* Comments List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-400">
            {error}
          </div>
        ) : comments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-white/20 bg-black/20 p-12 text-center backdrop-blur-xl"
          >
            <MessageCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-xl font-semibold">{translations.noComments}</p>
            <p className="mt-2 text-muted-foreground">{translations.beFirst}</p>
          </motion.div>
        ) : (
          <AnimatePresence>
            <div className="space-y-6">
              {comments.map((comment, index) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <CommentItem
                    comment={comment}
                    currentUserId={profile?.id}
                    locale={locale}
                    onUpdate={fetchComments}
                    onDelete={handleDelete}
                    onReact={handleReact}
                  />
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}
