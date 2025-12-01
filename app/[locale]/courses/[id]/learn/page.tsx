import { notFound, redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { getServerAuthUser } from '@/lib/auth/auth-config';
import { ModulePlayer } from '@/components/courses/ModulePlayer';
import { ModuleNavigation } from '@/components/courses/ModuleNavigation';
import { ModuleSidebar } from '@/components/courses/ModuleSidebar';
import { normalizeCourseRecord } from '@/lib/courses/normalize';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CourseLearnPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: 'en' | 'es'; id: string }>;
  searchParams: Promise<{ module?: string }>;
}) {
  const { locale, id } = await params;
  const { module: moduleId } = await searchParams;
  const user = await getServerAuthUser();
  const db = getSupabaseServerClient();

  console.group('📚 [CourseLearnPage] Page Loading');
  console.log('📋 Request Details:', {
    userId: user?.id || 'NOT AUTHENTICATED',
    courseId: id,
    moduleId: moduleId || 'DEFAULT (first module)',
    locale,
    timestamp: new Date().toISOString()
  });

  if (!user) {
    console.log('🔒 User not authenticated, redirecting to auth');
    console.groupEnd();
    redirect(`/${locale}/auth?redirect=/${locale}/courses/${id}/learn`);
  }

  // Fetch course with modules
  console.log('🔍 Fetching course and modules from database...');
  const { data: rawCourse } = await db
    .from('courses')
    .select(`
      *,
      course_modules (*)
    `)
    .eq('id', id)
    .single();

  if (!rawCourse) {
    console.error('❌ Course not found:', { courseId: id });
    console.groupEnd();
    notFound();
  }

  console.log('✅ Course fetched:', {
    courseId: rawCourse.id,
    title: rawCourse.title_en,
    moduleCount: rawCourse.course_modules?.length || 0
  });

  const course = normalizeCourseRecord(rawCourse);
  const sortedModules = course.course_modules;
  
  // Get current module (first module if not specified)
  const currentModule = moduleId
    ? sortedModules.find((m) => m.id === moduleId)
    : sortedModules[0];

  console.log('📖 Current module selected:', {
    moduleId: currentModule?.id,
    title: currentModule?.title_en,
    order: currentModule?.order_index,
    contentType: currentModule?.content_type
  });

  if (!currentModule) {
    console.error('❌ Module not found:', { moduleId, courseId: id });
    console.groupEnd();
    notFound();
  }

  // Check/create enrollment automatically for ALL modules (free access for everyone)
  console.log('🔍 Checking enrollment status...');
  const { data: existingEnrollment, error: fetchError } = await db
    .from('course_enrollments')
    .select('*')
    .eq('course_id', id)
    .eq('user_id', user.id)
    .single();

  let enrollment = existingEnrollment;

  console.log('📋 Initial enrollment check:', { 
    found: !!enrollment, 
    enrollmentId: enrollment?.id,
    fetchError: fetchError?.message || 'none'
  });

  if (!enrollment) {
    console.log('📝 No enrollment found, attempting auto-enrollment...');
    const { data: newEnrollment, error: insertError } = await db
      .from('course_enrollments')
      .insert({
        user_id: user.id,
        course_id: id,
        enrolled_at: new Date().toISOString()
      })
      .select()
      .single();
    
    console.log('📋 Insert result:', { 
      success: !!newEnrollment, 
      enrollmentId: newEnrollment?.id,
      error: insertError?.message || 'none',
      errorCode: insertError?.code || 'none'
    });
    
    // If insert fails due to duplicate (23505 = unique violation), fetch the existing enrollment
    if (insertError && (insertError.code === '23505' || insertError.message?.includes('duplicate'))) {
      console.log('⚠️ Enrollment already exists (race condition), fetching existing one');
      const { data: existingEnrollment } = await db
        .from('course_enrollments')
        .select('*')
        .eq('course_id', id)
        .eq('user_id', user.id)
        .single();
      enrollment = existingEnrollment;
      console.log('📋 Fetched existing enrollment:', { enrollmentId: enrollment?.id });
    } else if (insertError) {
      // Log error but DON'T fail - we'll create a temporary enrollment object
      console.error('❌ Failed to create enrollment:', insertError);
      console.log('⚠️ Proceeding without persistent enrollment (guest mode)');
    } else {
      enrollment = newEnrollment;
      console.log('✅ Auto-enrollment created:', { enrollmentId: enrollment?.id });
    }
  } else {
    console.log('✅ Existing enrollment found:', { enrollmentId: enrollment.id });
  }

  // Get user progress (only if enrollment exists)
  console.log('📊 Fetching user progress...');
  const { data: progressData, error: progressError } = await db
    .from('user_progress')
    .select('id, course_id, module_id, completed, completed_at, score, time_spent')
    .eq('user_id', user.id)
    .eq('course_id', id);

  if (progressError) {
    console.error('❌ Failed to fetch user progress:', {
      message: progressError.message,
      code: progressError.code,
      details: progressError.details
    });
  }

  const userProgress = progressData || [];
  console.log('✅ Progress fetched:', {
    totalModules: sortedModules.length,
    completedModules: userProgress.filter(p => p.completed).length,
    progressRecords: userProgress.length
  });

  // Check if current module is locked
  const currentIndex = sortedModules.findIndex((m) => m.id === currentModule.id);
  const isLocked = currentIndex > 0 && !currentModule.is_free && !userProgress.find(
    (p) => p.module_id === sortedModules[currentIndex - 1].id && p.completed
  );

  console.log('🔐 Module lock status:', {
    currentIndex,
    isLocked,
    isFree: currentModule.is_free,
    previousModuleCompleted: currentIndex > 0 ? !!userProgress.find(
      (p) => p.module_id === sortedModules[currentIndex - 1].id && p.completed
    ) : 'N/A (first module)'
  });

  if (isLocked) {
    console.log('⚠️ Module is locked, redirecting to first module');
    console.groupEnd();
    redirect(`/${locale}/courses/${id}/learn?module=${sortedModules[0].id}`);
  }

  const currentProgress = userProgress.find((p) => p.module_id === currentModule.id);

  console.log('✅ Current module progress:', {
    hasProgress: !!currentProgress,
    completed: currentProgress?.completed || false,
    completedAt: currentProgress?.completed_at || 'N/A'
  });

  // If no enrollment after all attempts, create a temporary one for display purposes
  // This allows viewing the course content even if DB write failed
  if (!enrollment) {
    console.warn('⚠️ No enrollment after all checks - creating temporary enrollment for display');
    enrollment = {
      id: 'temp-' + Date.now(),
      user_id: user.id,
      course_id: id,
      enrolled_at: new Date().toISOString()
    };
  }

  console.log('🎉 Page load complete - rendering UI');
  console.groupEnd();

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <ModuleSidebar
          locale={locale}
          courseId={id}
          course={{
            title_en: course.title_en,
            title_es: course.title_es,
            thumbnail_url: course.thumbnail_url ?? null,
          }}
          modules={sortedModules}
          currentModuleId={currentModule.id}
          userProgress={userProgress}
        />

        {/* Main Content */}
        <div className="flex-1 lg:ml-80">
          <div className="max-w-5xl mx-auto p-6">
            {/* Module Player */}
            <ModulePlayer
              locale={locale}
              module={currentModule}
              courseId={id}
              enrollmentId={enrollment.id}
              currentProgress={currentProgress}
            />

            {/* Navigation */}
            <ModuleNavigation
              locale={locale}
              courseId={id}
              currentModule={currentModule}
              modules={sortedModules}
              userProgress={userProgress}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: 'en' | 'es'; id: string }> }) {
  const { locale, id } = await params;
  const db = getSupabaseServerClient();

  const { data: course } = await db
    .from('courses')
    .select('title_en, title_es')
    .eq('id', id)
    .single();

  if (!course) {
    return {
      title: 'Course Not Found',
    };
  }

  const title = locale === 'en' ? course.title_en : course.title_es;

  return {
    title: `${title} - Learn - AINews`,
    robots: {
      index: false, // Don't index learning pages
    },
  };
}
