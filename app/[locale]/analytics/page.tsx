import { Metadata } from 'next';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';

export const metadata: Metadata = {
  title: 'Analytics Dashboard - AINews',
  description: 'Platform performance and user engagement metrics'
};

export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}
