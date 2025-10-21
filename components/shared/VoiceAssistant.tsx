'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Volume2, X, Pause, Play, SkipForward, SkipBack, Settings } from 'lucide-react';

interface VoiceAssistantProps {
  content: string;
  locale: 'en' | 'es';
  title?: string;
}

export default function VoiceAssistant({ content, locale, title }: VoiceAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [supportsSpeech, setSupportsSpeech] = useState(false);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    // Check if browser supports speech synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSupportsSpeech(true);

      // Load voices
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        voicesRef.current = voices.filter((voice) =>
          locale === 'en' ? voice.lang.startsWith('en') : voice.lang.startsWith('es')
        );
      };

      loadVoices();
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
        window.speechSynthesis.cancel();
      };
    }
    
    return undefined;
  }, [locale]);

  const startReading = () => {
    if (!supportsSpeech) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = locale === 'en' ? 'en-US' : 'es-ES';
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    // Select best voice
    if (voicesRef.current.length > 0) {
      utterance.voice = voicesRef.current[0];
    }

    utterance.onstart = () => {
      setIsReading(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsReading(false);
      setIsPaused(false);
      setCurrentPosition(0);
    };

    utterance.onpause = () => {
      setIsPaused(true);
    };

    utterance.onresume = () => {
      setIsPaused(false);
    };

    utterance.onboundary = (event) => {
      setCurrentPosition(event.charIndex);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const pauseReading = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
  };

  const resumeReading = () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  };

  const stopReading = () => {
    window.speechSynthesis.cancel();
    setIsReading(false);
    setIsPaused(false);
    setCurrentPosition(0);
  };

  const skipForward = () => {
    // Skip 10 seconds worth of text (~300 characters)
    const newPosition = Math.min(currentPosition + 300, content.length);
    stopReading();
    const newContent = content.substring(newPosition);
    const newUtterance = new SpeechSynthesisUtterance(newContent);
    newUtterance.lang = locale === 'en' ? 'en-US' : 'es-ES';
    newUtterance.rate = rate;
    newUtterance.pitch = pitch;
    newUtterance.volume = volume;
    window.speechSynthesis.speak(newUtterance);
  };

  const skipBackward = () => {
    // Skip back 10 seconds worth of text
    const newPosition = Math.max(currentPosition - 300, 0);
    stopReading();
    const newContent = content.substring(newPosition);
    const newUtterance = new SpeechSynthesisUtterance(newContent);
    newUtterance.lang = locale === 'en' ? 'en-US' : 'es-ES';
    newUtterance.rate = rate;
    newUtterance.pitch = pitch;
    newUtterance.volume = volume;
    window.speechSynthesis.speak(newUtterance);
  };

  const t = {
    en: {
      listenToArticle: 'Listen to Article',
      play: 'Play',
      pause: 'Pause',
      stop: 'Stop',
      settings: 'Settings',
      speed: 'Speed',
      voicePitch: 'Voice Pitch',
      volumeControl: 'Volume',
      notSupported: 'Voice reading not supported in your browser'
    },
    es: {
      listenToArticle: 'Escuchar Artículo',
      play: 'Reproducir',
      pause: 'Pausar',
      stop: 'Detener',
      settings: 'Configuración',
      speed: 'Velocidad',
      voicePitch: 'Tono de Voz',
      volumeControl: 'Volumen',
      notSupported: 'La lectura por voz no está soportada en tu navegador'
    }
  };

  if (!supportsSpeech) {
    return (
      <div className="text-sm text-muted-foreground p-4 bg-white/5 rounded-xl">
        {t[locale].notSupported}
      </div>
    );
  }

  return (
    <>
      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-2xl flex items-center justify-center text-white"
      >
        {isReading && !isPaused ? (
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
            <Volume2 className="w-6 h-6" />
          </motion.div>
        ) : (
          <Mic className="w-6 h-6" />
        )}
      </motion.button>

      {/* Voice Assistant Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-2xl p-6"
            >
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl shadow-2xl p-6 space-y-6 border border-white/10">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Volume2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold">{t[locale].listenToArticle}</h3>
                      {title && <p className="text-sm text-muted-foreground">{title}</p>}
                    </div>
                  </div>
                  <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-white">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                      style={{ width: `${(currentPosition / content.length) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{Math.floor(currentPosition / 30)}s</span>
                    <span>{Math.floor(content.length / 30)}s</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={skipBackward}
                    disabled={!isReading}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center disabled:opacity-50"
                  >
                    <SkipBack className="w-5 h-5" />
                  </motion.button>

                  {!isReading || isPaused ? (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={isReading ? resumeReading : startReading}
                      className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg"
                    >
                      <Play className="w-8 h-8 text-white ml-1" />
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={pauseReading}
                      className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg"
                    >
                      <Pause className="w-8 h-8 text-white" />
                    </motion.button>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={skipForward}
                    disabled={!isReading}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center disabled:opacity-50"
                  >
                    <SkipForward className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* Settings Toggle */}
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-white"
                >
                  <Settings className="w-4 h-4" />
                  {t[locale].settings}
                </button>

                {/* Settings Panel */}
                <AnimatePresence>
                  {showSettings && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 pt-4 border-t border-white/10"
                    >
                      {/* Speed */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{t[locale].speed}</span>
                          <span className="text-primary font-bold">{rate.toFixed(1)}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.1"
                          value={rate}
                          onChange={(e) => setRate(parseFloat(e.target.value))}
                          className="w-full"
                        />
                      </div>

                      {/* Pitch */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{t[locale].voicePitch}</span>
                          <span className="text-primary font-bold">{pitch.toFixed(1)}</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.1"
                          value={pitch}
                          onChange={(e) => setPitch(parseFloat(e.target.value))}
                          className="w-full"
                        />
                      </div>

                      {/* Volume */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{t[locale].volumeControl}</span>
                          <span className="text-primary font-bold">{Math.round(volume * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={volume}
                          onChange={(e) => setVolume(parseFloat(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
