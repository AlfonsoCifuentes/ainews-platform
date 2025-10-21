import { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';

export const metadata: Metadata = {
  title: 'Analytics Dashboard - AINews',
  description: 'Platform performance and user engagement metrics'
};

export default function AnalyticsPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  return <AnalyticsDashboard />;
}
