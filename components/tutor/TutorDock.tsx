'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  Lightbulb,
  BookOpen,
  Brain,
  HelpCircle,
  Sparkles,
  Minimize2,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  action?: string;
}

interface TutorDockProps {
  contentId: string;
  contentType: 'article' | 'course' | 'module';
  contentTitle: string;
  contentContext?: string; // Summary or key points for RAG
  locale: 'en' | 'es';
  onFlashcardsGenerated?: () => void;
}

const QUICK_ACTIONS = {
  en: [
    { id: 'explain', icon: Lightbulb, label: 'Explain', prompt: 'Explain this concept in simpler terms' },
    { id: 'example', icon: BookOpen, label: 'Example', prompt: 'Give me a practical example of this' },
    { id: 'quiz', icon: HelpCircle, label: 'Quiz Me', prompt: 'Create a quick quiz to test my understanding' },
    { id: 'flashcards', icon: Brain, label: 'Flashcards', prompt: 'Generate flashcards for key concepts' },
  ],
  es: [
    { id: 'explain', icon: Lightbulb, label: 'Explicar', prompt: 'Explica este concepto de forma más simple' },
    { id: 'example', icon: BookOpen, label: 'Ejemplo', prompt: 'Dame un ejemplo práctico de esto' },
    { id: 'quiz', icon: HelpCircle, label: 'Quiz', prompt: 'Crea un quiz rápido para probar mi comprensión' },
    { id: 'flashcards', icon: Brain, label: 'Tarjetas', prompt: 'Genera tarjetas de estudio para los conceptos clave' },
  ],
};

const UI_TEXT = {
  en: {
    title: 'AI Tutor',
    subtitle: 'Ask me anything about this content',
    placeholder: 'Ask a question...',
    thinking: 'Thinking...',
    welcome: "Hi! I'm your AI tutor for this content. How can I help you understand it better?",
    errorMessage: 'Sorry, I encountered an error. Please try again.',
    minimize: 'Minimize',
    expand: 'Expand',
    close: 'Close',
  },
  es: {
    title: 'Tutor IA',
    subtitle: 'Pregúntame lo que quieras sobre este contenido',
    placeholder: 'Haz una pregunta...',
    thinking: 'Pensando...',
    welcome: '¡Hola! Soy tu tutor IA para este contenido. ¿Cómo puedo ayudarte a entenderlo mejor?',
    errorMessage: 'Lo siento, encontré un error. Por favor, intenta de nuevo.',
    minimize: 'Minimizar',
    expand: 'Expandir',
    close: 'Cerrar',
  },
};

export function TutorDock({
  contentId,
  contentType,
  contentTitle,
  contentContext,
  locale,
  onFlashcardsGenerated,
}: TutorDockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const t = UI_TEXT[locale];
  const actions = QUICK_ACTIONS[locale];

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: t.welcome,
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, messages.length, t.welcome]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const sendMessage = useCallback(async (userMessage: string, actionId?: string) => {
    if (!userMessage.trim() || isLoading) return;

    const newUserMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
      action: actionId,
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId,
          contentType,
          contentTitle,
          contentContext,
          message: userMessage,
          action: actionId,
          locale,
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to get response');

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If flashcards were generated, notify parent
      if (actionId === 'flashcards' && data.flashcardsGenerated) {
        onFlashcardsGenerated?.();
      }
    } catch (error) {
      console.error('Tutor error:', error);
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: t.errorMessage,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [contentId, contentType, contentTitle, contentContext, locale, messages, isLoading, t.errorMessage, onFlashcardsGenerated]);

  const handleQuickAction = (action: typeof actions[0]) => {
    sendMessage(action.prompt, action.id);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Floating button when closed
  if (!isOpen) {
    return (
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-white shadow-lg shadow-primary/30 flex items-center justify-center"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
          <Sparkles className="w-2.5 h-2.5" />
        </span>
      </motion.button>
    );
  }

  // Minimized bar
  if (isMinimized) {
    return (
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0b14] border-t border-white/10"
      >
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{t.title}</p>
              <p className="text-xs text-white/50">{contentTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(false)}
              className="text-white/70 hover:text-white"
            >
              <ChevronUp className="w-4 h-4 mr-1" />
              {t.expand}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-white/50 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Full dock panel
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25 }}
      className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[420px] bg-[#0a0b14] border-l border-white/10 flex flex-col shadow-2xl"
    >
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-amber-500/20 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-white">{t.title}</h3>
              <p className="text-xs text-white/50 truncate max-w-[200px]">{contentTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(true)}
              className="text-white/50 hover:text-white h-8 w-8"
              title={t.minimize}
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-white/50 hover:text-white h-8 w-8"
              title={t.close}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/5">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {actions.map((action) => (
            <motion.button
              key={action.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleQuickAction(action)}
              disabled={isLoading}
              className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10 text-white/70 text-sm font-medium hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
            >
              <action.icon className="w-4 h-4" />
              {action.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-primary" />
                </div>
              )}
              
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-white'
                    : 'bg-white/5 border border-white/10 text-white'
                }`}
              >
                {message.action && (
                  <div className="text-xs text-white/50 mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {actions.find(a => a.id === message.action)?.label}
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                <p className="text-[10px] opacity-40 mt-1">
                  {message.timestamp.toLocaleTimeString(locale, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
              <p className="text-sm text-white/50">{t.thinking}</p>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-white/10 bg-white/[0.01]">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={t.placeholder}
            className="flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
            rows={1}
            disabled={isLoading}
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-11 w-11 rounded-xl"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
