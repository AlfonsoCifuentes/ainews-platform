import { setRequestLocale, getTranslations } from 'next-intl/server';
import { locales, type Locale } from '@/i18n';
import { CourseGeneratorWrapper } from '@/components/courses/CourseGeneratorWrapper';
import { CoursesPageClient } from '@/components/courses/CoursesPageClient';
import { TopCoursesPreview } from '@/components/courses/TopCoursesPreview';
import { Suspense } from 'react';

type CoursesPageProps = {
  params: Promise<{
    locale: Locale;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// ISR: Revalidate every 30 minutes (1800 seconds)
// Courses change less frequently than news
export const revalidate = 1800;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export default async function CoursesPage({ params, searchParams }: CoursesPageProps) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;

  if (!isLocale(locale)) {
    throw new Error('Invalid locale received for courses page.');
  }

  setRequestLocale(locale);

  const tCourses = await getTranslations({ locale, namespace: 'courses' });
  const generateParam = resolvedSearchParams?.generate;
  const initialTopic = Array.isArray(generateParam)
    ? generateParam[0] ?? ''
    : typeof generateParam === 'string'
      ? generateParam
      : '';

  return (
    <CoursesPageClient 
      title={tCourses('title')}
      subtitle={tCourses('catalog.title')}
    >
        <CourseGeneratorWrapper
          locale={locale}
          initialTopic={initialTopic}
          translations={{
            title: tCourses('generator.title'),
            subtitle: tCourses('generator.subtitle'),
            topicLabel: tCourses('generator.topicLabel'),
            topicPlaceholder: tCourses('generator.topicPlaceholder'),
            difficultyLabel: tCourses('generator.difficultyLabel'),
            durationLabel: tCourses('generator.durationLabel'),
            generateButton: tCourses('generator.generateButton'),
            generating: tCourses('generator.generating'),
            difficulties: {
              beginner: tCourses('catalog.beginner'),
              intermediate: tCourses('catalog.intermediate'),
              advanced: tCourses('catalog.advanced'),
            },
            durations: {
              short: tCourses('catalog.short'),
              medium: tCourses('catalog.medium'),
              long: tCourses('catalog.long'),
            },
            progress: {
              analyzing: tCourses('generator.progress.analyzing'),
              outline: tCourses('generator.progress.outline'),
              content: tCourses('generator.progress.content'),
              quizzes: tCourses('generator.progress.quizzes'),
              finalizing: tCourses('generator.progress.finalizing'),
            },
            result: {
              successTitle: tCourses('generator.successTitle'),
              successDescription: tCourses('generator.successDescription'),
              viewCourse: tCourses('generator.viewCourse'),
              errorTitle: tCourses('generator.errorTitle'),
              errorDescription: tCourses('generator.errorDescription'),
              retry: tCourses('generator.retry'),
            },
          }}
        />

        {/* Top 3 Courses Preview */}
        <Suspense fallback={<div className="py-12 text-center">Loading popular courses...</div>}>
          <TopCoursesPreview 
            locale={locale}
          />
        </Suspense>
    </CoursesPageClient>
  );
}
