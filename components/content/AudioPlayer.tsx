'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Download,
  Settings,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AudioPlayerProps {
  contentId: string;
  contentType: 'article' | 'course';
  locale: 'en' | 'es';
}

export function AudioPlayer({ contentId, contentType, locale }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [voice, setVoice] = useState<'default' | 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'>('default');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  const t = locale === 'en' ? {
    listen: 'Listen to Article',
    generating: 'Generating Audio...',
    play: 'Play',
    pause: 'Pause',
    download: 'Download',
    voice: 'Voice',
    speed: 'Speed',
    voices: {
      default: 'Default',
      alloy: 'Alloy',
      echo: 'Echo',
      fable: 'Fable',
      onyx: 'Onyx',
      nova: 'Nova',
      shimmer: 'Shimmer',
    },
  } : {
    listen: 'Escuchar Artículo',
    generating: 'Generando Audio...',
    play: 'Reproducir',
    pause: 'Pausar',
    download: 'Descargar',
    voice: 'Voz',
    speed: 'Velocidad',
    voices: {
      default: 'Predeterminada',
      alloy: 'Alloy',
      echo: 'Echo',
      fable: 'Fable',
      onyx: 'Onyx',
      nova: 'Nova',
      shimmer: 'Shimmer',
    },
  };

  const generateAudio = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId,
          contentType,
          locale,
          voice,
        }),
      });

      const data = await response.json();
      if (response.ok && data.audioUrl) {
        setAudioUrl(data.audioUrl);
        if (audioRef.current) {
          audioRef.current.src = data.audioUrl;
          audioRef.current.play();
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error('Failed to generate audio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
    setProgress(progress || 0);
  };

  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    const time = (value[0] / 100) * audioRef.current.duration;
    audioRef.current.currentTime = time;
    setProgress(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    if (!audioRef.current) return;
    audioRef.current.volume = value[0] / 100;
    setVolume(value[0]);
    setIsMuted(value[0] === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume / 100;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const downloadAudio = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `audio-${contentId}.mp3`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {!audioUrl ? (
          <motion.div
            key="generate"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Button
              onClick={generateAudio}
              disabled={isLoading}
              className="w-full gap-2"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t.generating}
                </>
              ) : (
                <>
                  <Volume2 className="h-5 w-5" />
                  {t.listen}
                </>
              )}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="player"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-3xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-white/10 p-6 space-y-4"
          >
            {/* Progress Bar */}
            <div className="space-y-2">
              <Slider
                value={[progress]}
                onValueChange={handleSeek}
                max={100}
                step={0.1}
                className="cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatTime(audioRef.current?.currentTime || 0)}</span>
                <span>{formatTime(audioRef.current?.duration || 0)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  size="lg"
                  onClick={togglePlayPause}
                  className="rounded-full w-14 h-14"
                >
                  {isPlaying ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6 ml-1" />
                  )}
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={toggleMute}
                  >
                    {isMuted ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                  <Slider
                    value={[isMuted ? 0 : volume]}
                    onValueChange={handleVolumeChange}
                    max={100}
                    className="w-24"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Settings className="mr-2 h-4 w-4" />
                      {t.voice}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {Object.entries(t.voices).map(([key, label]) => (
                      <DropdownMenuItem
                        key={key}
                        onClick={() => setVoice(key as typeof voice)}
                      >
                        {label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={downloadAudio}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
