import { notFound, redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { getServerAuthUser } from '@/lib/auth/auth-config';
import { ModulePlayer } from '@/components/courses/ModulePlayer';
import { ModuleNavigation } from '@/components/courses/ModuleNavigation';
import { ModuleSidebar } from '@/components/courses/ModuleSidebar';
import { normalizeCourseRecord } from '@/lib/courses/normalize';

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

  console.log('[CourseLearnPage] Page loaded', {
    userId: user?.id,
    courseId: id,
    moduleId,
    locale
  });

  if (!user) {
    console.log('[CourseLearnPage] User not authenticated, redirecting to auth');
    redirect(`/${locale}/auth?redirect=/${locale}/courses/${id}/learn`);
  }

  // Check enrollment
  const { data: enrollment } = await db
    .from('course_enrollments')
    .select('*')
    .eq('course_id', id)
    .eq('user_id', user.id)
    .single();

  console.log('[CourseLearnPage] Enrollment check', {
    enrolled: !!enrollment,
    enrollmentId: enrollment?.id,
    userId: user.id,
    courseId: id
  });

  if (!enrollment) {
    console.log('[CourseLearnPage] User not enrolled in course, redirecting to course page');
    redirect(`/${locale}/courses/${id}`);
  }

  // Fetch course with modules
  const { data: rawCourse } = await db
    .from('courses')
    .select(`
      *,
      course_modules (*)
    `)
    .eq('id', id)
    .single();

  if (!rawCourse) {
    console.log('[CourseLearnPage] Course not found', { courseId: id });
    notFound();
  }

  const course = normalizeCourseRecord(rawCourse);

  // Sort modules
  const sortedModules = course.course_modules;

  // Get current module (first module if not specified)
  const currentModule = moduleId
    ? sortedModules.find((m) => m.id === moduleId)
    : sortedModules[0];

  if (!currentModule) {
    notFound();
  }

  // Get user progress
  const { data: progress } = await db
    .from('course_progress')
    .select('*')
    .eq('enrollment_id', enrollment.id);

  const userProgress = progress || [];

  // Check if current module is locked
  const currentIndex = sortedModules.findIndex((m) => m.id === currentModule.id);
  const isLocked = currentIndex > 0 && !currentModule.is_free && !userProgress.find(
    (p) => p.module_id === sortedModules[currentIndex - 1].id && p.completed
  );

  if (isLocked) {
    redirect(`/${locale}/courses/${id}/learn?module=${sortedModules[0].id}`);
  }

  const currentProgress = userProgress.find((p) => p.module_id === currentModule.id);

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
