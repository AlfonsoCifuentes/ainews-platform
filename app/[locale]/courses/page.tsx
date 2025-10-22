import { unstable_setRequestLocale, getTranslations } from 'next-intl/server';
import { locales, type Locale } from '@/i18n';
import { CourseGenerator } from '@/components/courses/CourseGenerator';
import { CoursesPageClient } from '@/components/courses/CoursesPageClient';
import { CourseCatalog } from '@/components/courses/CourseCatalog';

type CoursesPageProps = {
  params: {
    locale: Locale;
  };
};

function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export default async function CoursesPage({ params }: CoursesPageProps) {
  const locale = params.locale;

  if (!isLocale(locale)) {
    throw new Error('Invalid locale received for courses page.');
  }

  unstable_setRequestLocale(locale);

  const tCourses = await getTranslations({ locale, namespace: 'courses' });

  return (
    <CoursesPageClient 
      title={tCourses('title')}
      subtitle={tCourses('catalog.title')}
    >
      <CourseGenerator
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

        {/* Course Catalog */}
        <CourseCatalog 
          title={tCourses('catalog.title')}
          beginner={tCourses('catalog.beginner')}
          intermediate={tCourses('catalog.intermediate')}
          advanced={tCourses('catalog.advanced')}
        />
    </CoursesPageClient>
  );
}
