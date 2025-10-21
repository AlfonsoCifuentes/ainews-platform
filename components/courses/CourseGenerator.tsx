'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Difficulty = 'beginner' | 'intermediate' | 'advanced';

type CourseGeneratorProps = {
  translations: {
    title: string;
    subtitle: string;
    topicLabel: string;
    topicPlaceholder: string;
    difficultyLabel: string;
    durationLabel: string;
    generateButton: string;
    generating: string;
    difficulties: Record<Difficulty, string>;
    durations: {
      short: string;
      medium: string;
      long: string;
    };
    progress: {
      analyzing: string;
      outline: string;
      content: string;
      quizzes: string;
      finalizing: string;
    };
  };
};

const progressSteps = [
  'analyzing',
  'outline',
  'content',
  'quizzes',
  'finalizing',
] as const;

export function CourseGenerator({ translations }: CourseGeneratorProps) {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [duration, setDuration] = useState<'short' | 'medium' | 'long'>('medium');
  const [currentStep, setCurrentStep] = useState(0);
  const [isPending, startTransition] = useTransition();

  const handleGenerate = () => {
    if (!topic.trim()) {
      return;
    }

    startTransition(async () => {
      // Simulate generation with step progression
      for (let i = 0; i < progressSteps.length; i++) {
        setCurrentStep(i);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      // TODO: Replace with actual API call
      // const response = await fetch('/api/courses/generate', {
      //   method: 'POST',
      //   body: JSON.stringify({ topic, difficulty, duration }),
      // });

      setCurrentStep(0);
      alert('Course generation complete! (Mock)');
    });
  };

  return (
    <div className="glass rounded-3xl p-8 shadow-xl">
      <div className="mb-8 text-center">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 text-3xl font-bold"
        >
          {translations.title}
        </motion.h2>
        <p className="text-muted-foreground">{translations.subtitle}</p>
      </div>

      <div className="space-y-6">
        {/* Topic Input */}
        <div>
          <label htmlFor="topic" className="mb-2 block text-sm font-semibold">
            {translations.topicLabel}
          </label>
          <input
            id="topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={translations.topicPlaceholder}
            disabled={isPending}
            className="w-full rounded-2xl border border-border bg-background px-5 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          />
        </div>

        {/* Difficulty */}
        <div>
          <label htmlFor="difficulty" className="mb-2 block text-sm font-semibold">
            {translations.difficultyLabel}
          </label>
          <select
            id="difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            disabled={isPending}
            className="w-full rounded-2xl border border-border bg-background px-5 py-3 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          >
            <option value="beginner">{translations.difficulties.beginner}</option>
            <option value="intermediate">{translations.difficulties.intermediate}</option>
            <option value="advanced">{translations.difficulties.advanced}</option>
          </select>
        </div>

        {/* Duration */}
        <div>
          <label htmlFor="duration" className="mb-2 block text-sm font-semibold">
            {translations.durationLabel}
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['short', 'medium', 'long'] as const).map((dur) => (
              <button
                key={dur}
                type="button"
                onClick={() => setDuration(dur)}
                disabled={isPending}
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${
                  duration === dur
                    ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                    : 'border-border bg-background/50 hover:border-primary/50 disabled:opacity-50'
                }`}
              >
                {translations.durations[dur]}
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <motion.button
          type="button"
          onClick={handleGenerate}
          disabled={!topic.trim() || isPending}
          whileHover={{ scale: isPending ? 1 : 1.02 }}
          whileTap={{ scale: isPending ? 1 : 0.98 }}
          className="w-full rounded-full bg-gradient-to-r from-primary to-primary/80 px-8 py-4 text-lg font-bold text-primary-foreground shadow-lg shadow-primary/40 transition-all hover:shadow-xl hover:shadow-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? translations.generating : translations.generateButton}
        </motion.button>

        {/* Progress Indicator */}
        <AnimatePresence>
          {isPending && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 overflow-hidden rounded-2xl bg-background/50 p-6"
            >
              {progressSteps.map((step, index) => (
                <div key={step} className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                      index < currentStep
                        ? 'bg-primary text-primary-foreground'
                        : index === currentStep
                          ? 'animate-pulse bg-primary/50 text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {index < currentStep ? '✓' : index + 1}
                  </div>
                  <span
                    className={`text-sm ${
                      index <= currentStep ? 'font-semibold' : 'text-muted-foreground'
                    }`}
                  >
                    {translations.progress[step]}
                  </span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
