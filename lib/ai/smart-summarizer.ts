/**
 * Smart Summarization System
 * Generates multi-level summaries for articles and courses
 */

interface SummaryLevel {
  level: 'tldr' | 'quick' | 'standard';
  maxLength: number;
  readingTime: number; // seconds
  prompt: string;
}

interface Summary {
  content_id: string;
  content_type: 'article' | 'course';
  level: SummaryLevel['level'];
  summary_text: string;
  key_points: string[];
  reading_time_seconds: number;
  generated_at: string;
}

export class SmartSummarizer {
  private levels: SummaryLevel[] = [
    {
      level: 'tldr',
      maxLength: 150,
      readingTime: 30,
      prompt: 'Summarize this in 2-3 sentences capturing only the most essential information:'
    },
    {
      level: 'quick',
      maxLength: 300,
      readingTime: 120,
      prompt: 'Create a 1-paragraph summary with the main points and key takeaways:'
    },
    {
      level: 'standard',
      maxLength: 600,
      readingTime: 300,
      prompt: 'Provide a comprehensive summary with structured sections and detailed key points:'
    }
  ];

  /**
   * Generate summary using LLM (free tier)
   */
  async generateSummary(
    contentId: string,
    contentType: 'article' | 'course',
    content: string,
    level: SummaryLevel['level'] = 'quick'
  ): Promise<Summary> {
    const summaryLevel = this.levels.find((l) => l.level === level)!;

    try {
      // Use OpenRouter or Groq (free tier)
      const apiKey = process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY;
      const baseUrl = process.env.OPENROUTER_API_KEY
        ? 'https://openrouter.ai/api/v1'
        : 'https://api.groq.com/openai/v1';

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://thotnet-core.vercel.app',
          'X-Title': 'ThotNet Core Platform'
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_API_KEY ? 'meta-llama/llama-3.1-8b-instruct:free' : 'llama3-8b-8192',
          messages: [
            {
              role: 'system',
              content:
                'You are an expert at creating concise, informative summaries. Focus on key insights and actionable information.'
            },
            {
              role: 'user',
              content: `${summaryLevel.prompt}\n\nContent:\n${content.substring(0, 4000)}`
            }
          ],
          max_tokens: summaryLevel.maxLength * 2,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.statusText}`);
      }

      const data = await response.json();
      const summaryText = data.choices[0].message.content.trim();

      // Extract key points from summary
      const keyPoints = await this.extractKeyPoints(summaryText);

      return {
        content_id: contentId,
        content_type: contentType,
        level,
        summary_text: summaryText,
        key_points: keyPoints,
        reading_time_seconds: summaryLevel.readingTime,
        generated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('[SmartSummarizer] Error generating summary:', error);
      throw error;
    }
  }

  /**
   * Extract bullet-point key points from summary
   */
  private async extractKeyPoints(summary: string): Promise<string[]> {
    // Simple extraction: look for numbered/bulleted lists
    const bulletPatterns = [/^\d+\.\s+(.+)$/gm, /^[•\-\*]\s+(.+)$/gm, /^-\s+(.+)$/gm];

    for (const pattern of bulletPatterns) {
      const matches = Array.from(summary.matchAll(pattern));
      if (matches.length > 0) {
        return matches.map((m) => m[1].trim()).slice(0, 5);
      }
    }

    // Fallback: split by sentences and take first 3-5
    const sentences = summary
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20);

    return sentences.slice(0, Math.min(5, sentences.length));
  }

  /**
   * Generate all summary levels for content
   */
  async generateAllLevels(
    contentId: string,
    contentType: 'article' | 'course',
    content: string
  ): Promise<Summary[]> {
    const summaries = await Promise.all(
      this.levels.map((level) => this.generateSummary(contentId, contentType, content, level.level))
    );

    return summaries;
  }

  /**
   * Get estimated reading time for content
   */
  estimateReadingTime(content: string, wordsPerMinute: number = 200): number {
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  /**
   * Format summary for display
   */
  formatSummary(summary: Summary, locale: 'en' | 'es'): {
    title: string;
    subtitle: string;
    content: string;
  } {
    const titles = {
      tldr: { en: '⚡ TL;DR', es: '⚡ Resumen Ultra Rápido' },
      quick: { en: '📖 Quick Read', es: '📖 Lectura Rápida' },
      standard: { en: '📚 Full Summary', es: '📚 Resumen Completo' }
    };

    const subtitles = {
      tldr: { en: '30 second read', es: '30 segundos' },
      quick: { en: '2 minute read', es: '2 minutos' },
      standard: { en: '5 minute read', es: '5 minutos' }
    };

    return {
      title: titles[summary.level][locale],
      subtitle: subtitles[summary.level][locale],
      content: summary.summary_text
    };
  }
}

export const smartSummarizer = new SmartSummarizer();
