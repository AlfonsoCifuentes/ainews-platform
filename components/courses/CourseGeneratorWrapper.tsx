"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const CourseGenerator = dynamic(
  () => import('@/components/courses/CourseGenerator').then(mod => ({ default: mod.CourseGenerator })),
  {
    ssr: false,
    loading: () => (
      <div className="glass rounded-3xl border border-white/10 p-8">
        <div className="h-64 animate-pulse space-y-4">
          <div className="h-8 w-3/4 rounded bg-muted"></div>
          <div className="h-4 w-1/2 rounded bg-muted"></div>
          <div className="h-32 rounded bg-muted"></div>
        </div>
      </div>
    ),
  }
);

type Difficulty = 'beginner' | 'intermediate' | 'advanced';

interface CourseGeneratorWrapperProps {
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
}

export function CourseGeneratorWrapper(props: CourseGeneratorWrapperProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prevent hydration mismatch by rendering nothing on server
  if (!isMounted) {
    return (
      <div className="glass rounded-3xl border border-white/10 p-8">
        <div className="h-64 animate-pulse space-y-4">
          <div className="h-8 w-3/4 rounded bg-muted"></div>
          <div className="h-4 w-1/2 rounded bg-muted"></div>
          <div className="h-32 rounded bg-muted"></div>
        </div>
      </div>
    );
  }

  return <CourseGenerator {...props} />;
}
