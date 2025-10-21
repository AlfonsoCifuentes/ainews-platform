import type { INewsArticle } from '@/lib/types/news';

export const sampleNewsArticles: INewsArticle[] = [
  {
    id: 'sample-1',
    title_en: 'OpenAI Launches Autonomous Research Assistant',
    title_es: 'OpenAI lanza asistente de investigación autónomo',
    summary_en:
      'The new assistant can orchestrate end-to-end research workflows, from literature review to experiment planning.',
    summary_es:
      'El nuevo asistente puede orquestar flujos de investigación de extremo a extremo, desde la revisión de literatura hasta la planificación de experimentos.',
    content_en:
      'OpenAI announced the release of a fully autonomous research assistant capable of coordinating data collection, experiment design, and documentation. The system integrates with leading scientific repositories and lab automation tools, promising to reduce manual effort by 60%.',
    content_es:
      'OpenAI anunció el lanzamiento de un asistente de investigación completamente autónomo capaz de coordinar la recopilación de datos, el diseño de experimentos y la documentación. El sistema se integra con los principales repositorios científicos y herramientas de automatización de laboratorio, prometiendo reducir el trabajo manual en un 60%.',
    category: 'machinelearning',
    tags: ['autonomous-agents', 'research', 'product-launch'],
    source_url: 'https://openai.com/blog/autonomous-research-assistant',
    image_url: 'https://images.unsplash.com/photo-1529101091764-c3526daf38fe?auto=format&fit=crop&w=1600&q=80',
    published_at: new Date().toISOString(),
    ai_generated: false,
    quality_score: 0.92,
    reading_time_minutes: 4,
  },
  {
    id: 'sample-2',
    title_en: 'Groq Introduces Real-Time Multilingual LLM API',
    title_es: 'Groq introduce API LLM multilingüe en tiempo real',
    summary_en:
      'Groq now offers sub-200ms responses for multilingual generation, enabling live voice translation at scale.',
    summary_es:
      'Groq ahora ofrece respuestas inferiores a 200 ms para generación multilingüe, habilitando traducción de voz en vivo a escala.',
    content_en:
      'Groq expanded its inference platform with a multilingual API capable of streaming near-instant translations. Enterprises can integrate the service into customer support, education, and media production workflows without additional optimization.',
    content_es:
      'Groq amplió su plataforma de inferencia con una API multilingüe capaz de transmitir traducciones casi instantáneas. Las empresas pueden integrar el servicio en atención al cliente, educación y producción de medios sin optimización adicional.',
    category: 'nlp',
    tags: ['groq', 'multilingual', 'latency'],
    source_url: 'https://groq.com/blog/real-time-multilingual-llm',
    image_url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80',
    published_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    ai_generated: false,
    quality_score: 0.88,
    reading_time_minutes: 3,
  },
  {
    id: 'sample-3',
    title_en: 'EU Approves Comprehensive AI Ethics Framework',
    title_es: 'La UE aprueba un marco integral de ética de IA',
    summary_en:
      'The European Union ratified a multi-tiered AI governance model focused on transparency and auditability.',
    summary_es:
      'La Unión Europea ratificó un modelo de gobernanza de IA multinivel centrado en la transparencia y la auditabilidad.',
    content_en:
      'European regulators approved the long-awaited AI ethics legislation, setting mandatory disclosure requirements for high-risk systems. Companies must provide detailed documentation of training data provenance, bias mitigation, and continuous monitoring practices.',
    content_es:
      'Los reguladores europeos aprobaron la tan esperada legislación de ética de IA, estableciendo requisitos obligatorios de divulgación para sistemas de alto riesgo. Las empresas deben proporcionar documentación detallada sobre el origen de los datos de entrenamiento, mitigación de sesgos y prácticas de monitoreo continuo.',
    category: 'ethics',
    tags: ['regulation', 'policy', 'compliance'],
    source_url: 'https://europa.eu/newsroom/ai-ethics-framework',
    image_url: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=1600&q=80',
    published_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    ai_generated: false,
    quality_score: 0.94,
    reading_time_minutes: 5,
  },
  {
    id: 'sample-4',
    title_en: 'Robotics Lab Demonstrates Self-Healing Manipulators',
    title_es: 'Laboratorio de robótica demuestra manipuladores auto-reparables',
    summary_en:
      'A new class of soft robotics can self-repair minor tears within minutes, extending industrial uptime.',
    summary_es:
      'Una nueva clase de robótica blanda puede auto-reparar desgarros menores en minutos, extendiendo la disponibilidad industrial.',
    content_en:
      'Researchers at MIT unveiled manipulators built with self-healing polymers that restore structural integrity after sustaining cuts. The breakthrough paves the way for resilient warehouse automation systems.',
    content_es:
      'Investigadores del MIT presentaron manipuladores construidos con polímeros auto-reparables que restauran la integridad estructural tras sufrir cortes. El avance abre la puerta a sistemas de automatización de almacenes más resistentes.',
    category: 'robotics',
    tags: ['robotics', 'materials', 'automation'],
    source_url: 'https://news.mit.edu/robotics-self-healing-manipulators',
    image_url: 'https://images.unsplash.com/photo-1581092800573-6c94798a3d92?auto=format&fit=crop&w=1600&q=80',
    published_at: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    ai_generated: false,
    quality_score: 0.9,
    reading_time_minutes: 6,
  },
  {
    id: 'sample-5',
    title_en: 'LatAm Startups Adopt AI Tutors for Vocational Training',
    title_es: 'Startups latinoamericanas adoptan tutores de IA para formación profesional',
    summary_en:
      'Vocational bootcamps across Latin America now deploy AI tutors that personalize job-ready learning paths.',
    summary_es:
      'Bootcamps vocacionales en toda Latinoamérica implementan tutores de IA que personalizan rutas de aprendizaje orientadas al empleo.',
    content_en:
      'A wave of edtech startups in Latin America announced the integration of AI tutors to adapt content to each learner. The systems leverage multilingual models optimized for low-bandwidth scenarios.',
    content_es:
      'Una ola de startups edtech en Latinoamérica anunció la integración de tutores de IA para adaptar contenidos a cada estudiante. Los sistemas aprovechan modelos multilingües optimizados para escenarios de bajo ancho de banda.',
    category: 'machinelearning',
    tags: ['education', 'latam', 'tutors'],
    source_url: 'https://ainews.lat/startups-ai-tutors',
    image_url: 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1600&q=80',
    published_at: new Date(Date.now() - 1000 * 60 * 60 * 42).toISOString(),
    ai_generated: false,
    quality_score: 0.86,
    reading_time_minutes: 4,
  },
  {
    id: 'sample-6',
    title_en: 'AI Systems Achieve Breakthrough in Materials Discovery',
    title_es: 'Sistemas de IA logran avance en descubrimiento de materiales',
    summary_en:
      'Autonomous labs discovered two alloys with 40% higher heat resistance using reinforcement learning loops.',
    summary_es:
      'Laboratorios autónomos descubrieron dos aleaciones con 40% más resistencia al calor utilizando ciclos de aprendizaje por refuerzo.',
    content_en:
      'A collaboration between DeepMind and national labs delivered a materials discovery pipeline powered by reinforcement learning, accelerating hypothesis testing by 10x compared to traditional methods.',
    content_es:
      'Una colaboración entre DeepMind y laboratorios nacionales desarrolló una cadena de descubrimiento de materiales impulsada por aprendizaje por refuerzo, acelerando las pruebas de hipótesis 10 veces frente a métodos tradicionales.',
    category: 'computervision',
    tags: ['research', 'materials', 'deepmind'],
    source_url: 'https://deepmind.google/discoveries/materials-ai',
    image_url: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92eee?auto=format&fit=crop&w=1600&q=80',
    published_at: new Date(Date.now() - 1000 * 60 * 60 * 54).toISOString(),
    ai_generated: false,
    quality_score: 0.91,
    reading_time_minutes: 7,
  },
];
