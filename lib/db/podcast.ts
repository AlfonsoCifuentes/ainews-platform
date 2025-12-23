import { getSupabaseServerClient } from '@/lib/db/supabase';
import { podcastEpisodeSchema, type PodcastEpisode } from '@/lib/types/podcast';

export async function fetchLatestPodcastEpisode(): Promise<PodcastEpisode | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return null;
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('news_podcast_episodes')
      .select('*')
      .order('period_end', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return podcastEpisodeSchema.parse(data);
  } catch (error) {
    console.error('[fetchLatestPodcastEpisode] Failed:', error);
    return null;
  }
}