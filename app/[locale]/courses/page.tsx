import { unstable_setRequestLocale, getTranslations } from 'next-intl/server';
import { locales, type Locale } from '@/i18n';
import { CourseGenerator } from '@/components/courses/CourseGenerator';

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
    <main className="min-h-screen px-4 py-12">
      <div className="container mx-auto max-w-4xl">
        <header className="mb-12 text-center">
          <p className="mb-2 text-sm uppercase tracking-widest text-primary">
            AI-Powered Learning
          </p>
          <h1 className="mb-4 text-4xl font-bold md:text-5xl">
            {tCourses('title')}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {tCourses('catalog.title')}
          </p>
        </header>

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
          }}
        />

        {/* Course Catalog Placeholder */}
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-bold">
            {tCourses('catalog.title')}
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass rounded-3xl p-6">
                <div className="mb-4 h-32 rounded-xl bg-muted"></div>
                <h3 className="mb-2 text-xl font-bold">Sample Course {i}</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Sample description for course...
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span>{tCourses('catalog.beginner')}</span>
                  <span>2h 30min</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
