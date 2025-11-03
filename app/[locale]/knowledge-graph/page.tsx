import { setRequestLocale } from 'next-intl/server';
import { Metadata } from 'next';
import { KnowledgeGraphClient } from '@/components/kg/KnowledgeGraphClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  
  return {
    title: locale === 'en' ? 'AI Knowledge Graph' : 'Grafo de Conocimiento IA',
    description:
      locale === 'en'
        ? 'Explore connections between AI concepts, technologies, and entities'
        : 'Explora conexiones entre conceptos, tecnologías y entidades de IA',
  };
}

export default async function KnowledgeGraphPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <KnowledgeGraphClient locale={locale as 'en' | 'es'} />;
}
