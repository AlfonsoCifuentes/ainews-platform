'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';

interface AnalyticsData {
  totalArticles: number;
  totalBookmarks: number;
  totalFlashcards: number;
  readingStreak: number;
  activityHistory: Array<{
    date: string;
    articlesRead: number;
    flashcardsReviewed: number;
  }>;
}

export function UserAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const res = await fetch('/api/analytics/user');
      if (res.ok) {
        const result = await res.json();
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  if (!data) {
    return <div className="text-center py-8">No analytics data available</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Articles Read"
          value={data.totalArticles}
          icon="📚"
        />
        <StatCard
          title="Bookmarks"
          value={data.totalBookmarks}
          icon="🔖"
        />
        <StatCard
          title="Flashcards"
          value={data.totalFlashcards}
          icon="🎴"
        />
        <StatCard
          title="Day Streak"
          value={data.readingStreak}
          icon="🔥"
        />
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Activity History</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.activityHistory.map((entry, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between border-b pb-2"
              >
                <span className="text-sm text-muted-foreground">
                  {new Date(entry.date).toLocaleDateString()}
                </span>
                <div className="flex gap-4 text-sm">
                  <span>📖 {entry.articlesRead}</span>
                  <span>🎴 {entry.flashcardsReviewed}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: string;
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <span className="text-4xl">{icon}</span>
        </div>
      </CardContent>
    </Card>
  );
}
