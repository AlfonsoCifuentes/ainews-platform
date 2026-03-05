'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  readonly length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike {
  readonly error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type VoiceWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

interface VoiceSearchProps {
  locale: 'en' | 'es';
  onResult: (transcript: string) => void;
  className?: string;
  compact?: boolean;
}

export function VoiceSearch({ locale, onResult, className, compact = false }: VoiceSearchProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as VoiceWindow;
      setIsSupported(!!(win.SpeechRecognition || win.webkitSpeechRecognition));
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) return;

    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }

    const win = window as VoiceWindow;
    const SpeechRecognitionCtor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognitionRef.current = recognition;
    setErrorMessage(null);

    recognition.lang = locale === 'en' ? 'en-US' : 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let combinedTranscript = '';
      let hasFinalResult = false;

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const alternative = result?.[0];
        if (alternative?.transcript) {
          combinedTranscript += `${alternative.transcript} `;
        }
        if (result?.isFinal) {
          hasFinalResult = true;
        }
      }

      const normalizedTranscript = combinedTranscript.trim();
      setTranscript(normalizedTranscript);

      if (hasFinalResult && normalizedTranscript) {
        onResult(normalizedTranscript);
        stopListening();
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      const messages = locale === 'es'
        ? {
            'not-allowed': 'Permiso de microfono denegado',
            'no-speech': 'No se detecto voz',
            'network': 'Error de red en reconocimiento',
            default: 'Error en reconocimiento de voz',
          }
        : {
            'not-allowed': 'Microphone permission denied',
            'no-speech': 'No speech detected',
            'network': 'Network error while recognizing',
            default: 'Voice recognition error',
          };

      if (event.error !== 'aborted') {
        setErrorMessage(messages[event.error as keyof typeof messages] ?? messages.default);
      }
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.start();
  }, [isSupported, locale, onResult, stopListening]);

  const handleButtonClick = useCallback(() => {
    if (isListening) {
      stopListening();
      return;
    }

    void startListening();
  }, [isListening, startListening, stopListening]);

  if (!isSupported) {
    return null;
  }

  const t = locale === 'en' ? {
    listening: 'Listening...',
    speak: 'Speak now',
    stop: 'Stop voice search',
    start: 'Start voice search',
  } : {
    listening: 'Escuchando...',
    speak: 'Habla ahora',
    stop: 'Detener busqueda por voz',
    start: 'Iniciar busqueda por voz',
  };

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="outline"
        size="icon"
        onClick={handleButtonClick}
        className={cn(
          'relative',
          compact && 'h-8 w-8 border-white/10 bg-transparent hover:bg-white/10',
          isListening ? 'animate-pulse' : ''
        )}
        aria-label={isListening ? t.stop : t.start}
        title={isListening ? t.stop : t.start}
      >
        {isListening ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </Button>

      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full mt-2 right-0 p-4 rounded-xl bg-background border border-white/10 shadow-xl min-w-[200px] z-20"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-primary rounded-full"
                    animate={{ height: ['8px', '16px', '8px'] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>
              <span className="text-sm text-primary font-medium">{t.listening}</span>
            </div>

            <p className="text-sm text-muted-foreground italic">
              {transcript ? `\"${transcript}\"` : t.speak}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {errorMessage && !isListening && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="absolute top-full right-0 mt-2 text-xs text-red-400 whitespace-nowrap"
          >
            {errorMessage}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
