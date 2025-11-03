"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface CommentFormProps {
  articleId?: string;
  courseId?: string;
  parentCommentId?: string;
  onSuccess?: () => void;
  placeholder?: string;
  buttonText?: string;
  userAvatar?: string | null;
}

export function CommentForm({
  articleId,
  courseId,
  parentCommentId,
  onSuccess,
  placeholder = 'Write a comment...',
  buttonText = 'Post Comment',
  userAvatar,
}: CommentFormProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId,
          courseId,
          parentCommentId,
          content,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setContent('');
        onSuccess?.();
        
        // Trigger comment posted event for badge checking
        window.dispatchEvent(new CustomEvent('comment-posted', {
          detail: { articleId, courseId, parentCommentId }
        }));
      } else {
        setError(data.error || 'Failed to post comment');
      }
    } catch {
      setError('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-3">
        {/* User Avatar */}
        {userAvatar && (
          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border-2 border-primary/50">
            <Image src={userAvatar} alt="Your avatar" fill className="object-cover" />
          </div>
        )}

        {/* Comment Input */}
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder}
            rows={3}
            maxLength={5000}
            className="w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-sm backdrop-blur-xl transition-all placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{content.length}/5000</span>
            {error && <span className="text-red-400">{error}</span>}
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Posting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              {buttonText}
            </>
          )}
        </motion.button>
      </div>
    </form>
  );
}
