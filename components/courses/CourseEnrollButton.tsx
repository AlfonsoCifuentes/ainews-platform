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

    // Listen for auth state changes from AuthModal
    const handleAuthChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.userId) {
        setCurrentUserId(customEvent.detail.userId);
      }
    };

    window.addEventListener('auth-state-changed', handleAuthChange);
    return () => window.removeEventListener('auth-state-changed', handleAuthChange);
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
      // Emit event for auth modal to handle - don't redirect
      const event = new CustomEvent('request-login', {
        detail: { courseId, locale },
      });
      console.log('[CourseEnrollButton] dispatching request-login for courseId:', courseId);
      window.dispatchEvent(event);
      showToast(t.loginRequired, 'warning');
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
        // 401 means session expired or lost, request login again
        if (response.status === 401) {
          setCurrentUserId(undefined);
          showToast(t.loginRequired, 'error');
          const event = new CustomEvent('request-login', {
            detail: { courseId, locale },
          });
          window.dispatchEvent(event);
          return;
        }
        
        // 409 means already enrolled - just navigate to the course
        if (response.status === 409) {
          console.log('[CourseEnrollButton] Already enrolled, navigating to course');
          router.push(`/${locale}/courses/${courseId}/learn`);
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
      
      // Navigate directly to the course learning page instead of refreshing
      console.log('[CourseEnrollButton] Enrollment successful, navigating to course');
      router.push(`/${locale}/courses/${courseId}/learn`);
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
          {currentUserId ? t.enrollNow : <><Lock className="w-5 h-5 mr-2" />{t.enrollNow}</>}
        </>
      )}
    </Button>
  );
}
