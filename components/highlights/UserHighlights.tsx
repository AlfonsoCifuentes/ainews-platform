'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Highlighter,
  MessageSquare,
  Trash2,
  ChevronDown,
  ChevronUp,
  StickyNote,
  Plus,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Highlight {
  id: string;
  selection: string;
  note?: string;
  color: 'yellow' | 'green' | 'blue' | 'pink';
  createdAt: Date;
  position?: { start: number; end: number };
}

interface UserHighlightsProps {
  contentId: string;
  contentType: 'article' | 'course' | 'module';
  locale: 'en' | 'es';
  onHighlightClick?: (highlight: Highlight) => void;
}

const HIGHLIGHT_COLORS = {
  yellow: { bg: 'bg-yellow-500/30', border: 'border-yellow-500/50', text: 'text-yellow-400' },
  green: { bg: 'bg-green-500/30', border: 'border-green-500/50', text: 'text-green-400' },
  blue: { bg: 'bg-blue-500/30', border: 'border-blue-500/50', text: 'text-blue-400' },
  pink: { bg: 'bg-pink-500/30', border: 'border-pink-500/50', text: 'text-pink-400' },
};

const UI_TEXT = {
  en: {
    title: 'Notes & Highlights',
    noHighlights: 'No highlights yet',
    noHighlightsDesc: 'Select text to highlight and add notes',
    addNote: 'Add note',
    deleteHighlight: 'Delete',
    notePlaceholder: 'Add a note...',
    save: 'Save',
    cancel: 'Cancel',
    showAll: 'Show all',
    hideOlder: 'Hide older',
    colorLabel: 'Color',
  },
  es: {
    title: 'Notas y Subrayados',
    noHighlights: 'Sin subrayados aún',
    noHighlightsDesc: 'Selecciona texto para subrayar y añadir notas',
    addNote: 'Añadir nota',
    deleteHighlight: 'Eliminar',
    notePlaceholder: 'Añade una nota...',
    save: 'Guardar',
    cancel: 'Cancelar',
    showAll: 'Mostrar todos',
    hideOlder: 'Ocultar antiguos',
    colorLabel: 'Color',
  },
};

export function UserHighlights({
  contentId,
  contentType,
  locale,
  onHighlightClick,
}: UserHighlightsProps) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const t = UI_TEXT[locale];

  // Load highlights from API
  useEffect(() => {
    const fetchHighlights = async () => {
      try {
        const response = await fetch(
          `/api/highlights?contentId=${contentId}&contentType=${contentType}`
        );
        if (response.ok) {
          const data = await response.json();
          setHighlights(
            (data.data || []).map((h: Record<string, unknown>) => ({
              ...h,
              createdAt: new Date(h.createdAt as string),
            }))
          );
        }
      } catch (error) {
        console.error('Failed to load highlights:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHighlights();
  }, [contentId, contentType]);

  // Handle text selection
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const selectedText = selection.toString().trim();
      if (selectedText.length < 3) return;

      // Store selection for potential highlight creation
      // This would integrate with a floating toolbar
    };

    document.addEventListener('mouseup', handleSelection);
    return () => document.removeEventListener('mouseup', handleSelection);
  }, []);

  const _createHighlight = useCallback(async (
    selection: string,
    color: Highlight['color'] = 'yellow',
    note?: string
  ) => {
    try {
      const response = await fetch('/api/highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId,
          contentType,
          selection,
          color,
          note,
        }),
      });

      if (response.ok) {
        const { data } = await response.json();
        setHighlights(prev => [
          { ...data, createdAt: new Date(data.createdAt) },
          ...prev,
        ]);
      }
    } catch (error) {
      console.error('Failed to create highlight:', error);
    }
  }, [contentId, contentType]);

  const updateNote = async (highlightId: string, note: string) => {
    try {
      const response = await fetch(`/api/highlights/${highlightId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });

      if (response.ok) {
        setHighlights(prev =>
          prev.map(h => (h.id === highlightId ? { ...h, note } : h))
        );
        setEditingId(null);
        setEditNote('');
      }
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  const deleteHighlight = async (highlightId: string) => {
    try {
      const response = await fetch(`/api/highlights/${highlightId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setHighlights(prev => prev.filter(h => h.id !== highlightId));
      }
    } catch (error) {
      console.error('Failed to delete highlight:', error);
    }
  };

  const displayedHighlights = showAll ? highlights : highlights.slice(0, 5);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-32 bg-white/10 rounded" />
          <div className="h-16 bg-white/5 rounded" />
          <div className="h-16 bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Highlighter className="w-4 h-4 text-yellow-400" />
          <span className="font-semibold text-white">{t.title}</span>
          <span className="text-xs text-white/40 bg-white/10 px-2 py-0.5 rounded-full">
            {highlights.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-white/40" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/40" />
        )}
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 space-y-3">
              {highlights.length === 0 ? (
                <div className="text-center py-8">
                  <StickyNote className="w-10 h-10 mx-auto mb-3 text-white/20" />
                  <p className="text-sm text-white/50">{t.noHighlights}</p>
                  <p className="text-xs text-white/30 mt-1">{t.noHighlightsDesc}</p>
                </div>
              ) : (
                <>
                  {displayedHighlights.map((highlight) => (
                    <motion.div
                      key={highlight.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-lg border ${HIGHLIGHT_COLORS[highlight.color].border} ${HIGHLIGHT_COLORS[highlight.color].bg} p-3`}
                    >
                      {/* Selection text */}
                      <p
                        className="text-sm text-white/90 leading-relaxed cursor-pointer hover:text-white"
                        onClick={() => onHighlightClick?.(highlight)}
                      >
                        &ldquo;{highlight.selection}&rdquo;
                      </p>

                      {/* Note section */}
                      {editingId === highlight.id ? (
                        <div className="mt-3 space-y-2">
                          <textarea
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            placeholder={t.notePlaceholder}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => updateNote(highlight.id, editNote)}
                              className="text-xs"
                            >
                              {t.save}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingId(null);
                                setEditNote('');
                              }}
                              className="text-xs"
                            >
                              {t.cancel}
                            </Button>
                          </div>
                        </div>
                      ) : highlight.note ? (
                        <div className="mt-2 flex items-start gap-2">
                          <MessageSquare className="w-3 h-3 text-white/40 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-white/60">{highlight.note}</p>
                        </div>
                      ) : null}

                      {/* Actions */}
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] text-white/30">
                          {highlight.createdAt.toLocaleDateString(locale)}
                        </span>
                        <div className="flex items-center gap-1">
                          {!highlight.note && editingId !== highlight.id && (
                            <button
                              onClick={() => {
                                setEditingId(highlight.id);
                                setEditNote('');
                              }}
                              className="p-1 text-white/30 hover:text-white/60 transition-colors"
                              title={t.addNote}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteHighlight(highlight.id)}
                            className="p-1 text-white/30 hover:text-red-400 transition-colors"
                            title={t.deleteHighlight}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {/* Show more/less */}
                  {highlights.length > 5 && (
                    <button
                      onClick={() => setShowAll(!showAll)}
                      className="w-full text-center text-xs text-primary hover:text-primary/80 py-2"
                    >
                      {showAll ? t.hideOlder : `${t.showAll} (${highlights.length - 5} more)`}
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Floating toolbar for text selection - shows highlight options
 */
export function HighlightToolbar({
  position,
  onHighlight,
  onClose,
  locale: _locale,
}: {
  position: { x: number; y: number };
  onHighlight: (color: Highlight['color']) => void;
  onClose: () => void;
  locale: 'en' | 'es';
}) {
  const colors: Highlight['color'][] = ['yellow', 'green', 'blue', 'pink'];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      style={{ left: position.x, top: position.y }}
      className="fixed z-50 flex items-center gap-1 p-1.5 rounded-lg bg-[#1a1b2e] border border-white/10 shadow-xl"
    >
      {colors.map((color) => (
        <button
          key={color}
          onClick={() => onHighlight(color)}
          className={`w-6 h-6 rounded-full ${HIGHLIGHT_COLORS[color].bg} border ${HIGHLIGHT_COLORS[color].border} hover:scale-110 transition-transform`}
        />
      ))}
      <div className="w-px h-4 bg-white/10 mx-1" />
      <button
        onClick={onClose}
        className="p-1 text-white/40 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
