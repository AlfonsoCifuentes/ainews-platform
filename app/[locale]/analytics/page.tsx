import { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import { AnalyticsPageClient } from '@/components/analytics/AnalyticsPageClient';

export const metadata: Metadata = {
  title: 'Analytics Dashboard - ThotNet Core',
  description: 'Platform performance and user engagement metrics'
};

export default async function AnalyticsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  
  return (
    <AnalyticsPageClient>
      <AnalyticsDashboard />
    </AnalyticsPageClient>
  );
}
