"use client";

import { useEffect } from 'react';
import { useXPAward } from '@/components/gamification/XPAwardWrapper';

/**
 * Listener for course enrollment events
 * Awards XP when user enrolls in a course
 */
export function CourseEnrollmentListener() {
  const { awardXP } = useXPAward();

  useEffect(() => {
    const handleEnrollment = (event: CustomEvent) => {
      const { courseId } = event.detail;
      awardXP('COURSE_ENROLL', courseId);
    };

    window.addEventListener('course-enrolled', handleEnrollment as EventListener);

    return () => {
      window.removeEventListener('course-enrolled', handleEnrollment as EventListener);
    };
  }, [awardXP]);

  return null;
}

/**
 * Listener for module completion events
 * Awards XP when user completes a module
 * Awards bonus XP for perfect quiz scores
 */
export function ModuleCompletionListener() {
  const { awardXP } = useXPAward();

  useEffect(() => {
    const handleCompletion = async (event: CustomEvent) => {
      const { moduleId, score } = event.detail;

      // Award XP for module completion
      await awardXP('MODULE_COMPLETE', moduleId);

      // Award bonus XP for perfect score
      if (score === 100) {
        await awardXP('PERFECT_QUIZ', moduleId);
      }
    };

    window.addEventListener('module-completed', handleCompletion as EventListener);

    return () => {
      window.removeEventListener('module-completed', handleCompletion as EventListener);
    };
  }, [awardXP]);

  return null;
}

/**
 * Combined gamification listeners
 * Place this once in the root layout to enable all XP tracking
 */
export function GamificationListeners() {
  return (
    <>
      <CourseEnrollmentListener />
      <ModuleCompletionListener />
    </>
  );
}
