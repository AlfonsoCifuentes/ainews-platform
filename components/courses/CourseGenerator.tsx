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
  { key: 'analyzing', weight: 0.15, estimatedSeconds: 3 },
  { key: 'outline', weight: 0.25, estimatedSeconds: 8 },
  { key: 'content', weight: 0.40, estimatedSeconds: 25 },
  { key: 'quizzes', weight: 0.15, estimatedSeconds: 8 },
  { key: 'finalizing', weight: 0.05, estimatedSeconds: 2 },
] as const;

export function CourseGenerator({ locale, translations }: CourseGeneratorProps) {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [duration, setDuration] = useState<'short' | 'medium' | 'long'>('medium');
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState(0);
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
      setProgress(0);

      const startTime = Date.now();
      const totalEstimatedTime = progressSteps.reduce((sum, step) => sum + step.estimatedSeconds, 0);
      setEstimatedTimeLeft(totalEstimatedTime);

      // Simulate realistic progress based on step timing
      const progressTimer = window.setInterval(() => {
        setCurrentStep((prevStep) => {
          if (prevStep >= progressSteps.length - 1) {
            return prevStep;
          }

          const nextStep = prevStep + 1;

          // Calculate progress percentage
          const completedWeight = progressSteps.slice(0, nextStep).reduce((sum, s) => sum + s.weight, 0);
          setProgress(Math.min(completedWeight * 100, 95)); // Cap at 95% until done

          // Update estimated time
          const elapsed = (Date.now() - startTime) / 1000;
          const remaining = Math.max(0, totalEstimatedTime - elapsed);
          setEstimatedTimeLeft(Math.ceil(remaining));

          return nextStep;
        });
      }, 2500); // Advance every 2.5 seconds

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

        // Success - set to 100%
        setProgress(100);
        setCurrentStep(progressSteps.length - 1);
        setEstimatedTimeLeft(0);
        setResult(payload.data);
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
        setTimeout(() => {
          setCurrentStep(0);
          setProgress(0);
          setEstimatedTimeLeft(0);
        }, 1000);
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
              className="space-y-4 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-6 backdrop-blur-sm"
            >
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-foreground">
                    {progress.toFixed(0)}%
                  </span>
                  {estimatedTimeLeft > 0 && (
                    <span className="text-muted-foreground">
                      ~{estimatedTimeLeft}s remaining
                    </span>
                  )}
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-muted/30">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%]"
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${progress}%`,
                      backgroundPosition: ['0% 0%', '100% 0%']
                    }}
                    transition={{ 
                      width: { duration: 0.5, ease: 'easeOut' },
                      backgroundPosition: { duration: 2, repeat: Infinity, ease: 'linear' }
                    }}
                  />
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-2">
                {progressSteps.map((step, index) => (
                  <motion.div
                    key={step.key}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all ${
                        index < currentStep
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/50'
                          : index === currentStep
                            ? 'animate-pulse bg-primary/70 text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background'
                            : 'bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      {index < currentStep ? (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        >
                          ✓
                        </motion.span>
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="flex-1">
                      <span
                        className={`text-sm transition-all ${
                          index <= currentStep ? 'font-semibold text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {step.key === 'analyzing' && translations.progress.analyzing}
                        {step.key === 'outline' && translations.progress.outline}
                        {step.key === 'content' && translations.progress.content}
                        {step.key === 'quizzes' && translations.progress.quizzes}
                        {step.key === 'finalizing' && translations.progress.finalizing}
                      </span>
                      {index === currentStep && (
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: '100%' }}
                          className="mt-1 h-0.5 rounded-full bg-gradient-to-r from-primary to-transparent"
                        />
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
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
                  href={`/${locale}/courses/${result.course_id}`}
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
