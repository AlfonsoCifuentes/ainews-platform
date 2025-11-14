'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/shared/ToastProvider';
import { Loader2, Lock } from 'lucide-react';

interface CourseEnrollButtonProps {
  locale: 'en' | 'es';
  courseId: string;
  userId?: string;
}

export function CourseEnrollButton({ locale, courseId, userId }: CourseEnrollButtonProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(userId);

  // Auto-detect user from session on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { getClientAuthClient } = await import('@/lib/auth/auth-client');
        const supabase = getClientAuthClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          setCurrentUserId(user.id);
        }
      } catch (error) {
        console.warn('[CourseEnroll] Auth check failed:', error);
      }
    };
    checkAuth();
  }, []);

  const t = locale === 'en' ? {
    enrollNow: 'Enroll Now',
    enrolling: 'Enrolling...',
    success: 'Successfully enrolled in course!',
    error: 'Failed to enroll. Please try again.',
    loginRequired: 'Please login to enroll in courses',
  } : {
    enrollNow: 'Inscribirse Ahora',
    enrolling: 'Inscribiendo...',
    success: '¡Inscripción exitosa!',
    error: 'Error al inscribirse. Intenta de nuevo.',
    loginRequired: 'Inicia sesión para inscribirte en cursos',
  };

  const handleEnroll = async () => {
    if (!currentUserId) {
      showToast(t.loginRequired, 'error');
      router.push(`/${locale}/auth`);
      return;
    }

    setIsEnrolling(true);

    try {
      // Call API endpoint instead of direct database access
      const response = await fetch('/api/courses/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
      });

      const data = await response.json();

      if (!response.ok) {
        // 401 means session expired or lost, redirect to login
        if (response.status === 401) {
          showToast(t.loginRequired, 'error');
          router.push(`/${locale}/auth`);
          return;
        }
        throw new Error(data.error || 'Failed to enroll');
      }

      // Dispatch enrollment event for XP award
      const event = new CustomEvent('course-enrolled', {
        detail: { courseId },
      });
      window.dispatchEvent(event);

      showToast(t.success, 'success');
      router.refresh();
    } catch (error) {
      console.error('Enrollment error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      showToast(message, 'error');
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <Button
      size="lg"
      onClick={handleEnroll}
      disabled={isEnrolling}
      className="w-full md:w-auto rounded-xl text-lg px-8"
    >
      {isEnrolling ? (
        <>
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          {t.enrolling}
        </>
      ) : (
        <>
          {userId ? t.enrollNow : <><Lock className="w-5 h-5 mr-2" />{t.enrollNow}</>}
        </>
      )}
    </Button>
  );
}
