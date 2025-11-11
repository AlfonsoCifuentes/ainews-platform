import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ChatbotClient } from '@/components/chatbot/ChatbotClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'chatbot' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function ChatbotPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  return (
    <div className="container mx-auto px-4 py-8">
      <ChatbotClient locale={locale} />
    </div>
  );
}
