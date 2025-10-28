# RSS News Sources - AINews Platform

## Active English RSS Feeds

### Industry News & Business
1. **VentureBeat AI** - `https://venturebeat.com/category/ai/feed/`
   - Industry launches, strategy, transformative AI
   - Priority: HIGH

2. **TechCrunch AI** - `https://techcrunch.com/category/artificial-intelligence/feed/`
   - Startup news, funding, product releases
   - Priority: HIGH

3. **The Verge AI** - `https://www.theverge.com/rss/ai-artificial-intelligence/index.xml`
   - Consumer tech, reviews, analysis
   - Priority: HIGH

4. **Wired AI** - `https://www.wired.com/feed/tag/ai/latest/rss`
   - Machine learning, computer vision, product
   - Priority: HIGH

5. **The Guardian AI** - `https://www.theguardian.com/technology/artificialintelligenceai/rss`
   - Global journalism, ethics, impact
   - Priority: MEDIUM

6. **Futurism AI** - `https://futurism.com/categories/ai-artificial-intelligence/feed`
   - Robotics, future scenarios
   - Priority: MEDIUM

### Research & Academic
7. **MIT Technology Review** - `https://www.technologyreview.com/feed/`
   - Business impact, ethics, science
   - Priority: HIGH

8. **DeepMind Blog** - `https://deepmind.google/blog/rss.xml`
   - Research breakthroughs, papers
   - Priority: HIGH

9. **Google AI Blog** - `https://blog.google/technology/ai/rss/`
   - Official Google AI announcements
   - Priority: HIGH

10. **OpenAI Blog** - `https://openai.com/blog/rss.xml`
    - Official OpenAI releases
    - Priority: HIGH

11. **ScienceDaily AI** - `https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml`
    - Academic advances, research papers
    - Priority: MEDIUM

12. **Machine Learning Mastery** - `https://machinelearningmastery.com/blog/feed/`
    - Tutorials, practical guides
    - Priority: MEDIUM

### Community & Aggregators
13. **Last Week in AI** - `https://lastweekin.ai/feed`
    - Weekly editorial summary
    - Priority: HIGH

14. **Reddit r/Artificial** - `https://www.reddit.com/r/artificial/.rss`
    - Community discussions, trending links
    - Priority: MEDIUM

## Broken/Unavailable Feeds

⚠️ **Artificial Intelligence News** - `https://www.artificialintelligence-news.com/feed/rss/`
- Status: Invalid XML (Entity name error)
- Action: Skip for now, monitor for fixes

## Spanish Sources (To Implement)

### General News
- **El País IA** - No RSS, requires scraping
  URL: `https://elpais.com/noticias/inteligencia-artificial/`

- **Xataka IA** - No RSS, requires scraping
  URL: `https://www.xataka.com/tag/inteligencia-artificial`

- **Agencia EFE IA** - No RSS, requires scraping
  URL: `https://efe.com/noticias/inteligencia-artificial/`

### Specialized Spanish Sites
- **The AI Revolution News** - Check for RSS
  URL: `https://theairevolution.news/`

- **SpacioIA** - Check for RSS
  URL: `https://spacioia.com/`

- **20minutos IA** - No RSS
  URL: `https://www.20minutos.es/tags/temas/inteligencia-artificial.html`

## Future Additions

### Blogs & Individual Sources
- [ ] Hugging Face Blog
- [ ] Papers with Code
- [ ] DeepLearning.AI (The Batch)
- [ ] Fast.ai Blog
- [ ] Distill.pub

### News Aggregators
- [ ] Google News RSS (custom keywords)
- [ ] Bing News RSS (AI keywords)

### Podcasts with RSS
- [ ] NVIDIA AI Podcast
- [ ] Lex Fridman (audio feed)
- [ ] TWIML AI

## Import Configuration

### Current Settings
```typescript
const RSS_SOURCES = [
  { url: string, category: 'machinelearning' | 'research' | 'industry' }
];
```

### Import Strategy
- **Frequency**: Every 6 hours (GitHub Actions)
- **Articles per feed**: 10 latest
- **Deduplication**: By source_url + published_at
- **Image extraction**: 6-step algorithm with fallbacks
- **Translation**: Quick copy for now (LLM translation in phase 2)

### Quality Filters
- Minimum content length: 100 characters
- Valid published date required
- Source URL must be valid
- Image preference: Original > Extracted > Category fallback

## Monitoring

### Health Check
Run weekly to verify:
- [ ] All feeds still accessible
- [ ] No 403/404 errors
- [ ] XML parsing works
- [ ] Images loading correctly
- [ ] No duplicate articles in DB

### Performance Metrics
- Average articles/day
- Success rate per source
- Image extraction success rate
- Category distribution
- Reading time accuracy
