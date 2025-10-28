import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { CourseDetail } from '@/components/courses/CourseDetail';

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

async function getCourseData(id: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  try {
    const response = await fetch(`${baseUrl}/api/courses/${id}`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.success && data.data ? data.data : null;
  } catch (error) {
    console.error('Error fetching course:', error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, id } = await params;
  const course = await getCourseData(id);

  if (!course) {
    return {
      title: 'Course Not Found',
    };
  }

  const title = locale === 'es' ? course.title_es : course.title_en;
  const description = locale === 'es' ? course.description_es : course.description_en;
  const siteName = 'AINews';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  return {
    title: `${title} | ${siteName}`,
    description: description || `Learn about ${title} with this AI-generated course`,
    keywords: course.topics?.join(', '),
    openGraph: {
      title,
      description: description || `Learn about ${title}`,
      type: 'article',
      url: `${siteUrl}/${locale}/courses/${id}`,
      siteName,
      locale,
      images: [
        {
          url: `${siteUrl}/og-course.jpg`, // You can create this image
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description || `Learn about ${title}`,
      images: [`${siteUrl}/og-course.jpg`],
    },
    alternates: {
      languages: {
        en: `${siteUrl}/en/courses/${id}`,
        es: `${siteUrl}/es/courses/${id}`,
      },
    },
  };
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const course = await getCourseData(id);

  if (!course) {
    notFound();
  }

  return <CourseDetail course={course} locale={locale} />;
}
