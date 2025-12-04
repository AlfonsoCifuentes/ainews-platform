import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { getServerAuthUser } from '@/lib/auth/auth-config';
import { CourseModulesList } from '@/components/courses/CourseModulesList';
import { CourseEnrollButton } from '@/components/courses/CourseEnrollButton';
import { CourseProgress } from '@/components/courses/CourseProgress';
import { CourseReviews } from '@/components/courses/CourseReviews';
import { ShareCourseButton } from '@/components/courses/ShareCourseButton';
import { AudioPlayer } from '@/components/content/AudioPlayer';
import { FlashcardDeck } from '@/components/flashcards/FlashcardDeck';
import { DiscussionThread } from '@/components/content/DiscussionThread';
import { 
  Clock, 
  BookOpen, 
  Award, 
  Users, 
  Star,
  BarChart3,
  CheckCircle2,
  PlayCircle
} from 'lucide-react';
// Use client-side lazy image for robust load & fallback handling
import { CourseThumbnail } from '@/components/courses/CourseThumbnail';
import { normalizeCourseRecord } from '@/lib/courses/normalize';

// Brutalist design tokens
const BRUTALIST = {
  bg: '#020309',
  bgCard: '#0A0A0A',
  text: '#EAEAEA',
  textMuted: '#888888',
  border: '#1F1F1F',
};

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ locale: 'en' | 'es'; id: string }>;
}) {
  const { locale, id } = await params;
  const user = await getServerAuthUser();
  const db = getSupabaseServerClient();

  // Fetch course details
  console.log('Fetching course with ID:', id, 'for locale:', locale);
  const { data: rawCourse, error } = await db
    .from('courses')
    .select(`
      *,
      course_modules (*)
    `)
    .eq('id', id)
    .single();

  console.log('Course query result:', { course: !!rawCourse, error });

  if (error || !rawCourse) {
    console.log('Course not found, calling notFound()');
    notFound();
  }

  const course = normalizeCourseRecord(rawCourse);
  
  // Debug: log course modules
  if (!course.course_modules || course.course_modules.length === 0) {
    console.warn('[CourseDetail] Course has no modules', { 
      courseId: id, 
      rawModules: rawCourse.course_modules,
      normalizedModules: course.course_modules 
    });
  } else {
    console.log('[CourseDetail] Loaded modules:', { 
      count: course.course_modules.length,
      modules: course.course_modules.map(m => ({ id: m.id, title_en: m.title_en }))
    });
  }

  // Check enrollment status
  let enrollment = null;
  let userProgress = null;
  
  if (user) {
    const { data: enrollmentData } = await db
      .from('course_enrollments')
      .select('*, course_progress (*)')
      .eq('course_id', id)
      .eq('user_id', user.id)
      .single();

    enrollment = enrollmentData;
    
    if (enrollment) {
      const { data: progressData } = await db
        .from('course_progress')
        .select('*')
        .eq('enrollment_id', enrollment.id);
      
      userProgress = progressData || [];
    }
  }

  // Fetch reviews
  const { data: reviews } = await db
    .from('course_reviews')
    .select(`
      *,
      user_profiles (username, avatar_url)
    `)
    .eq('course_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Calculate stats
  const totalModules = course.course_modules.length;
  const completedModules = userProgress?.filter((p) => p.completed).length || 0;
  const progressPercentage = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;

  const avgRating = reviews && reviews.length > 0
    ? reviews.reduce((acc: number, r) => acc + r.rating, 0) / reviews.length
    : course.rating_avg;

  const t = locale === 'en' ? {
    overview: 'Overview',
    modules: 'Course Modules',
    reviews: 'Reviews',
    enrollNow: 'Enroll Now',
    continuelearning: 'Continue Learning',
    modules_count: 'modules',
    hours: 'hours',
    students: 'students',
    rating: 'rating',
    difficulty: 'Difficulty',
    prerequisites: 'Prerequisites',
    whatYouWillLearn: 'What You Will Learn',
    courseIncludes: 'This Course Includes',
    courseContent: 'Comprehensive Course Content',
    quizzes: 'Quizzes & Assessments',
    certificate: 'Certificate of Completion',
    lifetime: 'Lifetime Access',
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
  } : {
    overview: 'Resumen',
    modules: 'Módulos del Curso',
    reviews: 'Reseñas',
    enrollNow: 'Inscribirse Ahora',
    continuelearning: 'Continuar Aprendiendo',
    modules_count: 'módulos',
    hours: 'horas',
    students: 'estudiantes',
    rating: 'calificación',
    difficulty: 'Dificultad',
    prerequisites: 'Requisitos Previos',
    whatYouWillLearn: 'Lo Que Aprenderás',
    courseIncludes: 'Este Curso Incluye',
    courseContent: 'Contenido Completo del Curso',
    quizzes: 'Cuestionarios y Evaluaciones',
    certificate: 'Certificado de Finalización',
    lifetime: 'Acceso de Por Vida',
    beginner: 'Principiante',
    intermediate: 'Intermedio',
    advanced: 'Avanzado',
  };

  const title = (locale === 'en' ? course.title_en : course.title_es) ?? 'Course';
  const description = (locale === 'en' ? course.description_en : course.description_es) ?? '';
  const categoryLabel = course.category ?? (locale === 'en' ? 'AI & ML' : 'IA & ML');
  const durationMinutes = course.duration_minutes || 0;
  const durationLabel = durationMinutes >= 60
    ? `${Math.round(durationMinutes / 60)} ${t.hours}`
    : `${durationMinutes} ${locale === 'en' ? 'minutes' : 'minutos'}`;
  const learningObjectives = locale === 'en' ? course.learning_objectives_en : course.learning_objectives_es;

  return (
    <div className="min-h-screen" style={{ backgroundColor: BRUTALIST.bg }}>
      {/* Hero Section */}
      <div className="border-b" style={{ borderColor: BRUTALIST.border }}>
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Left: Course Info */}
            <div className="space-y-6">
              <div 
                className="inline-flex items-center gap-2 px-4 py-2 border font-mono text-sm uppercase tracking-wider"
                style={{ borderColor: BRUTALIST.border, color: BRUTALIST.text }}
              >
                <BookOpen className="w-4 h-4" />
                <span>{categoryLabel}</span>
              </div>

              <h1 
                className="font-mono text-3xl md:text-4xl lg:text-5xl font-bold uppercase tracking-tight leading-tight"
                style={{ color: BRUTALIST.text }}
              >
                {title}
              </h1>

              <p className="font-mono text-base" style={{ color: BRUTALIST.textMuted }}>
                {description}
              </p>

              {/* Stats */}
              <div className="flex flex-wrap gap-6 font-mono text-sm">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5" style={{ color: BRUTALIST.text }} />
                  <span style={{ color: BRUTALIST.text }}>{avgRating.toFixed(1)}</span>
                  <span style={{ color: BRUTALIST.textMuted }}>({reviews?.length || 0})</span>
                </div>
                <div className="flex items-center gap-2" style={{ color: BRUTALIST.textMuted }}>
                  <Users className="w-5 h-5" />
                  <span>{course.enrollment_count || 0} {t.students}</span>
                </div>
                <div className="flex items-center gap-2" style={{ color: BRUTALIST.textMuted }}>
                  <Clock className="w-5 h-5" />
                  <span>{durationLabel}</span>
                </div>
                <div className="flex items-center gap-2" style={{ color: BRUTALIST.textMuted }}>
                  <BookOpen className="w-5 h-5" />
                  <span>{totalModules} {t.modules_count}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Progress or Enroll */}
                <div className="flex-1 min-w-[200px]">
                  {enrollment ? (
                    <CourseProgress
                      locale={locale}
                      progress={progressPercentage}
                      completedModules={completedModules}
                      totalModules={totalModules}
                      courseId={id}
                    />
                  ) : (
                    <CourseEnrollButton
                      locale={locale}
                      courseId={id}
                      userId={user?.id}
                    />
                  )}
                </div>

                {/* Share Button */}
                <ShareCourseButton
                  courseId={id}
                  courseTitle={title}
                  courseDescription={description}
                  locale={locale}
                />
              </div>
            </div>

            {/* Right: Course Image */}
            <div className="relative overflow-hidden border group" style={{ borderColor: BRUTALIST.border }}>
                <CourseThumbnail
                  src={course.thumbnail_url}
                  alt={title}
                  width={800}
                  height={450}
                  className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500"
                />
              {enrollment && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <PlayCircle className="w-20 h-20" style={{ color: BRUTALIST.text }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Course Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* What You'll Learn */}
            <div className="p-8 border" style={{ backgroundColor: BRUTALIST.bgCard, borderColor: BRUTALIST.border }}>
              <h2 className="font-mono text-xl font-bold mb-6 flex items-center gap-2 uppercase tracking-tight" style={{ color: BRUTALIST.text }}>
                <CheckCircle2 className="w-6 h-6" />
                {t.whatYouWillLearn}
              </h2>
              <ul className="grid md:grid-cols-2 gap-4">
                {learningObjectives.map((objective, i) => (
                  <li key={i} className="flex items-start gap-3 font-mono text-sm" style={{ color: BRUTALIST.textMuted }}>
                    <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" style={{ color: BRUTALIST.text }} />
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Modules */}
            <div className="p-8 border" style={{ backgroundColor: BRUTALIST.bgCard, borderColor: BRUTALIST.border }}>
              <h2 className="font-mono text-xl font-bold mb-6 flex items-center gap-2 uppercase tracking-tight" style={{ color: BRUTALIST.text }}>
                <BookOpen className="w-6 h-6" />
                {t.modules}
              </h2>
              <CourseModulesList
                locale={locale}
                modules={course.course_modules}
                courseId={id}
                enrollment={enrollment}
                userProgress={userProgress || []}
              />
            </div>

            {/* Reviews */}
            <div className="p-8 border" style={{ backgroundColor: BRUTALIST.bgCard, borderColor: BRUTALIST.border }}>
              <h2 className="font-mono text-xl font-bold mb-6 flex items-center gap-2 uppercase tracking-tight" style={{ color: BRUTALIST.text }}>
                <Star className="w-6 h-6" />
                {t.reviews}
              </h2>
              <CourseReviews
                locale={locale}
                courseId={id}
                reviews={reviews || []}
                userReview={reviews?.find((r) => r.user_id === user?.id)}
                canReview={!!enrollment}
              />
            </div>
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-6">
            {/* Course Includes */}
            <div className="p-6 border sticky top-24" style={{ backgroundColor: BRUTALIST.bgCard, borderColor: BRUTALIST.border }}>
              <h3 className="font-mono text-lg font-bold mb-4 uppercase" style={{ color: BRUTALIST.text }}>{t.courseIncludes}</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 font-mono text-sm" style={{ color: BRUTALIST.textMuted }}>
                  <BookOpen className="w-5 h-5" style={{ color: BRUTALIST.text }} />
                  <span>{t.courseContent}</span>
                </li>
                <li className="flex items-center gap-3 font-mono text-sm" style={{ color: BRUTALIST.textMuted }}>
                  <BarChart3 className="w-5 h-5" style={{ color: BRUTALIST.text }} />
                  <span>{t.quizzes}</span>
                </li>
                <li className="flex items-center gap-3 font-mono text-sm" style={{ color: BRUTALIST.textMuted }}>
                  <Award className="w-5 h-5" style={{ color: BRUTALIST.text }} />
                  <span>{t.certificate}</span>
                </li>
                <li className="flex items-center gap-3 font-mono text-sm" style={{ color: BRUTALIST.textMuted }}>
                  <Clock className="w-5 h-5" style={{ color: BRUTALIST.text }} />
                  <span>{t.lifetime}</span>
                </li>
              </ul>

              <div className="mt-6 pt-6 space-y-3" style={{ borderTop: `1px solid ${BRUTALIST.border}` }}>
                <div>
                  <span className="font-mono text-xs uppercase tracking-wider" style={{ color: BRUTALIST.textMuted }}>{t.difficulty}</span>
                  <p className="font-mono font-bold mt-1" style={{ color: BRUTALIST.text }}>
                    {t[course.difficulty]}
                  </p>
                </div>
                {course.prerequisites_en && (
                  <div>
                    <span className="font-mono text-xs uppercase tracking-wider" style={{ color: BRUTALIST.textMuted }}>{t.prerequisites}</span>
                    <p className="font-mono text-sm mt-1" style={{ color: BRUTALIST.text }}>
                      {locale === 'en' ? course.prerequisites_en : course.prerequisites_es}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audio Player - Phase 5+ */}
      <div className="container mx-auto px-4 py-8">
        <AudioPlayer 
          contentId={course.id} 
          contentType="course" 
          locale={locale} 
        />
      </div>

      {/* Flashcard Study System - Phase 5+ */}
      <section className="py-16" style={{ borderTop: `1px solid ${BRUTALIST.border}`, backgroundColor: BRUTALIST.bg }}>
        <div className="container mx-auto px-4">
          <FlashcardDeck 
            contentId={course.id} 
            contentType="course" 
            locale={locale} 
          />
        </div>
      </section>

      {/* Discussion Thread - Phase 5+ */}
      <section className="py-16" style={{ borderTop: `1px solid ${BRUTALIST.border}`, backgroundColor: BRUTALIST.bgCard }}>
        <div className="container mx-auto px-4">
          <h2 className="mb-8 font-mono text-2xl md:text-3xl font-bold uppercase tracking-tight" style={{ color: BRUTALIST.text }}>
            {locale === 'en' ? 'Discussion' : 'Discusión'}
          </h2>
          <DiscussionThread 
            contentId={course.id} 
            contentType="course" 
            locale={locale} 
          />
        </div>
      </section>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: 'en' | 'es'; id: string }> }) {
  const { locale, id } = await params;
  const db = getSupabaseServerClient();

  const { data: course } = await db
    .from('courses')
    .select('title_en, title_es, description_en, description_es')
    .eq('id', id)
    .single();

  if (!course) {
    return {
      title: 'Course Not Found',
    };
  }

  const title = locale === 'en' ? course.title_en : course.title_es;
  const description = locale === 'en' ? course.description_en : course.description_es;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  };
}
