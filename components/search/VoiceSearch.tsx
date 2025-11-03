'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceSearchProps {
  locale: 'en' | 'es';
  onResult: (transcript: string) => void;
}

export function VoiceSearch({ locale, onResult }: VoiceSearchProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    // Check if Speech Recognition is supported
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const win = window as any;
      setIsSupported(!!(win.SpeechRecognition || win.webkitSpeechRecognition));
    }
  }, []);

  const startListening = () => {
    if (!isSupported) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    
    const recognition = new SpeechRecognition();

    recognition.lang = locale === 'en' ? 'en-US' : 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcriptText = event.results[current][0].transcript;
      setTranscript(transcriptText);

      if (event.results[current].isFinal) {
        onResult(transcriptText);
        setIsListening(false);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  if (!isSupported) {
    return null;
  }

  const t = locale === 'en' ? {
    listening: 'Listening...',
    speak: 'Speak now',
  } : {
    listening: 'Escuchando...',
    speak: 'Habla ahora',
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="icon"
        onClick={startListening}
        disabled={isListening}
        className={`relative ${isListening ? 'animate-pulse' : ''}`}
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
            className="absolute top-full mt-2 right-0 p-4 rounded-xl bg-background border border-white/10 shadow-xl min-w-[200px]"
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
            
            {transcript && (
              <p className="text-sm text-muted-foreground italic">
                &quot;{transcript}&quot;
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
