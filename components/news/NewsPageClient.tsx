"use client";

import { PullToRefresh } from '@/components/shared/PullToRefresh';
import { CircularScrollProgress } from '@/components/shared/ScrollEffects';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/shared/ToastProvider';

interface NewsPageClientProps {
  children: React.ReactNode;
  locale: string;
}

export function NewsPageClient({ children, locale }: NewsPageClientProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const handleRefresh = async () => {
    try {
      // Refresh the page data
      router.refresh();
      
      // Wait a bit for the refresh to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      showToast(
        locale === 'en' ? 'News updated!' : '¡Noticias actualizadas!',
        'success'
      );
    } catch {
      showToast(
        locale === 'en' ? 'Failed to refresh' : 'Error al actualizar',
        'error'
      );
    }
  };

  return (
    <>
      <PullToRefresh onRefresh={handleRefresh}>
        {children}
      </PullToRefresh>
      <CircularScrollProgress />
    </>
  );
}
