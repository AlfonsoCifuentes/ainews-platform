'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getSupabaseClient } from '@/lib/db/supabase';
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
    if (!userId) {
      showToast(t.loginRequired, 'error');
      router.push(`/${locale}/auth`);
      return;
    }

    setIsEnrolling(true);

    try {
      const supabase = getSupabaseClient();

      // Create enrollment
      const { data: enrollment, error: enrollError } = await supabase
        .from('course_enrollments')
        .insert({
          user_id: userId,
          course_id: courseId,
          enrolled_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (enrollError) throw enrollError;

      // Award XP for enrollment
      await supabase.rpc('award_xp', {
        p_user_id: userId,
        p_amount: 50,
        p_source: 'course_enrollment',
      });

      showToast(t.success, 'success');
      router.refresh();
    } catch (error) {
      console.error('Enrollment error:', error);
      showToast(t.error, 'error');
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
