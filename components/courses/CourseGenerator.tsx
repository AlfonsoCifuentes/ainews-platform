'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

type Difficulty = 'beginner' | 'intermediate' | 'advanced';

type CourseGenerationResult = {
  course_id: string;
  title: string;
  modules_count: number;
  estimated_duration_minutes: number;
};

type CourseGenerationResponse = {
  success: boolean;
  data?: CourseGenerationResult;
  error?: string;
  message?: string;
};

type CourseGeneratorProps = {
  locale: string;
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
    result: {
      successTitle: string;
      successDescription: string;
      viewCourse: string;
      errorTitle: string;
      errorDescription: string;
      retry: string;
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

export function CourseGenerator({ locale, translations }: CourseGeneratorProps) {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [duration, setDuration] = useState<'short' | 'medium' | 'long'>('medium');
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState<CourseGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleGenerate = () => {
    if (!topic.trim()) {
      return;
    }

    startTransition(async () => {
      setError(null);
      setResult(null);
      setCurrentStep(0);

      const progressTimer = window.setInterval(() => {
        setCurrentStep((prev) => (prev < progressSteps.length - 1 ? prev + 1 : prev));
      }, 1600);

      try {
        const response = await fetch('/api/courses/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ topic, difficulty, duration, locale })
        });

        let payload: CourseGenerationResponse | null = null;

        try {
          payload = (await response.json()) as CourseGenerationResponse;
        } catch (parseError) {
          console.error('[CourseGenerator] Failed to parse response', parseError);
        }

        if (!payload || !response.ok || !payload.success || !payload.data) {
          const errorMessage =
            (payload && (payload.error || payload.message)) || translations.result.errorDescription;
          throw new Error(errorMessage);
        }

        setResult(payload.data);
        setCurrentStep(progressSteps.length - 1);
        setTopic('');
      } catch (generationError) {
        console.error('[CourseGenerator] Generation failed', generationError);
        const fallback = translations.result.errorDescription;
        const message =
          generationError instanceof Error && generationError.message && generationError.message !== fallback
            ? generationError.message
            : fallback;
        setError(message);
      } finally {
        window.clearInterval(progressTimer);
        setCurrentStep(0);
      }
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

        <AnimatePresence>
          {result && !isPending && (
            <motion.div
              key="generation-success"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="mt-6 rounded-3xl border border-primary/40 bg-primary/10 p-6 text-left shadow-lg"
            >
              <h3 className="text-xl font-bold text-primary">{translations.result.successTitle}</h3>
              <p className="mt-2 text-sm text-primary-foreground/80 md:text-base">
                {translations.result.successDescription}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link
                  href={`/${locale}/dashboard`}
                  className="rounded-full border border-primary/50 bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:shadow-lg hover:shadow-primary/40"
                >
                  {translations.result.viewCourse}
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && !isPending && (
            <motion.div
              key="generation-error"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="mt-6 rounded-3xl border border-destructive/40 bg-destructive/10 p-6 text-left"
            >
              <h3 className="text-xl font-bold text-destructive">{translations.result.errorTitle}</h3>
              <p className="mt-2 text-sm text-destructive/90 md:text-base">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="mt-4 rounded-full border border-destructive/40 px-5 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive/10"
              >
                {translations.result.retry}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
