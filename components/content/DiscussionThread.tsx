'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Send, 
  Heart, 
  Reply, 
  MoreVertical,
  Flag,
  Trash2,
  Edit3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  likes: number;
  isLiked: boolean;
  replies: Comment[];
  createdAt: string;
  updatedAt: string;
}

interface DiscussionThreadProps {
  contentId: string;
  contentType: 'article' | 'course';
  locale: 'en' | 'es';
}

export function DiscussionThread({ contentId, contentType, locale }: DiscussionThreadProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');

  const t = locale === 'en' ? {
    title: 'Discussion',
    writeComment: 'Write a comment...',
    post: 'Post',
    reply: 'Reply',
    like: 'Like',
    likes: 'likes',
    replies: 'replies',
    recent: 'Recent',
    popular: 'Popular',
    edit: 'Edit',
    delete: 'Delete',
    report: 'Report',
    noComments: 'No comments yet',
    beFirst: 'Be the first to comment!',
    cancel: 'Cancel',
  } : {
    title: 'Discusión',
    writeComment: 'Escribe un comentario...',
    post: 'Publicar',
    reply: 'Responder',
    like: 'Me gusta',
    likes: 'me gusta',
    replies: 'respuestas',
    recent: 'Recientes',
    popular: 'Populares',
    edit: 'Editar',
    delete: 'Eliminar',
    report: 'Reportar',
    noComments: 'Sin comentarios aún',
    beFirst: '¡Sé el primero en comentar!',
    cancel: 'Cancelar',
  };

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await fetch(
          `/api/comments?contentId=${contentId}&contentType=${contentType}&sortBy=${sortBy}`
        );
        const data = await response.json();
        if (response.ok) {
          setComments(data.data || []);
        }
      } catch (error) {
        console.error('Failed to load comments:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchComments();
  }, [contentId, contentType, sortBy]);

  const loadComments = async () => {
    try {
      const response = await fetch(
        `/api/comments?contentId=${contentId}&contentType=${contentType}&sortBy=${sortBy}`
      );
      const data = await response.json();
      if (response.ok) {
        setComments(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId,
          contentType,
          content: newComment,
        }),
      });

      if (response.ok) {
        setNewComment('');
        await loadComments();
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
    }
  };

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim()) return;

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId,
          contentType,
          content: replyContent,
          parentId,
        }),
      });

      if (response.ok) {
        setReplyContent('');
        setReplyingTo(null);
        await loadComments();
      }
    } catch (error) {
      console.error('Failed to post reply:', error);
    }
  };

  const handleLike = async (commentId: string) => {
    try {
      await fetch(`/api/comments/${commentId}/like`, {
        method: 'POST',
      });
      await loadComments();
    } catch (error) {
      console.error('Failed to like comment:', error);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      });
      await loadComments();
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const renderComment = (comment: Comment, depth = 0) => (
    <motion.div
      key={comment.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`${depth > 0 ? 'ml-12 mt-4' : 'mb-6'}`}
    >
      <div className="flex gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={comment.userAvatar} alt={comment.userName} />
          <AvatarFallback>{comment.userName[0]}</AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold">{comment.userName}</span>
              <span className="text-xs text-muted-foreground ml-2">
                {formatDistanceToNow(new Date(comment.createdAt), {
                  addSuffix: true,
                  locale: locale === 'es' ? es : enUS,
                })}
              </span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Edit3 className="mr-2 h-4 w-4" />
                  {t.edit}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(comment.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t.delete}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Flag className="mr-2 h-4 w-4" />
                  {t.report}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <p className="text-sm leading-relaxed">{comment.content}</p>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleLike(comment.id)}
              className={comment.isLiked ? 'text-red-500' : ''}
            >
              <Heart
                className={`mr-1 h-4 w-4 ${comment.isLiked ? 'fill-current' : ''}`}
              />
              {comment.likes > 0 && (
                <span className="text-xs">{comment.likes}</span>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingTo(comment.id)}
            >
              <Reply className="mr-1 h-4 w-4" />
              {t.reply}
            </Button>

            {comment.replies.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {comment.replies.length} {t.replies}
              </span>
            )}
          </div>

          {/* Reply Input */}
          <AnimatePresence>
            {replyingTo === comment.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex gap-2 mt-3"
              >
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={t.writeComment}
                  className="min-h-[80px]"
                />
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleReply(comment.id)}
                    disabled={!replyContent.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyContent('');
                    }}
                  >
                    {t.cancel}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Nested Replies */}
          {comment.replies.length > 0 && (
            <div className="mt-4">
              {comment.replies.map(reply => renderComment(reply, depth + 1))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          {t.title}
          {comments.length > 0 && (
            <span className="text-lg text-muted-foreground">
              ({comments.length})
            </span>
          )}
        </h3>

        <div className="flex gap-2">
          <Button
            variant={sortBy === 'recent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('recent')}
          >
            {t.recent}
          </Button>
          <Button
            variant={sortBy === 'popular' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('popular')}
          >
            {t.popular}
          </Button>
        </div>
      </div>

      {/* New Comment Input */}
      <div className="rounded-3xl bg-white/5 border border-white/10 p-4">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={t.writeComment}
          className="mb-3 min-h-[100px]"
        />
        <div className="flex justify-end">
          <Button
            onClick={handlePostComment}
            disabled={!newComment.trim()}
          >
            <Send className="mr-2 h-4 w-4" />
            {t.post}
          </Button>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 animate-pulse text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{t.noComments}</p>
            <p className="text-sm mt-1">{t.beFirst}</p>
          </div>
        ) : (
          <AnimatePresence>
            {comments.map(comment => renderComment(comment))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
