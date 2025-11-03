'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface KeyboardShortcutsProps {
  locale: 'en' | 'es';
}

const shortcuts = [
  { key: '/', description_en: 'Focus search', description_es: 'Enfocar búsqueda' },
  { key: 'n', description_en: 'New article', description_es: 'Nuevo artículo' },
  { key: 'c', description_en: 'Courses', description_es: 'Cursos' },
  { key: 't', description_en: 'Trending', description_es: 'Tendencias' },
  { key: 'k', description_en: 'Knowledge Graph', description_es: 'Grafo de Conocimiento' },
  { key: 'b', description_en: 'Bookmarks', description_es: 'Marcadores' },
  { key: '?', description_en: 'Show shortcuts', description_es: 'Mostrar atajos' },
  { key: 'Esc', description_en: 'Close modal', description_es: 'Cerrar modal' },
];

export function KeyboardShortcuts({ locale }: KeyboardShortcutsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const t = locale === 'en' ? {
    title: 'Keyboard Shortcuts',
    subtitle: 'Navigate faster with these shortcuts',
  } : {
    title: 'Atajos de Teclado',
    subtitle: 'Navega más rápido con estos atajos',
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Toggle shortcuts modal
      if (e.key === '?') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        return;
      }

      // Close modal
      if (e.key === 'Escape') {
        setIsOpen(false);
        return;
      }

      // Navigation shortcuts
      if (!isOpen) {
        switch (e.key) {
          case '/':
            e.preventDefault();
            document.querySelector<HTMLInputElement>('[data-search-input]')?.focus();
            break;
          case 'n':
            window.location.href = `/${locale}/news`;
            break;
          case 'c':
            window.location.href = `/${locale}/courses`;
            break;
          case 't':
            window.location.href = `/${locale}/trending`;
            break;
          case 'k':
            window.location.href = `/${locale}/knowledge-graph`;
            break;
          case 'b':
            window.location.href = `/${locale}/bookmarks`;
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [locale, isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl mx-4 p-8 rounded-3xl bg-background border border-white/10 shadow-2xl"
          >
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4"
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-primary/20">
                  <Keyboard className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-3xl font-bold">{t.title}</h2>
              </div>
              <p className="text-muted-foreground">{t.subtitle}</p>
            </div>

            {/* Shortcuts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shortcuts.map((shortcut, index) => (
                <motion.div
                  key={shortcut.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10"
                >
                  <span className="text-sm text-muted-foreground">
                    {locale === 'en' ? shortcut.description_en : shortcut.description_es}
                  </span>
                  <kbd className="px-3 py-1.5 text-sm font-mono font-semibold bg-background border border-white/20 rounded-lg shadow-sm">
                    {shortcut.key}
                  </kbd>
                </motion.div>
              ))}
            </div>

            {/* Footer Tip */}
            <div className="mt-6 p-4 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-sm text-center text-primary">
                Press <kbd className="px-2 py-1 text-xs font-mono bg-primary/20 rounded">?</kbd> anytime to toggle this panel
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
