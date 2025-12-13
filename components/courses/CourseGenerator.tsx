'use client';

import { useState, useTransition, useEffect } from 'react';
import { Link } from '@/i18n';

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
  details?: string;
  hint?: string;
  debug?: {
    serverLogs: string[];
    totalLogLines: number;
    executionTimeMs: number;
  };
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
  initialTopic?: string;
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

export function CourseGenerator({ locale, translations, initialTopic = '' }: CourseGeneratorProps) {
  const [topic, setTopic] = useState(initialTopic);
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [duration, setDuration] = useState<'short' | 'medium' | 'long'>('medium');
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState(0);
  const [result, setResult] = useState<CourseGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!initialTopic) return;
    setTopic(initialTopic);
  }, [initialTopic]);

  // Diagnostics
  const handleDiagnosis = () => {
    // SIMPLE: Just log something to verify button is working
    console.log('🔧 DIAGNOSTIC BUTTON CLICKED');
    console.log('═'.repeat(80));
    console.log('🔧 RUNNING PROVIDER DIAGNOSTIC TEST');
    console.log('═'.repeat(80));
    
    // Now fetch diagnosis
    fetch('/api/courses/diagnose-providers')
      .then(res => res.json())
      .then((diagData) => {
        console.log(`Environment: ${diagData.environment}`);
        console.log(`Provider Status:`);
        
        Object.entries(diagData.providers).forEach(([name, config]) => {
          const configData = config as { configured: boolean; keyPrefix: string };
          const status = configData.configured ? '✅' : '❌';
          console.log(`  ${status} ${name.toUpperCase()}: ${configData.configured ? 'CONFIGURED' : 'NOT SET'} (${configData.keyPrefix})`);
        });
        
        console.log('─'.repeat(80));
        console.log(diagData.summary.message);
        console.log(`Configured: ${diagData.summary.configured}/${diagData.summary.total} (${diagData.summary.percentage})`);
        console.log('═'.repeat(80));
      })
      .catch((error) => {
        console.error('❌ Diagnostic request failed:', error);
      });
  };

  const handleInitiateGenerate = () => {
    if (!topic.trim()) {
      return;
    }
    
    handleGenerate();
  };

  const handleGenerate = () => {
    if (!topic.trim()) {
      return;
    }

    console.log('[Course Generator] Using provider: CLOUD');

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
        
        logger.step(2, 8, 'Starting course generation with direct API');
        logger.request('/api/generate-course-simple', requestBody);

        logger.step(3, 8, 'Calling OpenAI to generate course content...');
        const fetchStartTime = Date.now();

        // Use the simple endpoint that calls OpenAI directly
        const apiUrl = '/api/generate-course-simple';
        
        // Single request without retries - OpenAI should always work
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorData = await response.json() as { error?: string; details?: string };
          throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }

        const responseData = await response.json() as CourseGenerationResponse;
        const fetchDuration = ((Date.now() - fetchStartTime) / 1000).toFixed(2);
        logger.step(4, 8, `Received response after ${fetchDuration}s`);

        if (!responseData.success) {
          throw new Error(responseData.error || 'Course generation failed');
        }

        if (!responseData.data) {
          throw new Error('No course data in response');
        }

        const courseData = responseData.data;
        
        // Success - set to 100%
        logger.step(5, 8, 'Course generated successfully!');
        setProgress(100);
        setCurrentStep(progressSteps.length - 1);
        setEstimatedTimeLeft(0);
        setResult(courseData);
        setTopic('');
        
        // Log success
        logger.success(courseData);

      } catch (generationError) {
        // Log error
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
    <div className="border border-[#1F1F1F] bg-[#0A0A0A] p-8">
      <div className="mb-8 text-center">
        <h2 className="mb-3 text-2xl font-bold text-white">
          {translations.title}
        </h2>
        <p className="text-[#888888] font-mono text-sm">{translations.subtitle}</p>
      </div>

      <div className="space-y-6">
        {/* Topic Input */}
        <div>
          <label htmlFor="topic" className="mb-2 block text-sm font-mono tracking-widest text-[#888888]">
            {translations.topicLabel.toUpperCase()}
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
            className="w-full border border-[#1F1F1F] bg-black/50 px-4 py-3 text-white placeholder-[#888888] focus:border-white focus:outline-none font-mono disabled:opacity-50"
          />
        </div>

        {/* Difficulty */}
        <div>
          <label htmlFor="difficulty" className="mb-2 block text-sm font-mono tracking-widest text-[#888888]">
            {translations.difficultyLabel.toUpperCase()}
          </label>
          <select
            id="difficulty"
            name="difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            disabled={isPending}
            className="w-full border border-[#1F1F1F] bg-black/50 px-4 py-3 text-white focus:border-white focus:outline-none font-mono disabled:opacity-50"
          >
            <option value="beginner">{translations.difficulties.beginner}</option>
            <option value="intermediate">{translations.difficulties.intermediate}</option>
            <option value="advanced">{translations.difficulties.advanced}</option>
          </select>
        </div>

        {/* Duration */}
        <div>
          <label className="mb-3 block text-sm font-mono tracking-widest text-[#888888]">
            {translations.durationLabel.toUpperCase()}
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
                className={`border px-4 py-3 text-sm font-mono ${
                  duration === dur
                    ? 'border-white bg-white text-black'
                    : 'border-[#1F1F1F] text-[#888888] hover:border-white hover:text-white disabled:opacity-50'
                }`}
              >
                {translations.durations[dur]}
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleInitiateGenerate}
            disabled={!topic.trim() || isPending}
            className="flex-1 border border-white/20 bg-white text-black px-8 py-4 text-sm font-mono tracking-widest hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? translations.generating.toUpperCase() : translations.generateButton.toUpperCase()}
          </button>
          
          {/* Diagnostic Button */}
          <button
            type="button"
            onClick={handleDiagnosis}
            disabled={isPending}
            title="Check which LLM providers are configured"
            className="border border-[#1F1F1F] bg-black/50 px-4 py-4 text-sm font-mono text-[#888888] hover:border-white hover:text-white disabled:opacity-50"
          >
            🔧
          </button>
        </div>

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
        {isPending && (
          <div className="space-y-4 border border-[#1F1F1F] bg-black/50 p-6">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-mono">
                <span className="text-white">
                  {progress.toFixed(0)}%
                </span>
                {estimatedTimeLeft > 0 && (
                  <span className="text-[#888888]">
                    ~{estimatedTimeLeft}s remaining
                  </span>
                )}
              </div>
              <div className="h-1 w-full overflow-hidden bg-[#1F1F1F]">
                <div
                  className="h-full bg-white"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-2">
              {progressSteps.map((step, index) => (
                <div
                  key={step.key}
                  className="flex items-center gap-3"
                >
                  <div
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center text-xs font-mono ${
                      index < currentStep
                        ? 'bg-white text-black'
                        : index === currentStep
                          ? 'border border-white text-white'
                          : 'border border-[#1F1F1F] text-[#888888]'
                    }`}
                  >
                    {index < currentStep ? '✓' : index + 1}
                  </div>
                  <div className="flex-1">
                    <span
                      className={`text-sm font-mono ${
                        index <= currentStep ? 'text-white' : 'text-[#888888]'
                      }`}
                    >
                      {step.key === 'analyzing' && translations.progress.analyzing}
                      {step.key === 'outline' && translations.progress.outline}
                      {step.key === 'content' && translations.progress.content}
                      {step.key === 'quizzes' && translations.progress.quizzes}
                      {step.key === 'finalizing' && translations.progress.finalizing}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {result && !isPending && (
          <div className="mt-6 border border-white bg-white/10 p-6 text-left">
            <h3 className="text-xl font-bold text-white">{translations.result.successTitle}</h3>
            <p className="mt-2 text-sm text-[#888888] font-mono">
              {translations.result.successDescription}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href={`/courses/${result.course_id}`}
                className="border border-white bg-white text-black px-5 py-2 text-sm font-mono tracking-widest hover:bg-white/90"
              >
                {translations.result.viewCourse.toUpperCase()}
              </Link>
            </div>
          </div>
        )}

        {error && !isPending && (
          <div className="mt-6 border border-red-500/50 bg-red-500/10 p-6 text-left">
            <h3 className="text-xl font-bold text-red-400">{translations.result.errorTitle}</h3>
            <p className="mt-2 text-sm text-red-300 font-mono">{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              className="mt-4 border border-red-500/50 px-5 py-2 text-sm font-mono text-red-400 hover:bg-red-500/10"
            >
              {translations.result.retry.toUpperCase()}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
