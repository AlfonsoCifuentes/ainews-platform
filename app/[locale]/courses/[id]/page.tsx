import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { CourseDetail } from '@/components/courses/CourseDetail';

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  // Fetch course data server-side
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  try {
    const response = await fetch(`${baseUrl}/api/courses/${id}`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      notFound();
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      notFound();
    }

    return <CourseDetail course={data.data} locale={locale} />;
  } catch (error) {
    console.error('Error fetching course:', error);
    notFound();
  }
}
