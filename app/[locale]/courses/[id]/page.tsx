import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/db/supabase';
import { getServerAuthUser } from '@/lib/auth/auth-config';
import { CourseModulesList } from '@/components/courses/CourseModulesList';
import { CourseEnrollButton } from '@/components/courses/CourseEnrollButton';
import { CourseProgress } from '@/components/courses/CourseProgress';
import { CourseReviews } from '@/components/courses/CourseReviews';
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
import Image from 'next/image';

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ locale: 'en' | 'es'; id: string }>;
}) {
  const { locale, id } = await params;
  const user = await getServerAuthUser();
  const db = getSupabaseServerClient();

  // Fetch course details
  const { data: course, error } = await db
    .from('courses')
    .select(`
      *,
      course_modules (
        id,
        title_en,
        title_es,
        description_en,
        description_es,
        order_index,
        duration_minutes,
        content_type,
        is_free
      )
    `)
    .eq('id', id)
    .single();

  if (error || !course) {
    notFound();
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
  const totalModules = course.course_modules?.length || 0;
  const completedModules = userProgress?.filter((p) => p.completed).length || 0;
  const progressPercentage = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;

  const avgRating = reviews && reviews.length > 0
    ? reviews.reduce((acc: number, r) => acc + r.rating, 0) / reviews.length
    : 0;

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
    videoLessons: 'Video Lessons',
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
    videoLessons: 'Lecciones en Video',
    quizzes: 'Cuestionarios y Evaluaciones',
    certificate: 'Certificado de Finalización',
    lifetime: 'Acceso de Por Vida',
    beginner: 'Principiante',
    intermediate: 'Intermedio',
    advanced: 'Avanzado',
  };

  const title = locale === 'en' ? course.title_en : course.title_es;
  const description = locale === 'en' ? course.description_en : course.description_es;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Left: Course Info */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  {course.category}
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                {title}
              </h1>

              <p className="text-lg text-muted-foreground">
                {description}
              </p>

              {/* Stats */}
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold">{avgRating.toFixed(1)}</span>
                  <span className="text-muted-foreground">({reviews?.length || 0})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">{course.enrolled_count || 0} {t.students}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">{Math.ceil((course.total_duration_minutes || 0) / 60)} {t.hours}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">{totalModules} {t.modules_count}</span>
                </div>
              </div>

              {/* Progress or Enroll */}
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

            {/* Right: Course Image */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl group">
              <Image
                src={course.thumbnail_url || '/images/course-placeholder.jpg'}
                alt={title}
                width={800}
                height={450}
                className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500"
                priority
              />
              {enrollment && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <PlayCircle className="w-20 h-20 text-white" />
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
            <div className="p-8 rounded-2xl bg-card border">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-primary" />
                {t.whatYouWillLearn}
              </h2>
              <ul className="grid md:grid-cols-2 gap-4">
                {(locale === 'en' ? course.learning_objectives_en : course.learning_objectives_es)?.map((objective: string, i: number) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Modules */}
            <div className="p-8 rounded-2xl bg-card border">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-primary" />
                {t.modules}
              </h2>
              <CourseModulesList
                locale={locale}
                modules={course.course_modules || []}
                courseId={id}
                enrollment={enrollment}
                userProgress={userProgress || []}
              />
            </div>

            {/* Reviews */}
            <div className="p-8 rounded-2xl bg-card border">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Star className="w-6 h-6 text-primary" />
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
            <div className="p-6 rounded-2xl bg-card border sticky top-24">
              <h3 className="text-lg font-bold mb-4">{t.courseIncludes}</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <PlayCircle className="w-5 h-5 text-primary" />
                  <span className="text-sm">{t.videoLessons}</span>
                </li>
                <li className="flex items-center gap-3">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <span className="text-sm">{t.quizzes}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-primary" />
                  <span className="text-sm">{t.certificate}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary" />
                  <span className="text-sm">{t.lifetime}</span>
                </li>
              </ul>

              <div className="mt-6 pt-6 border-t space-y-3">
                <div>
                  <span className="text-sm text-muted-foreground">{t.difficulty}</span>
                  <p className="font-semibold mt-1">
                    {t[course.difficulty_level as 'beginner' | 'intermediate' | 'advanced']}
                  </p>
                </div>
                {course.prerequisites_en && (
                  <div>
                    <span className="text-sm text-muted-foreground">{t.prerequisites}</span>
                    <p className="text-sm mt-1">
                      {locale === 'en' ? course.prerequisites_en : course.prerequisites_es}
                    </p>
                  </div>
                )}
              </div>
            </div>
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
    .select('title_en, title_es, description_en, description_es, thumbnail_url')
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
      images: course.thumbnail_url ? [{ url: course.thumbnail_url }] : [],
    },
  };
}
