import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ChatGPTInterfaceClient } from '@/components/chat/ChatGPTInterfaceClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'chat' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function ChatPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  return (
    <div className="h-[calc(100vh-80px)]">
      <ChatGPTInterfaceClient locale={locale} />
    </div>
  );
}
