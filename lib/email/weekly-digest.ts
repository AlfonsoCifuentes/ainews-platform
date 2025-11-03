import { getSupabaseServerClient } from '@/lib/db/supabase';

interface DigestArticle {
  id: string;
  title_en: string;
  title_es: string;
  summary_en: string;
  summary_es: string;
  source_url: string;
  image_url: string;
  category: string;
  published_at: string;
  quality_score: number;
}

interface EmailDigestData {
  locale: 'en' | 'es';
  userEmail: string;
  userName: string;
  topArticles: DigestArticle[];
  trendingTopics: string[];
  weeklyStats: {
    totalArticles: number;
    categoriesCount: Record<string, number>;
  };
}

export function generateWeeklyDigestHTML(data: EmailDigestData): string {
  const { locale, userName, topArticles, trendingTopics, weeklyStats } = data;
  
  const t = locale === 'en' ? {
    greeting: `Hi ${userName}!`,
    title: 'Your Weekly AI Digest',
    subtitle: 'The best AI stories curated just for you',
    topStories: 'Top Stories This Week',
    trendingTitle: 'Trending Topics',
    stats: 'This Week in Numbers',
    totalArticles: `${weeklyStats.totalArticles} new articles`,
    readMore: 'Read Full Article',
    footer: 'You received this email because you subscribed to AINews weekly digest.',
    unsubscribe: 'Unsubscribe',
    preferences: 'Manage preferences',
  } : {
    greeting: `¡Hola ${userName}!`,
    title: 'Tu Resumen Semanal de IA',
    subtitle: 'Las mejores historias de IA curadas especialmente para ti',
    topStories: 'Historias Destacadas Esta Semana',
    trendingTitle: 'Temas en Tendencia',
    stats: 'Esta Semana en Números',
    totalArticles: `${weeklyStats.totalArticles} artículos nuevos`,
    readMore: 'Leer Artículo Completo',
    footer: 'Recibiste este correo porque te suscribiste al resumen semanal de AINews.',
    unsubscribe: 'Cancelar suscripción',
    preferences: 'Gestionar preferencias',
  };

  return `
<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #0a0e1a 0%, #1a1f35 100%);
      padding: 40px 20px;
    }
    
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: #fff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    
    .header {
      background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
      padding: 40px 30px;
      text-align: center;
      color: #fff;
    }
    
    .header h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    
    .header p {
      font-size: 16px;
      opacity: 0.95;
    }
    
    .greeting {
      padding: 30px;
      font-size: 18px;
      color: #1f2937;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      padding: 30px;
      background: #f9fafb;
    }
    
    .stat-card {
      background: #fff;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      text-align: center;
    }
    
    .stat-card .number {
      font-size: 32px;
      font-weight: 700;
      color: #3B82F6;
      margin-bottom: 4px;
    }
    
    .stat-card .label {
      font-size: 14px;
      color: #6b7280;
    }
    
    .section-title {
      padding: 30px 30px 20px;
      font-size: 22px;
      font-weight: 700;
      color: #1f2937;
    }
    
    .article {
      padding: 0 30px 30px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .article:last-child {
      border-bottom: none;
      padding-bottom: 40px;
    }
    
    .article img {
      width: 100%;
      height: 200px;
      object-fit: cover;
      border-radius: 12px;
      margin-bottom: 16px;
    }
    
    .article .category {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 12px;
      background: #EEF2FF;
      color: #3B82F6;
    }
    
    .article h3 {
      font-size: 20px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 12px;
      line-height: 1.4;
    }
    
    .article p {
      font-size: 15px;
      color: #6b7280;
      line-height: 1.6;
      margin-bottom: 16px;
    }
    
    .article .read-more {
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
      color: #fff;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      transition: transform 0.2s;
    }
    
    .article .read-more:hover {
      transform: scale(1.05);
    }
    
    .trending {
      padding: 30px;
      background: #f9fafb;
    }
    
    .trending-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 16px;
    }
    
    .trending-tag {
      padding: 8px 16px;
      background: #fff;
      border: 2px solid #3B82F6;
      border-radius: 20px;
      color: #3B82F6;
      font-weight: 600;
      font-size: 14px;
    }
    
    .footer {
      padding: 30px;
      text-align: center;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
    }
    
    .footer p {
      font-size: 13px;
      color: #6b7280;
      margin-bottom: 16px;
    }
    
    .footer a {
      color: #3B82F6;
      text-decoration: none;
      margin: 0 12px;
      font-size: 13px;
    }
    
    @media (max-width: 600px) {
      .stats {
        grid-template-columns: 1fr;
      }
      
      .header h1 {
        font-size: 24px;
      }
      
      .article h3 {
        font-size: 18px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${t.title}</h1>
      <p>${t.subtitle}</p>
    </div>
    
    <div class="greeting">
      ${t.greeting}
    </div>
    
    <div class="stats">
      <div class="stat-card">
        <div class="number">${weeklyStats.totalArticles}</div>
        <div class="label">${locale === 'en' ? 'New Articles' : 'Artículos Nuevos'}</div>
      </div>
      <div class="stat-card">
        <div class="number">${topArticles.length}</div>
        <div class="label">${locale === 'en' ? 'Top Stories' : 'Historias Destacadas'}</div>
      </div>
    </div>
    
    <h2 class="section-title">${t.topStories}</h2>
    
    ${topArticles.map(article => `
      <div class="article">
        <img src="${article.image_url}" alt="${locale === 'en' ? article.title_en : article.title_es}" />
        <div class="category">${article.category.replace(/-/g, ' ').toUpperCase()}</div>
        <h3>${locale === 'en' ? article.title_en : article.title_es}</h3>
        <p>${locale === 'en' ? article.summary_en : article.summary_es}</p>
        <a href="${article.source_url}" class="read-more">${t.readMore} →</a>
      </div>
    `).join('')}
    
    <div class="trending">
      <h2>${t.trendingTitle}</h2>
      <div class="trending-tags">
        ${trendingTopics.map(topic => `
          <div class="trending-tag">#${topic}</div>
        `).join('')}
      </div>
    </div>
    
    <div class="footer">
      <p>${t.footer}</p>
      <a href="https://ainews.com/${locale}/settings#notifications">${t.preferences}</a>
      <a href="https://ainews.com/${locale}/unsubscribe">${t.unsubscribe}</a>
    </div>
  </div>
</body>
</html>
  `;
}

export async function generateUserDigest(
  userId: string,
  locale: 'en' | 'es'
): Promise<EmailDigestData | null> {
  const db = getSupabaseServerClient();

  // Get user profile
  const { data: profile } = await db
    .from('user_profiles')
    .select('email, username')
    .eq('user_id', userId)
    .single();

  if (!profile || !profile.email) {
    return null;
  }

  // Get user interests
  const { data: interests } = await db
    .from('user_interests')
    .select('interest')
    .eq('user_id', userId);

  const userInterests = interests?.map(i => i.interest) || [];

  // Get top articles from the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: articles } = await db
    .from('news_articles')
    .select('*')
    .gte('published_at', sevenDaysAgo.toISOString())
    .order('quality_score', { ascending: false })
    .limit(50);

  if (!articles || articles.length === 0) {
    return null;
  }

  // Filter by user interests if available
  let filteredArticles = articles;
  if (userInterests.length > 0) {
    filteredArticles = articles.filter(article => 
      article.tags?.some((tag: string) => userInterests.includes(tag)) ||
      userInterests.includes(article.category)
    );
  }

  // Take top 5 articles
  const topArticles = filteredArticles.slice(0, 5);

  // Calculate trending topics
  const tagCounts: Record<string, number> = {};
  articles.forEach(article => {
    article.tags?.forEach((tag: string) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const trendingTopics = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([tag]) => tag);

  // Calculate weekly stats
  const categoriesCount: Record<string, number> = {};
  articles.forEach(article => {
    categoriesCount[article.category] = (categoriesCount[article.category] || 0) + 1;
  });

  return {
    locale,
    userEmail: profile.email,
    userName: profile.username || 'there',
    topArticles,
    trendingTopics,
    weeklyStats: {
      totalArticles: articles.length,
      categoriesCount,
    },
  };
}
