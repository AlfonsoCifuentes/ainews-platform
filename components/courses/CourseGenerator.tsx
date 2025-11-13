'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { LocalModelInfo } from './LocalModelInfo';

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

// 🔍 Advanced Client-Side Logger
class CourseGenerationLogger {
  public prefix = '🎓 [Course Generator Client]';
  private startTime = 0;

  start(topic: string, difficulty: string, duration: string, locale: string) {
    this.startTime = Date.now();
    console.log('═'.repeat(80));
    console.log(`${this.prefix} 🚀 STARTING COURSE GENERATION`);
    console.log('═'.repeat(80));
    console.log(`${this.prefix} 📋 Parameters:`, {
      topic,
      difficulty,
      duration,
      locale,
      timestamp: new Date().toISOString()
    });
  }

  step(stepNumber: number, total: number, message: string) {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2);
    console.log(`${this.prefix} ⏳ [${elapsed}s] Step ${stepNumber}/${total}: ${message}`);
  }

  request(url: string, body: unknown) {
    console.log(`${this.prefix} 📤 Sending POST request to ${url}`);
    console.log(`${this.prefix} 📦 Request body:`, JSON.stringify(body, null, 2));
  }

  response(status: number, statusText: string, headers: Headers) {
    console.log(`${this.prefix} 📥 Response received:`);
    console.log(`${this.prefix}    Status: ${status} ${statusText}`);
    console.log(`${this.prefix}    Content-Type: ${headers.get('content-type')}`);
  }

  responseBody(data: unknown) {
    console.log(`${this.prefix} 📄 Response body:`, data);
  }

  success(result: CourseGenerationResult) {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2);
    console.log('═'.repeat(80));
    console.log(`${this.prefix} ✅ SUCCESS in ${elapsed}s`);
    console.log('═'.repeat(80));
    console.log(`${this.prefix} 📚 Course Created:`, {
      id: result.course_id,
      title: result.title,
      modules: result.modules_count,
      duration: `${result.estimated_duration_minutes} minutes`
    });
    console.log(`${this.prefix} 🔗 View at: /courses/${result.course_id}`);
  }

  error(error: unknown, response?: Response) {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2);
    console.error('═'.repeat(80));
    console.error(`${this.prefix} ❌ FAILED after ${elapsed}s`);
    console.error('═'.repeat(80));
    
    if (response) {
      console.error(`${this.prefix} 🔴 HTTP Status: ${response.status} ${response.statusText}`);
      console.error(`${this.prefix} 🔴 Response URL: ${response.url}`);
    }

    if (error instanceof Error) {
      console.error(`${this.prefix} 🔴 Error Type: ${error.name}`);
      console.error(`${this.prefix} 🔴 Error Message: ${error.message}`);
      console.error(`${this.prefix} 🔴 Stack Trace:`, error.stack);
    } else {
      console.error(`${this.prefix} 🔴 Unknown Error:`, error);
    }

    console.error(`${this.prefix} 💡 Troubleshooting:`);
    console.error(`${this.prefix}    1. Check browser Network tab for failed request`);
    console.error(`${this.prefix}    2. Check server logs in Vercel dashboard`);
    console.error(`${this.prefix}    3. Verify API keys are configured in environment`);
    console.error(`${this.prefix}    4. Try a simpler topic or different difficulty`);
  }

  warn(message: string) {
    console.warn(`${this.prefix} ⚠️  ${message}`);
  }

  info(message: string) {
    console.info(`${this.prefix} ℹ️  ${message}`);
  }
}

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

  const handleInitiateGenerate = () => {
    if (!topic.trim()) {
      return;
    }
    
    // For now, skip provider selector and go straight to cloud API
    handleGenerateWithProvider('cloud');
  };

  const handleGenerateWithProvider = (provider: 'browser' | 'cloud') => {
    if (!topic.trim()) {
      return;
    }

    // Log which provider was selected
    console.log(`[Course Generator] Using provider: ${provider.toUpperCase()}`);
    
    // For now, both use the API (browser LLM integration would be client-side)
    // Future: If browser, generate locally; if cloud, use API
    startTransition(async () => {
      const logger = new CourseGenerationLogger();
      
      setError(null);
      setResult(null);
      setCurrentStep(0);
      setProgress(0);

      // 🔍 Log start
      logger.start(topic, difficulty, duration, locale);

      const startTime = Date.now();
      const totalEstimatedTime = progressSteps.reduce((sum, step) => sum + step.estimatedSeconds, 0);
      setEstimatedTimeLeft(totalEstimatedTime);

      // Simulate realistic progress based on step timing
      logger.step(1, 8, 'Initializing course generation request');
      
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
        const requestBody = { topic, difficulty, duration, locale };
        const apiUrl = '/api/courses/generate';
        
        // 🔍 Log request
        logger.step(2, 8, 'Preparing API request');
        logger.request(apiUrl, requestBody);

        logger.step(3, 8, 'Sending request to server (this may take 30-120 seconds)...');
        const fetchStartTime = Date.now();

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        const fetchDuration = ((Date.now() - fetchStartTime) / 1000).toFixed(2);
        logger.step(4, 8, `Received response after ${fetchDuration}s`);

        // 🔍 Log response
        logger.response(response.status, response.statusText, response.headers);

        let payload: CourseGenerationResponse | null = null;
        let rawText = '';

        try {
          logger.step(5, 8, 'Parsing response JSON...');
          rawText = await response.text();
          
          if (!rawText) {
            logger.warn('Response body is empty!');
            throw new Error('Server returned empty response');
          }

          logger.info(`Response text length: ${rawText.length} characters`);
          
          // Try to parse JSON
          try {
            payload = JSON.parse(rawText) as CourseGenerationResponse;
            logger.step(6, 8, 'Response parsed successfully');
            logger.responseBody(payload);
          } catch (jsonError) {
            logger.error(jsonError);
            logger.warn('Failed to parse JSON. Raw response:');
            console.log('═'.repeat(80));
            console.log('RAW RESPONSE TEXT:');
            console.log(rawText.substring(0, 1000)); // First 1000 chars
            if (rawText.length > 1000) {
              console.log(`... (${rawText.length - 1000} more characters)`);
            }
            console.log('═'.repeat(80));
            throw new Error(`Invalid JSON response: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`);
          }
        } catch (parseError) {
          logger.error(parseError, response);
          throw new Error(`Failed to read response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        }

        logger.step(7, 8, 'Validating response data...');

        if (!response.ok) {
          logger.warn(`HTTP error: ${response.status} ${response.statusText}`);
          
          // Specific handling for 429 Rate Limit
          if (response.status === 429) {
            const rateLimitMessage = locale === 'es' 
              ? '⏰ Límite de uso alcanzado. Todos los servicios de IA están ocupados. Por favor, espera 5-10 minutos e intenta nuevamente. 💡 Sugerencia: Descarga un modelo local para generar cursos ilimitados sin esperas.'
              : '⏰ Rate limit exceeded. All AI services are at capacity. Please wait 5-10 minutes and try again. 💡 Tip: Download a local model to generate unlimited courses without waiting.';
            throw new Error(rateLimitMessage);
          }
          
          const errorMessage = (payload && (payload.error || payload.message)) || `Server error: ${response.status}`;
          throw new Error(errorMessage);
        }

        if (!payload || !payload.success || !payload.data) {
          logger.warn('Response validation failed');
          console.log(`${logger['prefix']} Payload:`, payload);
          const errorMessage =
            (payload && (payload.error || payload.message)) || translations.result.errorDescription;
          throw new Error(errorMessage);
        }

        // Success - set to 100%
        logger.step(8, 8, 'Course generated successfully!');
        setProgress(100);
        setCurrentStep(progressSteps.length - 1);
        setEstimatedTimeLeft(0);
        setResult(payload.data);
        setTopic('');
        
        // 🔍 Log success
        logger.success(payload.data);

      } catch (generationError) {
        // 🔍 Log error
        logger.error(generationError);
        
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
        <h2 className="mb-3 text-3xl font-bold">
          {translations.title}
        </h2>
        <p className="text-muted-foreground">{translations.subtitle}</p>
      </div>

      {/* Local Model Information Banner */}
      <LocalModelInfo />

      <div className="space-y-6">
        {/* Topic Input */}
        <div>
          <label htmlFor="topic" className="mb-2 block text-sm font-semibold">
            {translations.topicLabel}
          </label>
          <input
            id="topic"
            type="text"
            value={topic || ''}
            onChange={(e) => setTopic(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && topic.trim() && !isPending) {
                e.preventDefault();
                handleInitiateGenerate();
              }
            }}
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
            name="difficulty"
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
          <label className="mb-3 block text-sm font-semibold">
            {translations.durationLabel}
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['short', 'medium', 'long'] as const).map((dur) => (
              <button
                key={dur}
                type="button"
                name="duration"
                value={dur}
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
          onClick={handleInitiateGenerate}
          disabled={!topic.trim() || isPending}
          whileHover={{ scale: isPending ? 1 : 1.02 }}
          whileTap={{ scale: isPending ? 1 : 0.98 }}
          className="w-full rounded-full bg-gradient-to-r from-primary to-primary/80 px-8 py-4 text-lg font-bold text-primary-foreground shadow-lg shadow-primary/40 transition-all hover:shadow-xl hover:shadow-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? translations.generating : translations.generateButton}
        </motion.button>

        {/* Provider Selector Modal - Disabled for now */}
        {/* 
        <AnimatePresence>
          {showProviderSelector && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
              onClick={() => setShowProviderSelector(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-4xl"
                onClick={(e) => e.stopPropagation()}
              >
                <LLMProviderSelector
                  onProviderSelected={handleProviderSelected}
                  onBrowserModelReady={() => {
                    // Model downloaded, user can select it
                  }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        */}

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
                        {step.key === 'analyzing' ? translations.progress.analyzing : ''}
                        {step.key === 'outline' ? translations.progress.outline : ''}
                        {step.key === 'content' ? translations.progress.content : ''}
                        {step.key === 'quizzes' ? translations.progress.quizzes : ''}
                        {step.key === 'finalizing' ? translations.progress.finalizing : ''}
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
