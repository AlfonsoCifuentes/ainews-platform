/**
 * Auto-categorize courses based on topic keywords
 */

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'machine-learning': [
    'machine learning', 'ml', 'neural network', 'deep learning', 'tensorflow', 
    'pytorch', 'scikit-learn', 'supervised', 'unsupervised', 'reinforcement',
    'regression', 'classification', 'clustering', 'model training'
  ],
  'natural-language-processing': [
    'nlp', 'natural language', 'text processing', 'sentiment analysis',
    'language model', 'llm', 'gpt', 'bert', 'transformers', 'tokenization',
    'embeddings', 'chatbot', 'translation'
  ],
  'computer-vision': [
    'computer vision', 'image processing', 'object detection', 'image recognition',
    'convolutional', 'cnn', 'opencv', 'segmentation', 'facial recognition',
    'yolo', 'image classification'
  ],
  'ai-fundamentals': [
    'artificial intelligence', 'ai basics', 'introduction to ai', 'ai concepts',
    'intelligent systems', 'ai history', 'ai ethics', 'ai applications'
  ],
  'data-science': [
    'data science', 'data analysis', 'statistics', 'pandas', 'numpy',
    'data visualization', 'exploratory data', 'feature engineering',
    'data cleaning', 'data preprocessing'
  ],
  'neural-networks': [
    'neural network', 'perceptron', 'backpropagation', 'activation function',
    'gradient descent', 'optimizer', 'loss function', 'architecture'
  ],
  'generative-ai': [
    'generative ai', 'gan', 'diffusion', 'stable diffusion', 'dall-e',
    'midjourney', 'text-to-image', 'image generation', 'creative ai',
    'generative model', 'vae', 'autoencoder'
  ],
  'ai-agents': [
    'ai agent', 'autonomous agent', 'multi-agent', 'agent architecture',
    'reasoning', 'planning', 'langchain', 'autogpt', 'agent framework'
  ],
  'prompt-engineering': [
    'prompt engineering', 'prompt design', 'few-shot', 'chain of thought',
    'prompting', 'prompt optimization', 'instruction tuning'
  ],
  'ai-tools': [
    'ai tools', 'no-code ai', 'ai platforms', 'ai api', 'openai api',
    'hugging face', 'replicate', 'cohere', 'anthropic'
  ],
  'ethics-safety': [
    'ai ethics', 'ai safety', 'bias', 'fairness', 'responsible ai',
    'ai governance', 'explainability', 'transparency', 'alignment'
  ],
  'research': [
    'ai research', 'paper', 'sota', 'state of the art', 'benchmark',
    'arxiv', 'research methodology', 'experimental'
  ]
};

export function categorizeCourse(topic: string, description?: string): string {
  const text = `${topic} ${description || ''}`.toLowerCase();
  
  // Count matches for each category
  const categoryScores: Record<string, number> = {};
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }
    if (score > 0) {
      categoryScores[category] = score;
    }
  }
  
  // Return category with highest score
  if (Object.keys(categoryScores).length === 0) {
    return 'general';
  }
  
  const sortedCategories = Object.entries(categoryScores)
    .sort(([, a], [, b]) => b - a);
  
  return sortedCategories[0][0];
}

export const COURSE_CATEGORIES = [
  { id: 'all', label_en: 'All Courses', label_es: 'Todos los Cursos' },
  { id: 'machine-learning', label_en: 'Machine Learning', label_es: 'Aprendizaje Automático' },
  { id: 'natural-language-processing', label_en: 'Natural Language Processing', label_es: 'Procesamiento de Lenguaje Natural' },
  { id: 'computer-vision', label_en: 'Computer Vision', label_es: 'Visión por Computadora' },
  { id: 'ai-fundamentals', label_en: 'AI Fundamentals', label_es: 'Fundamentos de IA' },
  { id: 'data-science', label_en: 'Data Science', label_es: 'Ciencia de Datos' },
  { id: 'neural-networks', label_en: 'Neural Networks', label_es: 'Redes Neuronales' },
  { id: 'generative-ai', label_en: 'Generative AI', label_es: 'IA Generativa' },
  { id: 'ai-agents', label_en: 'AI Agents', label_es: 'Agentes de IA' },
  { id: 'prompt-engineering', label_en: 'Prompt Engineering', label_es: 'Ingeniería de Prompts' },
  { id: 'ai-tools', label_en: 'AI Tools & Platforms', label_es: 'Herramientas y Plataformas de IA' },
  { id: 'ethics-safety', label_en: 'Ethics & Safety', label_es: 'Ética y Seguridad' },
  { id: 'research', label_en: 'Research & Papers', label_es: 'Investigación y Artículos' },
  { id: 'general', label_en: 'General', label_es: 'General' }
];
