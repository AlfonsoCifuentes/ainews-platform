'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Highlighter, 
  MessageSquare, 
  Trash2, 
  Edit, 
  Save,
  X,
  Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface Highlight {
  id: string;
  text: string;
  note: string;
  color: string;
  position: {
    start: number;
    end: number;
  };
  createdAt: string;
}

interface HighlightSystemProps {
  contentId: string;
  locale: 'en' | 'es';
}

const COLORS = [
  { name: 'Yellow', value: 'bg-yellow-300/40', border: 'border-yellow-500' },
  { name: 'Blue', value: 'bg-blue-300/40', border: 'border-blue-500' },
  { name: 'Green', value: 'bg-green-300/40', border: 'border-green-500' },
  { name: 'Pink', value: 'bg-pink-300/40', border: 'border-pink-500' },
  { name: 'Purple', value: 'bg-purple-300/40', border: 'border-purple-500' },
];

export function HighlightSystem({ contentId, locale }: HighlightSystemProps) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [currentSelection, setCurrentSelection] = useState<{
    text: string;
    range: Range | null;
  } | null>(null);
  const [editingNote, setEditingNote] = useState<{
    id: string;
    text: string;
  } | null>(null);

  const t = locale === 'en' ? {
    highlight: 'Highlight',
    addNote: 'Add Note',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    yourNote: 'Your note...',
    highlights: 'Highlights',
    noHighlights: 'No highlights yet',
    selectText: 'Select text to highlight',
  } : {
    highlight: 'Resaltar',
    addNote: 'Añadir Nota',
    save: 'Guardar',
    cancel: 'Cancelar',
    edit: 'Editar',
    delete: 'Eliminar',
    yourNote: 'Tu nota...',
    highlights: 'Resaltados',
    noHighlights: 'Sin resaltados aún',
    selectText: 'Selecciona texto para resaltar',
  };

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const text = selection.toString().trim();
    if (text.length < 3) {
      setShowToolbar(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setCurrentSelection({ text, range });
    setToolbarPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
    setShowToolbar(true);
  };

  const handleHighlight = async (withNote = false) => {
    if (!currentSelection) return;

    const newHighlight: Highlight = {
      id: crypto.randomUUID(),
      text: currentSelection.text,
      note: '',
      color: selectedColor.value,
      position: {
        start: 0, // In real implementation, calculate from DOM
        end: currentSelection.text.length,
      },
      createdAt: new Date().toISOString(),
    };

    // Save to backend
    try {
      await fetch('/api/highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId,
          text: newHighlight.text,
          note: newHighlight.note,
          color: selectedColor.name.toLowerCase(),
        }),
      });

      setHighlights(prev => [...prev, newHighlight]);
      
      if (withNote) {
        setEditingNote({ id: newHighlight.id, text: '' });
      }
    } catch (error) {
      console.error('Failed to save highlight:', error);
    }

    setShowToolbar(false);
    window.getSelection()?.removeAllRanges();
  };

  const handleSaveNote = async () => {
    if (!editingNote) return;

    try {
      await fetch(`/api/highlights/${editingNote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: editingNote.text }),
      });

      setHighlights(prev =>
        prev.map(h =>
          h.id === editingNote.id ? { ...h, note: editingNote.text } : h
        )
      );
      setEditingNote(null);
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/highlights/${id}`, {
        method: 'DELETE',
      });

      setHighlights(prev => prev.filter(h => h.id !== id));
    } catch (error) {
      console.error('Failed to delete highlight:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Article content with highlighting */}
      <div
        onMouseUp={handleMouseUp}
        className="prose prose-invert max-w-none"
      >
        {/* Content goes here - in real implementation, wrap with highlight markers */}
      </div>

      {/* Selection Toolbar */}
      <AnimatePresence>
        {showToolbar && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            style={{
              position: 'fixed',
              left: toolbarPosition.x,
              top: toolbarPosition.y,
              transform: 'translateX(-50%) translateY(-100%)',
              zIndex: 50,
            }}
            className="flex items-center gap-2 p-2 rounded-xl bg-black/90 backdrop-blur-xl border border-white/20 shadow-2xl"
          >
            {/* Color Picker */}
            <div className="flex gap-1 pr-2 border-r border-white/20">
              {COLORS.map(color => (
                <button
                  key={color.name}
                  onClick={() => setSelectedColor(color)}
                  className={`w-6 h-6 rounded-full ${color.value} ${
                    selectedColor.name === color.name
                      ? `ring-2 ${color.border}`
                      : ''
                  }`}
                  title={color.name}
                />
              ))}
            </div>

            <Button
              size="sm"
              onClick={() => handleHighlight(false)}
              className="gap-2"
            >
              <Highlighter className="h-4 w-4" />
              {t.highlight}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleHighlight(true)}
              className="gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              {t.addNote}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowToolbar(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Highlights Sidebar */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="rounded-3xl bg-white/5 border border-white/10 p-6"
      >
        <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
          <Highlighter className="h-5 w-5 text-primary" />
          {t.highlights}
        </h3>

        {highlights.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Palette className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{t.noHighlights}</p>
            <p className="text-sm mt-1">{t.selectText}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {highlights.map((highlight) => (
              <motion.div
                key={highlight.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`p-4 rounded-xl ${highlight.color} border ${
                  COLORS.find(c => c.value === highlight.color)?.border
                }`}
              >
                <blockquote className="text-sm font-medium mb-2 border-l-2 pl-3 border-white/30">
                  &ldquo;{highlight.text}&rdquo;
                </blockquote>

                {editingNote?.id === highlight.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editingNote.text}
                      onChange={(e) =>
                        setEditingNote({ ...editingNote, text: e.target.value })
                      }
                      placeholder={t.yourNote}
                      className="min-h-[80px] bg-black/20"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveNote}>
                        <Save className="mr-2 h-4 w-4" />
                        {t.save}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingNote(null)}
                      >
                        {t.cancel}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {highlight.note && (
                      <p className="text-sm text-muted-foreground mb-3 bg-black/20 p-3 rounded-lg">
                        {highlight.note}
                      </p>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setEditingNote({ id: highlight.id, text: highlight.note })
                        }
                      >
                        <Edit className="mr-2 h-3 w-3" />
                        {t.edit}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(highlight.id)}
                        className="text-red-500 hover:text-red-400"
                      >
                        <Trash2 className="mr-2 h-3 w-3" />
                        {t.delete}
                      </Button>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
