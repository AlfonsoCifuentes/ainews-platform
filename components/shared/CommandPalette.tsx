'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  FileText,
  BookOpen,
  TrendingUp,
  Bookmark,
  Settings,
  User,
  Home,
  Network,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface CommandPaletteProps {
  locale: 'en' | 'es';
}

interface Command {
  id: string;
  title: string;
  subtitle?: string;
  icon: typeof FileText;
  action: () => void;
  keywords: string[];
}

export function CommandPalette({ locale }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: Command[] = [
    {
      id: 'home',
      title: locale === 'en' ? 'Go to Home' : 'Ir al Inicio',
      icon: Home,
      action: () => (window.location.href = `/${locale}`),
      keywords: ['home', 'inicio', 'start'],
    },
    {
      id: 'news',
      title: locale === 'en' ? 'Browse News' : 'Ver Noticias',
      subtitle: locale === 'en' ? 'Latest AI articles' : 'Últimos artículos de IA',
      icon: FileText,
      action: () => (window.location.href = `/${locale}/news`),
      keywords: ['news', 'noticias', 'articles', 'artículos'],
    },
    {
      id: 'courses',
      title: locale === 'en' ? 'Explore Courses' : 'Explorar Cursos',
      subtitle: locale === 'en' ? 'AI learning paths' : 'Rutas de aprendizaje IA',
      icon: BookOpen,
      action: () => (window.location.href = `/${locale}/courses`),
      keywords: ['courses', 'cursos', 'learn', 'aprender'],
    },
    {
      id: 'trending',
      title: locale === 'en' ? 'View Trending' : 'Ver Tendencias',
      subtitle: locale === 'en' ? 'Popular content' : 'Contenido popular',
      icon: TrendingUp,
      action: () => (window.location.href = `/${locale}/trending`),
      keywords: ['trending', 'tendencias', 'popular', 'hot'],
    },
    {
      id: 'kg',
      title: locale === 'en' ? 'Knowledge Graph' : 'Grafo de Conocimiento',
      subtitle: locale === 'en' ? 'AI entity connections' : 'Conexiones de entidades IA',
      icon: Network,
      action: () => (window.location.href = `/${locale}/knowledge-graph`),
      keywords: ['graph', 'grafo', 'knowledge', 'conocimiento', 'entities'],
    },
    {
      id: 'bookmarks',
      title: locale === 'en' ? 'My Bookmarks' : 'Mis Marcadores',
      subtitle: locale === 'en' ? 'Saved articles' : 'Artículos guardados',
      icon: Bookmark,
      action: () => (window.location.href = `/${locale}/bookmarks`),
      keywords: ['bookmarks', 'marcadores', 'saved', 'guardados'],
    },
    {
      id: 'profile',
      title: locale === 'en' ? 'My Profile' : 'Mi Perfil',
      subtitle: locale === 'en' ? 'View your progress' : 'Ver tu progreso',
      icon: User,
      action: () => (window.location.href = `/${locale}/profile`),
      keywords: ['profile', 'perfil', 'account', 'cuenta'],
    },
    {
      id: 'settings',
      title: locale === 'en' ? 'Settings' : 'Configuración',
      subtitle: locale === 'en' ? 'Preferences' : 'Preferencias',
      icon: Settings,
      action: () => (window.location.href = `/${locale}/settings`),
      keywords: ['settings', 'configuración', 'preferences', 'preferencias'],
    },
  ];

  const filteredCommands = commands.filter((cmd) => {
    const searchStr = query.toLowerCase();
    return (
      cmd.title.toLowerCase().includes(searchStr) ||
      cmd.subtitle?.toLowerCase().includes(searchStr) ||
      cmd.keywords.some((k) => k.toLowerCase().includes(searchStr))
    );
  });

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Open with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        return;
      }

      if (!isOpen) return;

      // Navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          setIsOpen(false);
          setQuery('');
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, selectedIndex, filteredCommands]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm pt-[20vh]"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl mx-4 rounded-3xl bg-background border border-white/10 shadow-2xl overflow-hidden"
          >
            {/* Search Input */}
            <div className="relative p-4 border-b border-white/10">
              <Search className="absolute left-8 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  locale === 'en'
                    ? 'Search for commands...'
                    : 'Buscar comandos...'
                }
                className="pl-12 pr-4 bg-transparent border-none focus:ring-0"
                autoFocus
              />
            </div>

            {/* Results */}
            <div className="max-h-[400px] overflow-y-auto p-2">
              {filteredCommands.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  {locale === 'en' ? 'No results found' : 'No se encontraron resultados'}
                </div>
              ) : (
                filteredCommands.map((cmd, index) => {
                  const Icon = cmd.icon;
                  return (
                    <motion.button
                      key={cmd.id}
                      onClick={() => {
                        cmd.action();
                        setIsOpen(false);
                        setQuery('');
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all ${
                        index === selectedIndex
                          ? 'bg-primary/20 border border-primary/30'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg ${
                          index === selectedIndex
                            ? 'bg-primary text-white'
                            : 'bg-white/10'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{cmd.title}</div>
                        {cmd.subtitle && (
                          <div className="text-sm text-muted-foreground">
                            {cmd.subtitle}
                          </div>
                        )}
                      </div>
                    </motion.button>
                  );
                })
              )}
            </div>

            {/* Footer Hint */}
            <div className="p-3 border-t border-white/10 bg-white/5">
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-background border border-white/20 rounded">↑↓</kbd>
                  {locale === 'en' ? 'Navigate' : 'Navegar'}
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-background border border-white/20 rounded">↵</kbd>
                  {locale === 'en' ? 'Select' : 'Seleccionar'}
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-background border border-white/20 rounded">Esc</kbd>
                  {locale === 'en' ? 'Close' : 'Cerrar'}
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
