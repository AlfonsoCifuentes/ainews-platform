export type SourceLanguage = 'en' | 'es' | 'multi';

export type SourceCategory =
  | 'company'
  | 'news'
  | 'research'
  | 'newsletter'
  | 'tutorials'
  | 'aggregator'
  | 'community';

export interface NewsSource {
  name: string;
  url: string;
  category: SourceCategory;
  language: SourceLanguage;
  notes?: string;
}

export const AI_NEWS_SOURCES: readonly NewsSource[] = [
  // ══════════════════════════════════════════════════════════════════════════════
  // CORE AI COMPANY BLOGS (Primary Sources)
  // ══════════════════════════════════════════════════════════════════════════════
  { name: 'OpenAI Blog', url: 'https://openai.com/news/rss.xml', category: 'company', language: 'en', notes: 'Official OpenAI announcements' },
  { name: 'Google DeepMind', url: 'https://deepmind.google/discover/blog/rss.xml', category: 'company', language: 'en', notes: 'DeepMind research updates' },
  { name: 'Google AI Blog', url: 'http://googleaiblog.blogspot.com/atom.xml', category: 'company', language: 'en', notes: 'Google Research blog' },
  { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml', category: 'company', language: 'en', notes: 'Open source AI hub' },
  { name: 'Microsoft Azure AI', url: 'https://azure.microsoft.com/en-us/blog/topics/artificial-intelligence/feed/', category: 'company', language: 'en', notes: 'Enterprise AI updates' },
  { name: 'Microsoft Research', url: 'https://www.microsoft.com/en-us/research/feed/', category: 'research', language: 'en' },
  { name: 'NVIDIA Technical Blog – AI', url: 'https://developer.nvidia.com/blog/tag/artificial-intelligence/feed/', category: 'company', language: 'en' },
  { name: 'Anthropic Blog', url: 'https://www.anthropic.com/news/rss', category: 'company', language: 'en', notes: 'Claude AI creators' },
  { name: 'Meta AI Blog', url: 'https://ai.meta.com/blog/rss/', category: 'company', language: 'en', notes: 'LLaMA and Meta AI research' },
  { name: 'Cohere Blog', url: 'https://cohere.com/blog/rss.xml', category: 'company', language: 'en', notes: 'Enterprise LLM provider' },
  { name: 'Stability AI Blog', url: 'https://stability.ai/news/rss', category: 'company', language: 'en', notes: 'Stable Diffusion creators' },
  { name: 'Mistral AI Blog', url: 'https://mistral.ai/news/rss', category: 'company', language: 'en', notes: 'European open-weights LLMs' },

  // ══════════════════════════════════════════════════════════════════════════════
  // ACADEMIC & RESEARCH FEEDS
  // ══════════════════════════════════════════════════════════════════════════════
  { name: 'arXiv cs.AI', url: 'http://export.arxiv.org/rss/cs.AI', category: 'research', language: 'en' },
  { name: 'arXiv cs.LG', url: 'http://export.arxiv.org/rss/cs.LG', category: 'research', language: 'en' },
  { name: 'arXiv cs.CL', url: 'http://export.arxiv.org/rss/cs.CL', category: 'research', language: 'en' },
  { name: 'arXiv cs.CV', url: 'http://export.arxiv.org/rss/cs.CV', category: 'research', language: 'en', notes: 'Computer Vision papers' },
  { name: 'arXiv cs.RO', url: 'http://export.arxiv.org/rss/cs.RO', category: 'research', language: 'en', notes: 'Robotics papers' },
  { name: 'Distill.pub', url: 'https://distill.pub/rss.xml', category: 'research', language: 'en', notes: 'Interactive ML research articles' },
  // ML Collective removed - 404 error

  // ══════════════════════════════════════════════════════════════════════════════
  // ENGLISH AI NEWS (Industry & Business)
  // ══════════════════════════════════════════════════════════════════════════════
  // VentureBeat AI removed - parse error (feed format issues)
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', category: 'news', language: 'en', notes: 'Startups and funding' },
  { name: 'The Verge AI', url: 'https://www.theverge.com/rss/artificial-intelligence/index.xml', category: 'news', language: 'en', notes: 'Consumer AI perspective' },
  { name: 'MIT Technology Review – AI', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed', category: 'news', language: 'en', notes: 'Deep analysis, less hype' },
  { name: 'Artificial Intelligence News (TechForge)', url: 'https://www.artificialintelligence-news.com/feed/rss/', category: 'news', language: 'en' },
  { name: 'The Guardian – Artificial Intelligence', url: 'https://www.theguardian.com/technology/artificialintelligenceai/rss', category: 'news', language: 'en' },
  { name: 'Wired – AI', url: 'https://www.wired.com/feed/tag/ai/latest/rss', category: 'news', language: 'en' },
  { name: 'Futurism – AI', url: 'https://futurism.com/categories/ai-artificial-intelligence/feed', category: 'news', language: 'en' },
  { name: 'ScienceDaily – Artificial Intelligence', url: 'https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml', category: 'news', language: 'en' },
  { name: 'Ars Technica – AI', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', category: 'news', language: 'en', notes: 'Tech coverage with AI focus' },
  { name: 'ZDNet – AI', url: 'https://www.zdnet.com/topic/artificial-intelligence/rss.xml', category: 'news', language: 'en' },
  { name: 'The Register – AI', url: 'https://www.theregister.com/software/ai_ml/headlines.atom', category: 'news', language: 'en' },
  // InfoQ AI/ML removed - 406 error
  { name: 'IEEE Spectrum – AI', url: 'https://spectrum.ieee.org/feeds/topic/artificial-intelligence.rss', category: 'news', language: 'en', notes: 'Engineering perspective on AI' },
  { name: 'CNBC AI', url: 'https://www.cnbc.com/id/10001147/device/rss/rss.html', category: 'news', language: 'en', notes: 'AI business news' },
  { name: 'Bloomberg Technology', url: 'https://feeds.bloomberg.com/technology/news.rss', category: 'news', language: 'en', notes: 'Tech/AI markets' },
  
  // ══════════════════════════════════════════════════════════════════════════════
  // AI NEWSLETTERS & CURATED CONTENT
  // Native RSS feeds only - Beehiiv feeds require special handling
  // For non-RSS newsletters: see lib/services/newsletter-to-rss.ts
  // ══════════════════════════════════════════════════════════════════════════════
  { name: 'Last Week in AI', url: 'https://lastweekin.ai/feed', category: 'newsletter', language: 'en' },
  { name: 'Import AI Newsletter', url: 'https://jack-clark.net/feed/', category: 'newsletter', language: 'en', notes: 'Jack Clark AI policy insights' },
  { name: 'The Algorithm (MIT)', url: 'https://www.technologyreview.com/topic/artificial-intelligence/the-algorithm/feed', category: 'newsletter', language: 'en' },
  { name: 'The Batch (DeepLearning.AI)', url: 'https://www.deeplearning.ai/the-batch/feed/', category: 'newsletter', language: 'en', notes: 'Andrew Ng weekly newsletter' },
  // AI Breakfast, The Neuron, Superhuman AI removed - Invalid XML (malformed feeds)
  { name: 'Ahead of AI', url: 'https://magazine.sebastianraschka.com/feed', category: 'newsletter', language: 'en', notes: 'Sebastian Raschka ML research' },
  // TLDR AI, Ben's Bites, The Rundown AI, AI Tool Report removed - 404 or not valid RSS
  { name: 'The Algorithmic Bridge', url: 'https://thealgorithmicbridge.substack.com/feed', category: 'newsletter', language: 'en', notes: 'AI analysis and commentary' },
  { name: 'Davis Summarizes Papers', url: 'https://dblalock.substack.com/feed', category: 'newsletter', language: 'en', notes: 'ML paper summaries' },
  { name: 'AI Snake Oil', url: 'https://www.aisnakeoil.com/feed', category: 'newsletter', language: 'en', notes: 'Critical AI analysis - Princeton' },
  { name: 'Interconnects', url: 'https://www.interconnects.ai/feed', category: 'newsletter', language: 'en', notes: 'Nathan Lambert RLHF/alignment' },
  { name: 'ML News (Grootendorst)', url: 'https://newsletter.maartengrootendorst.com/feed', category: 'newsletter', language: 'en', notes: 'ML tutorials newsletter' },

  // ══════════════════════════════════════════════════════════════════════════════
  // AI TUTORIALS & DATA SCIENCE LEARNING
  // ══════════════════════════════════════════════════════════════════════════════
  { name: 'Towards Data Science', url: 'https://towardsdatascience.com/feed', category: 'tutorials', language: 'en' },
  { name: 'Machine Learning Mastery', url: 'https://machinelearningmastery.com/feed/', category: 'tutorials', language: 'en' },
  { name: 'Analytics Vidhya', url: 'https://www.analyticsvidhya.com/feed/', category: 'tutorials', language: 'en', notes: 'ML tutorials and guides' },
  { name: 'KDnuggets', url: 'https://www.kdnuggets.com/feed', category: 'tutorials', language: 'en', notes: 'Classic data science resource' },
  // fast.ai Blog removed - 404 error
  { name: 'PyImageSearch', url: 'https://pyimagesearch.com/feed/', category: 'tutorials', language: 'en', notes: 'Computer vision tutorials' },
  { name: 'Sebastian Raschka', url: 'https://sebastianraschka.com/rss_feed.xml', category: 'tutorials', language: 'en', notes: 'ML fundamentals author' },
  { name: 'Lil\'Log (Lilian Weng)', url: 'https://lilianweng.github.io/index.xml', category: 'tutorials', language: 'en', notes: 'Deep technical ML posts' },
  { name: 'Jay Alammar', url: 'https://jalammar.github.io/feed.xml', category: 'tutorials', language: 'en', notes: 'Visual ML explanations' },
  { name: 'Weights & Biases Blog', url: 'https://wandb.ai/fully-connected/rss.xml', category: 'tutorials', language: 'en', notes: 'MLOps and experiments' },
  { name: 'Neptune.ai Blog', url: 'https://neptune.ai/blog/feed', category: 'tutorials', language: 'en', notes: 'ML experiment tracking' },

  // ══════════════════════════════════════════════════════════════════════════════
  // AI COMMUNITIES
  // ══════════════════════════════════════════════════════════════════════════════
  { name: 'Reddit r/Artificial', url: 'https://www.reddit.com/r/artificial/.rss', category: 'community', language: 'en' },
  { name: 'Reddit r/MachineLearning', url: 'https://www.reddit.com/r/MachineLearning/.rss', category: 'community', language: 'en', notes: 'Technical ML discussions' },
  { name: 'Reddit r/LocalLLaMA', url: 'https://www.reddit.com/r/LocalLLaMA/.rss', category: 'community', language: 'en', notes: 'Open source LLM community' },
  { name: 'Reddit r/StableDiffusion', url: 'https://www.reddit.com/r/StableDiffusion/.rss', category: 'community', language: 'en', notes: 'AI image generation' },
  { name: 'Hacker News – AI', url: 'https://hnrss.org/newest?q=AI+OR+LLM+OR+GPT+OR+machine+learning&points=50', category: 'community', language: 'en', notes: 'Top AI posts on HN' },

  // ══════════════════════════════════════════════════════════════════════════════
  // SPANISH AI NEWS
  // ══════════════════════════════════════════════════════════════════════════════
  // Xataka IA, Genbeta IA, Hipertextual IA removed - 404/410/parse errors
  { name: 'The AI Revolution News', url: 'https://theairevolution.news/feed/', category: 'news', language: 'es' },
  { name: 'SpacioIA', url: 'https://spacioia.com/feed/', category: 'news', language: 'es' },
  { name: 'RTVE – Tecnología', url: 'https://www.rtve.es/rss/temas_tecnologia.xml', category: 'news', language: 'es', notes: 'Includes IA coverage with multimedia' },
  { name: 'ABC Tecnología', url: 'https://www.abc.es/rss/feeds/abc_tecnologia.xml', category: 'news', language: 'es', notes: 'Spanish mainstream tech' },
  { name: 'El Mundo Tecnología', url: 'https://www.elmundo.es/rss/tecnologia.xml', category: 'news', language: 'es', notes: 'Spanish tech and science' },
  { name: 'Clarín Tecnología', url: 'https://www.clarin.com/rss/tecnologia/', category: 'news', language: 'es', notes: 'Argentine tech coverage' },
  // Infobae Tecno removed - 404 error
  { name: 'Muy Computer Pro', url: 'https://www.muycomputerpro.com/feed', category: 'news', language: 'es', notes: 'Enterprise tech Spain' },
  { name: 'Computing.es', url: 'https://www.computing.es/feed/', category: 'news', language: 'es', notes: 'Spanish IT news' },
  { name: 'WWWhats New', url: 'https://wwwhatsnew.com/feed/', category: 'news', language: 'es', notes: 'Apps and AI tools in Spanish' },
  // Emprendedores - Tech removed - 404 error

  // ══════════════════════════════════════════════════════════════════════════════
  // AGGREGATORS (Multi-source)
  // ══════════════════════════════════════════════════════════════════════════════
  { name: 'Google News ES – Inteligencia Artificial', url: 'https://news.google.com/rss/search?q=inteligencia+artificial&hl=es&gl=ES&ceid=ES:es', category: 'aggregator', language: 'es' },
  { name: 'Google News EN – AI', url: 'https://news.google.com/rss/search?q=artificial+intelligence+OR+machine+learning&hl=en-US&gl=US&ceid=US:en', category: 'aggregator', language: 'en' },
  { name: 'Google News – OpenAI', url: 'https://news.google.com/rss/search?q=OpenAI+OR+ChatGPT+OR+GPT-4&hl=en-US&gl=US&ceid=US:en', category: 'aggregator', language: 'en', notes: 'OpenAI specific news' },
  { name: 'Google News – LLM', url: 'https://news.google.com/rss/search?q=LLM+OR+large+language+model+OR+Claude+OR+Gemini&hl=en-US&gl=US&ceid=US:en', category: 'aggregator', language: 'en', notes: 'LLM specific news' },

  // ══════════════════════════════════════════════════════════════════════════════
  // AI ETHICS & POLICY
  // ══════════════════════════════════════════════════════════════════════════════
  { name: 'AI Ethics Brief', url: 'https://brief.montrealethics.ai/feed', category: 'newsletter', language: 'en', notes: 'Montreal AI Ethics Institute' },
  // Center for AI Safety removed - 404 error
  { name: 'Partnership on AI', url: 'https://partnershiponai.org/feed/', category: 'research', language: 'en', notes: 'AI best practices' },
  
  // ══════════════════════════════════════════════════════════════════════════════
  // SPECIALIZED AI TOPICS
  // ══════════════════════════════════════════════════════════════════════════════
  { name: 'Synced Review', url: 'https://syncedreview.com/feed/', category: 'news', language: 'en', notes: 'AI research news from Asia' },
  { name: 'The Gradient', url: 'https://thegradient.pub/rss/', category: 'research', language: 'en', notes: 'AI research perspectives' },
  { name: 'AI Alignment Forum', url: 'https://www.alignmentforum.org/feed.xml', category: 'research', language: 'en', notes: 'AI safety discussions' },
  { name: 'LessWrong – AI', url: 'https://www.lesswrong.com/feed.xml?view=ai', category: 'community', language: 'en', notes: 'AI rationality community' },
  { name: 'Two Minute Papers', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCbfYPyITQ-7l4upoX8nvctg', category: 'tutorials', language: 'en', notes: 'Research paper summaries' },
] as const;
