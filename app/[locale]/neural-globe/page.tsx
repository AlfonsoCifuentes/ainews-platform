import { setRequestLocale } from 'next-intl/server';

import { NeuralGlobeBackground } from '@/components/effects/NeuralGlobeBackground';

export const metadata = {
  title: 'Neural Globe',
  description: 'Wireframe globe with neural network particles.',
};

export default async function NeuralGlobePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen w-full bg-black">
      <NeuralGlobeBackground />
    </main>
  );
}
