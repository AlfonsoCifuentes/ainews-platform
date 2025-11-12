'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Lock, Download, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { isBrowserLLMReady, getBrowserLLM } from '@/lib/ai/browser-llm';
import { ModelDownloader } from '@/components/ai/ModelDownloader';
import { useWebLLM } from '@/hooks/use-web-llm';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatbotClientProps {
  locale: string;
}

export function ChatbotClient({ locale }: ChatbotClientProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: locale === 'es' 
        ? '¡Hola! Soy tu asistente de IA local. Estoy aquí para responder tus preguntas sobre Inteligencia Artificial. ¿En qué puedo ayudarte?'
        : 'Hello! I\'m your local AI assistant. I\'m here to answer your questions about Artificial Intelligence. How can I help you?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [showDownloader, setShowDownloader] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // WebLLM hook for automatic detection
  const { cachedModels } = useWebLLM({
    autoLoadFromCache: false
  });

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
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const llm = getBrowserLLM();
      if (!llm) {
        throw new Error('Model not initialized');
      }

      const systemPrompt = locale === 'es'
        ? 'Eres un asistente experto en Inteligencia Artificial. Responde de manera clara, concisa y educativa. Usa ejemplos cuando sea apropiado.'
        : 'You are an expert AI assistant. Respond clearly, concisely, and educationally. Use examples when appropriate.';

      const prompt = `${systemPrompt}\n\nUsuario: ${userMessage.content}\n\nAsistente:`;

      const response = await llm.generate(prompt, {
        maxTokens: 500,
        temperature: 0.7,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
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
      setMessages(prev => [...prev, errorMessage]);
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
      <div className="max-w-4xl mx-auto">
        <Card className="border-2 border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-orange-500/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Lock className="w-8 h-8 text-yellow-500" />
              <div>
                <CardTitle className="text-2xl">
                  {locale === 'es' ? '🔒 Función Bloqueada' : '🔒 Feature Locked'}
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  {locale === 'es'
                    ? 'El Chatbot IA se desbloquea al descargar el modelo local'
                    : 'AI Chatbot unlocks when you download the local model'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                {locale === 'es' ? 'Ventajas Exclusivas del Chatbot:' : 'Exclusive Chatbot Benefits:'}
              </h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>
                    {locale === 'es'
                      ? '💬 Conversaciones ilimitadas sin costo de API'
                      : '💬 Unlimited conversations at zero API cost'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>
                    {locale === 'es'
                      ? '🔒 100% privado - tus conversaciones nunca salen de tu navegador'
                      : '🔒 100% private - your conversations never leave your browser'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>
                    {locale === 'es'
                      ? '⚡ Respuestas instantáneas con WebGPU (si tienes GPU moderna)'
                      : '⚡ Instant responses with WebGPU (if you have modern GPU)'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>
                    {locale === 'es'
                      ? '📡 Funciona offline después de la descarga'
                      : '📡 Works offline after download'}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>
                    {locale === 'es'
                      ? '🎯 Especializado en temas de Inteligencia Artificial'
                      : '🎯 Specialized in Artificial Intelligence topics'}
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-sm text-blue-300">
                <strong>{locale === 'es' ? '💡 Consejo:' : '💡 Tip:'}</strong>{' '}
                {locale === 'es'
                  ? 'Descarga el modelo una vez y úsalo para siempre sin límites ni costos.'
                  : 'Download the model once and use it forever with no limits or costs.'}
              </p>
            </div>

            <Button
              onClick={() => setShowDownloader(true)}
              className="w-full gap-2"
              size="lg"
            >
              <Download className="w-5 h-5" />
              {locale === 'es' ? 'Descargar Modelo y Desbloquear' : 'Download Model & Unlock'}
            </Button>
          </CardContent>
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
    <div className="max-w-4xl mx-auto h-[calc(100vh-120px)] flex flex-col">
      <Card className="flex-1 flex flex-col overflow-hidden border-primary/20">
        <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-purple-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle>{locale === 'es' ? 'Chatbot IA Local' : 'Local AI Chatbot'}</CardTitle>
              <CardDescription>
                {locale === 'es' ? 'Conversaciones privadas y sin límites' : 'Private and unlimited conversations'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-50 mt-1">
                    {message.timestamp.toLocaleTimeString(locale, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-primary-foreground" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary animate-pulse" />
              </div>
              <div className="bg-muted rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        <div className="border-t border-border/50 p-4">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={locale === 'es' ? 'Escribe tu mensaje...' : 'Type your message...'}
              className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
              ? '🔒 Tus conversaciones son 100% privadas y no salen de tu navegador'
              : '🔒 Your conversations are 100% private and never leave your browser'}
          </p>
        </div>
      </Card>
    </div>
  );
}
