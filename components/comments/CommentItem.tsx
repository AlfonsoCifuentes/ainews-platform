"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Reply, Edit, Trash2, MoreVertical } from 'lucide-react';
import Image from 'next/image';
import { formatRelativeTimeFromNow } from '@/lib/utils/dates';
import { CommentForm } from './CommentForm';

interface CommentItemProps {
  comment: any;
  currentUserId?: string;
  locale: 'en' | 'es';
  onUpdate?: () => void;
  onDelete?: (id: string) => void;
  onReact?: (id: string) => void;
  isReply?: boolean;
}

export function CommentItem({
  comment,
  currentUserId,
  locale,
  onUpdate,
  onDelete,
  onReact,
  isReply = false,
}: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);

  const isOwner = currentUserId === comment.user_id;
  const likeCount = comment.comment_reactions?.length || 0;
  const hasLiked = comment.comment_reactions?.some(
    (r: any) => r.user_id === currentUserId
  );

  const translations = {
    en: {
      reply: 'Reply',
      edit: 'Edit',
      delete: 'Delete',
      edited: '(edited)',
      cancel: 'Cancel',
      save: 'Save',
    },
    es: {
      reply: 'Responder',
      edit: 'Editar',
      delete: 'Eliminar',
      edited: '(editado)',
      cancel: 'Cancelar',
      save: 'Guardar',
    },
  }[locale];

  const handleEdit = async () => {
    try {
      const response = await fetch(`/api/comments?id=${comment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editedContent }),
      });

      if (response.ok) {
        setIsEditing(false);
        onUpdate?.();
      }
    } catch (error) {
      console.error('Failed to edit comment:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const response = await fetch(`/api/comments?id=${comment.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDelete?.(comment.id);
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  return (
    <div className={`space-y-3 ${isReply ? 'ml-12' : ''}`}>
      <div className="flex gap-3">
        {/* User Avatar */}
        <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border-2 border-primary/50">
          {comment.user_profiles?.avatar_url ? (
            <Image
              src={comment.user_profiles.avatar_url}
              alt={comment.user_profiles.display_name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/20 text-sm font-bold">
              {comment.user_profiles?.display_name?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Comment Content */}
        <div className="flex-1 space-y-2">
          <div className="rounded-xl border border-white/20 bg-black/20 p-4 backdrop-blur-xl">
            {/* Header */}
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {comment.user_profiles?.display_name || 'Anonymous'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTimeFromNow(comment.created_at, locale)}
                </span>
                {comment.is_edited && (
                  <span className="text-xs text-muted-foreground italic">
                    {translations.edited}
                  </span>
                )}
              </div>

              {/* Menu for owner */}
              {isOwner && (
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="rounded-full p-1 hover:bg-white/10"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {showMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute right-0 top-8 z-10 rounded-xl border border-white/20 bg-black/90 p-2 backdrop-blur-xl"
                    >
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setShowMenu(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-sm hover:bg-white/10"
                      >
                        <Edit className="h-4 w-4" />
                        {translations.edit}
                      </button>
                      <button
                        onClick={() => {
                          handleDelete();
                          setShowMenu(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                        {translations.delete}
                      </button>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* Content */}
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleEdit}
                    className="rounded-lg bg-primary px-4 py-1 text-sm font-semibold"
                  >
                    {translations.save}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditedContent(comment.content);
                    }}
                    className="rounded-lg border border-white/20 px-4 py-1 text-sm"
                  >
                    {translations.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm leading-relaxed">{comment.content}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={() => onReact?.(comment.id)}
              className={`flex items-center gap-1 transition-colors ${
                hasLiked ? 'text-red-400' : 'text-muted-foreground hover:text-red-400'
              }`}
            >
              <Heart className={`h-4 w-4 ${hasLiked ? 'fill-current' : ''}`} />
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>

            {!isReply && (
              <button
                onClick={() => setIsReplying(!isReplying)}
                className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-white"
              >
                <Reply className="h-4 w-4" />
                {translations.reply}
              </button>
            )}
          </div>

          {/* Reply Form */}
          {isReplying && (
            <CommentForm
              articleId={comment.article_id}
              courseId={comment.course_id}
              parentCommentId={comment.id}
              onSuccess={() => {
                setIsReplying(false);
                onUpdate?.();
              }}
              placeholder="Write a reply..."
              buttonText={translations.reply}
            />
          )}
        </div>
      </div>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3">
          {comment.replies.map((reply: any) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              locale={locale}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onReact={onReact}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  );
}
