import { setRequestLocale, getTranslations } from 'next-intl/server';
import { locales, type Locale } from '@/i18n';
import { CoursesLibraryPageClient } from '@/components/courses/CoursesLibraryPageClient';
import { generateLocalizedMetadata } from '@/lib/utils/seo';
import { Metadata } from 'next';

type CoursesLibraryPageProps = {
  params: Promise<{
    locale: Locale;
  }>;
};

export const revalidate = 1800;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: CoursesLibraryPageProps): Promise<Metadata> {
  const { locale } = await params;
  
  const title = locale === 'en' ? 'Complete Courses Library' : 'Biblioteca Completa de Cursos';
  const description =
    locale === 'en'
      ? 'Explore our complete library of AI courses. Filter by category, difficulty level, and duration. Find the perfect course for your learning journey.'
      : 'Explora nuestra biblioteca completa de cursos de IA. Filtra por categoría, nivel de dificultad y duración. Encuentra el curso perfecto para tu camino de aprendizaje.';

  return generateLocalizedMetadata(title, description, `/${locale}/courses-library`, locale, {
    keywords: locale === 'en' 
      ? ['AI courses', 'machine learning', 'deep learning', 'course library', 'learn AI']
      : ['cursos IA', 'aprendizaje automático', 'deep learning', 'biblioteca de cursos', 'aprender IA'],
    type: 'website',
  });
}

export default async function CoursesLibraryPage({ params }: CoursesLibraryPageProps) {
  const { locale } = await params;

  setRequestLocale(locale);

  await getTranslations('courses');

  return (
    <main className="min-h-screen bg-[#020309]">
      <CoursesLibraryPageClient locale={locale} />
    </main>
  );
}
