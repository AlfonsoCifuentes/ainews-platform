'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Lock, Download, Sparkles, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import { isBrowserLLMReady, getBrowserLLM } from '@/lib/ai/browser-llm';
import { ModelDownloader } from '@/components/ai/ModelDownloader';
import { useWebLLM } from '@/hooks/use-web-llm';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

interface ChatGPTInterfaceClientProps {
  locale: string;
}

export function ChatGPTInterfaceClient({ locale }: ChatGPTInterfaceClientProps) {
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: '1',
      title: locale === 'es' ? 'Nueva conversación' : 'New conversation',
      messages: [],
      createdAt: new Date(),
    },
  ]);
  const [currentConversationId, setCurrentConversationId] = useState('1');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [showDownloader, setShowDownloader] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // WebLLM hook for automatic detection
  const { cachedModels } = useWebLLM({
    autoLoadFromCache: false
  });

  const currentConversation = conversations.find(c => c.id === currentConversationId);

  // Check model ready status only on client side - detect both legacy and WebLLM
  useEffect(() => {
    const hasLegacyModel = isBrowserLLMReady();
    const hasWebLLMModels = cachedModels.length > 0;
    setModelReady(hasLegacyModel || hasWebLLMModels);
  }, [cachedModels]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentConversation?.messages]);

  const createNewConversation = () => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: locale === 'es' ? 'Nueva conversación' : 'New conversation',
      messages: [],
      createdAt: new Date(),
    };
    setConversations(prev => [newConv, ...prev]);
    setCurrentConversationId(newConv.id);
  };

  const deleteConversation = (id: string) => {
    if (conversations.length === 1) return;
    setConversations(prev => prev.filter(c => c.id !== id));
    if (currentConversationId === id) {
      setCurrentConversationId(conversations[0].id);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !currentConversation) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    // Update conversation with user message
    setConversations(prev =>
      prev.map(conv =>
        conv.id === currentConversationId
          ? {
              ...conv,
              messages: [...conv.messages, userMessage],
              title: conv.messages.length === 0 ? input.trim().slice(0, 50) : conv.title,
            }
          : conv
      )
    );

    setInput('');
    setIsLoading(true);

    try {
      const llm = getBrowserLLM();
      if (!llm) {
        throw new Error('Model not initialized');
      }

      const systemPrompt = locale === 'es'
        ? 'Eres un asistente de IA avanzado y útil, similar a ChatGPT. Responde de manera clara, detallada y educativa. Usa formato Markdown cuando sea apropiado.'
        : 'You are an advanced and helpful AI assistant, similar to ChatGPT. Respond clearly, in detail, and educationally. Use Markdown formatting when appropriate.';

      // Build context from conversation history
      const contextMessages = currentConversation.messages.slice(-4); // Last 4 messages for context
      const context = contextMessages
        .map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`)
        .join('\n\n');

      const prompt = `${systemPrompt}\n\n${context ? context + '\n\n' : ''}Usuario: ${userMessage.content}\n\nAsistente:`;

      const response = await llm.generate(prompt, {
        maxTokens: 800,
        temperature: 0.7,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setConversations(prev =>
        prev.map(conv =>
          conv.id === currentConversationId
            ? { ...conv, messages: [...conv.messages, assistantMessage] }
            : conv
        )
      );
    } catch (error) {
      console.error('Error generating response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: locale === 'es'
          ? 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.'
          : 'Sorry, there was an error processing your message. Please try again.',
        timestamp: new Date(),
      };
      setConversations(prev =>
        prev.map(conv =>
          conv.id === currentConversationId
            ? { ...conv, messages: [...conv.messages, errorMessage] }
            : conv
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!modelReady) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <Card className="border-2 border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 p-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Lock className="w-10 h-10 text-yellow-500" />
              <div>
                <h2 className="text-3xl font-bold">
                  {locale === 'es' ? '🔒 Función Premium Bloqueada' : '🔒 Premium Feature Locked'}
                </h2>
                <p className="text-muted-foreground mt-2">
                  {locale === 'es'
                    ? 'El Chat IA estilo ChatGPT se desbloquea al descargar el modelo local'
                    : 'ChatGPT-style AI Chat unlocks when you download the local model'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-yellow-500" />
                {locale === 'es' ? 'Funciones Exclusivas del Chat IA:' : 'Exclusive AI Chat Features:'}
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl mt-1">✓</span>
                  <div>
                    <strong className="text-base">
                      {locale === 'es' ? 'Interfaz Familiar Tipo ChatGPT' : 'Familiar ChatGPT-Like Interface'}
                    </strong>
                    <p className="text-sm text-muted-foreground">
                      {locale === 'es'
                        ? 'Misma experiencia que ChatGPT, pero 100% gratis y privado'
                        : 'Same experience as ChatGPT, but 100% free and private'}
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl mt-1">✓</span>
                  <div>
                    <strong className="text-base">
                      {locale === 'es' ? 'Conversaciones Múltiples' : 'Multiple Conversations'}
                    </strong>
                    <p className="text-sm text-muted-foreground">
                      {locale === 'es'
                        ? 'Gestiona múltiples chats simultáneos con contexto independiente'
                        : 'Manage multiple simultaneous chats with independent context'}
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl mt-1">✓</span>
                  <div>
                    <strong className="text-base">
                      {locale === 'es' ? 'Sin Límites de Uso' : 'Unlimited Usage'}
                    </strong>
                    <p className="text-sm text-muted-foreground">
                      {locale === 'es'
                        ? 'Chatea todo lo que quieras, sin restricciones de tokens o mensajes'
                        : 'Chat as much as you want, no token or message restrictions'}
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl mt-1">✓</span>
                  <div>
                    <strong className="text-base">
                      {locale === 'es' ? 'Memoria de Contexto' : 'Context Memory'}
                    </strong>
                    <p className="text-sm text-muted-foreground">
                      {locale === 'es'
                        ? 'La IA recuerda las últimas 4 interacciones para conversaciones coherentes'
                        : 'AI remembers last 4 interactions for coherent conversations'}
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-xl mt-1">✓</span>
                  <div>
                    <strong className="text-base">
                      {locale === 'es' ? 'Privacidad Total' : 'Complete Privacy'}
                    </strong>
                    <p className="text-sm text-muted-foreground">
                      {locale === 'es'
                        ? 'Tus conversaciones NUNCA se envían a servidores externos'
                        : 'Your conversations are NEVER sent to external servers'}
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-blue-500/10 border-2 border-blue-500/20 rounded-xl p-4">
              <p className="text-sm">
                <strong className="text-blue-300">
                  {locale === 'es' ? '💎 Valor Premium:' : '💎 Premium Value:'}
                </strong>{' '}
                {locale === 'es'
                  ? 'ChatGPT Plus cuesta $20/mes. Aquí lo tienes GRATIS descargando el modelo una sola vez.'
                  : 'ChatGPT Plus costs $20/month. Here you get it FREE by downloading the model just once.'}
              </p>
            </div>

            <Button
              onClick={() => setShowDownloader(true)}
              className="w-full gap-2"
              size="lg"
            >
              <Download className="w-5 h-5" />
              {locale === 'es' ? 'Descargar Modelo y Desbloquear Chat IA' : 'Download Model & Unlock AI Chat'}
            </Button>
          </div>
        </Card>

        {showDownloader && (
          <ModelDownloader
            onComplete={() => {
              setShowDownloader(false);
              setModelReady(true);
            }}
            onSkip={() => setShowDownloader(false)}
            autoShow
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="w-64 border-r border-border/50 bg-card/30 backdrop-blur-xl p-4 space-y-4 overflow-y-auto"
          >
            <Button
              onClick={createNewConversation}
              className="w-full gap-2"
              variant="outline"
            >
              <Plus className="w-4 h-4" />
              {locale === 'es' ? 'Nueva conversación' : 'New conversation'}
            </Button>

            <div className="space-y-2">
              {conversations.map(conv => (
                <div
                  key={conv.id}
                  className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                    conv.id === currentConversationId
                      ? 'bg-primary/20 border border-primary/50'
                      : 'hover:bg-muted border border-transparent'
                  }`}
                  onClick={() => setCurrentConversationId(conv.id)}
                >
                  <p className="text-sm font-medium truncate pr-8">{conv.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {conv.messages.length} {locale === 'es' ? 'mensajes' : 'messages'}
                  </p>
                  {conversations.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id);
                      }}
                      className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4 text-red-500 hover:text-red-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-purple-500/5 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold">
                  {locale === 'es' ? 'Chat IA Local' : 'Local AI Chat'}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {locale === 'es' ? 'Estilo ChatGPT - 100% Privado' : 'ChatGPT Style - 100% Private'}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowSidebar(!showSidebar)}
              variant="ghost"
              size="sm"
            >
              {showSidebar ? '←' : '→'}
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {currentConversation && currentConversation.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <Bot className="w-20 h-20 text-primary/20" />
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  {locale === 'es' ? '¡Hola! ¿En qué puedo ayudarte?' : 'Hello! How can I help you?'}
                </h2>
                <p className="text-muted-foreground">
                  {locale === 'es'
                    ? 'Pregunta lo que quieras sobre IA, tecnología o cualquier tema.'
                    : 'Ask me anything about AI, technology, or any topic.'}
                </p>
              </div>
            </div>
          ) : (
            <AnimatePresence>
              {currentConversation?.messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-6 h-6 text-primary" />
                    </div>
                  )}

                  <div
                    className={`max-w-[70%] rounded-2xl px-5 py-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    <p className="text-xs opacity-60 mt-2">
                      {message.timestamp.toLocaleTimeString(locale, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  {message.role === 'user' && (
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-primary-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-6 h-6 text-primary animate-pulse" />
              </div>
              <div className="bg-muted rounded-2xl px-5 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border/50 p-4 bg-card/50 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={locale === 'es' ? 'Escribe tu mensaje...' : 'Type your message...'}
                className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary max-h-32"
                rows={1}
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="lg"
                className="px-6"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {locale === 'es'
                ? '🔒 Procesamiento 100% local - Tus conversaciones son privadas'
                : '🔒 100% local processing - Your conversations are private'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
