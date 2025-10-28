'use client';

import { useState, useCallback } from 'react';

type Difficulty = 'beginner' | 'intermediate' | 'advanced';
type Duration = 'short' | 'medium' | 'long';

interface GenerateCourseParams {
  topic: string;
  difficulty: Difficulty;
  duration: Duration;
  locale: string;
}

interface CourseGenerationResult {
  course_id: string;
  title: string;
  modules_count: number;
  estimated_duration_minutes: number;
}

interface GenerationState {
  isGenerating: boolean;
  progress: number;
  currentStep: number;
  estimatedTimeLeft: number;
  result: CourseGenerationResult | null;
  error: string | null;
  retryCount: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

const progressSteps = [
  { key: 'analyzing', weight: 0.15, estimatedSeconds: 3 },
  { key: 'outline', weight: 0.25, estimatedSeconds: 8 },
  { key: 'content', weight: 0.40, estimatedSeconds: 25 },
  { key: 'quizzes', weight: 0.15, estimatedSeconds: 8 },
  { key: 'finalizing', weight: 0.05, estimatedSeconds: 2 },
] as const;

export function useCourseGenerator() {
  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    progress: 0,
    currentStep: 0,
    estimatedTimeLeft: 0,
    result: null,
    error: null,
    retryCount: 0,
  });

  const reset = useCallback(() => {
    setState({
      isGenerating: false,
      progress: 0,
      currentStep: 0,
      estimatedTimeLeft: 0,
      result: null,
      error: null,
      retryCount: 0,
    });
  }, []);

  const generateCourse = useCallback(async (params: GenerateCourseParams, retryAttempt = 0) => {
    setState(prev => ({
      ...prev,
      isGenerating: true,
      error: null,
      result: null,
      currentStep: 0,
      progress: 0,
      retryCount: retryAttempt,
    }));

    const startTime = Date.now();
    const totalEstimatedTime = progressSteps.reduce((sum, step) => sum + step.estimatedSeconds, 0);
    
    // Progress simulation
    const progressTimer = setInterval(() => {
      setState(prev => {
        if (prev.currentStep >= progressSteps.length - 1) {
          return prev;
        }

        const nextStep = prev.currentStep + 1;
        const completedWeight = progressSteps.slice(0, nextStep).reduce((sum, s) => sum + s.weight, 0);
        const elapsed = (Date.now() - startTime) / 1000;
        const remaining = Math.max(0, totalEstimatedTime - elapsed);

        return {
          ...prev,
          currentStep: nextStep,
          progress: Math.min(completedWeight * 100, 95),
          estimatedTimeLeft: Math.ceil(remaining),
        };
      });
    }, 2500);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout

      const response = await fetch('/api/courses/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      clearInterval(progressTimer);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.error || data.message || 'Generation failed');
      }

      setState(prev => ({
        ...prev,
        isGenerating: false,
        progress: 100,
        currentStep: progressSteps.length - 1,
        estimatedTimeLeft: 0,
        result: data.data,
        error: null,
      }));

      return data.data;
    } catch (error) {
      clearInterval(progressTimer);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isNetworkError = errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError');
      const isTimeout = error instanceof Error && error.name === 'AbortError';

      // Auto-retry on network errors or timeouts
      if ((isNetworkError || isTimeout) && retryAttempt < MAX_RETRIES) {
        console.log(`[CourseGenerator] Retrying (${retryAttempt + 1}/${MAX_RETRIES})...`);
        
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryAttempt + 1)));
        return generateCourse(params, retryAttempt + 1);
      }

      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: isTimeout 
          ? 'Request timed out. Please try a simpler topic or shorter duration.'
          : isNetworkError
          ? 'Network error. Please check your connection and try again.'
          : errorMessage,
        progress: 0,
        currentStep: 0,
      }));

      throw error;
    }
  }, []);

  return {
    ...state,
    generateCourse,
    reset,
    canRetry: state.retryCount < MAX_RETRIES && !!state.error,
  };
}
