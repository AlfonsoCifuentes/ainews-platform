-- Seed data for development/testing
-- Run this after initial migration

-- Sample news articles (bilingual)
INSERT INTO news_articles (
  id,
  title_en,
  title_es,
  summary_en,
  summary_es,
  content_en,
  content_es,
  category,
  tags,
  source_url,
  image_url,
  published_at,
  ai_generated,
  quality_score,
  reading_time_minutes
) VALUES
(
  uuid_generate_v4(),
  'OpenAI Launches Autonomous Research Assistant',
  'OpenAI lanza asistente de investigación autónomo',
  'The new assistant can orchestrate end-to-end research workflows, from literature review to experiment planning.',
  'El nuevo asistente puede orquestar flujos de investigación de extremo a extremo, desde la revisión de literatura hasta la planificación de experimentos.',
  'OpenAI announced the release of a fully autonomous research assistant capable of coordinating data collection, experiment design, and documentation. The system integrates with leading scientific repositories and lab automation tools, promising to reduce manual effort by 60%.',
  'OpenAI anunció el lanzamiento de un asistente de investigación completamente autónomo capaz de coordinar la recopilación de datos, el diseño de experimentos y la documentación. El sistema se integra con los principales repositorios científicos y herramientas de automatización de laboratorio, prometiendo reducir el trabajo manual en un 60%.',
  'machinelearning',
  ARRAY['autonomous-agents', 'research', 'product-launch'],
  'https://openai.com/blog/autonomous-research-assistant',
  'https://images.unsplash.com/photo-1529101091764-c3526daf38fe?auto=format&fit=crop&w=1600&q=80',
  NOW() - INTERVAL '2 hours',
  false,
  0.92,
  4
),
(
  uuid_generate_v4(),
  'Groq Introduces Real-Time Multilingual LLM API',
  'Groq introduce API LLM multilingüe en tiempo real',
  'Groq now offers sub-200ms responses for multilingual generation, enabling live voice translation at scale.',
  'Groq ahora ofrece respuestas inferiores a 200 ms para generación multilingüe, habilitando traducción de voz en vivo a escala.',
  'Groq expanded its inference platform with a multilingual API capable of streaming near-instant translations. Enterprises can integrate the service into customer support, education, and media production workflows without additional optimization.',
  'Groq amplió su plataforma de inferencia con una API multilingüe capaz de transmitir traducciones casi instantáneas. Las empresas pueden integrar el servicio en atención al cliente, educación y producción de medios sin optimización adicional.',
  'nlp',
  ARRAY['groq', 'multilingual', 'latency'],
  'https://groq.com/blog/real-time-multilingual-llm',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80',
  NOW() - INTERVAL '5 hours',
  false,
  0.88,
  3
),
(
  uuid_generate_v4(),
  'EU Approves Comprehensive AI Ethics Framework',
  'La UE aprueba un marco integral de ética de IA',
  'The European Union ratified a multi-tiered AI governance model focused on transparency and auditability.',
  'La Unión Europea ratificó un modelo de gobernanza de IA multinivel centrado en la transparencia y la auditabilidad.',
  'European regulators approved the long-awaited AI ethics legislation, setting mandatory disclosure requirements for high-risk systems. Companies must provide detailed documentation of training data provenance, bias mitigation, and continuous monitoring practices.',
  'Los reguladores europeos aprobaron la tan esperada legislación de ética de IA, estableciendo requisitos obligatorios de divulgación para sistemas de alto riesgo. Las empresas deben proporcionar documentación detallada sobre el origen de los datos de entrenamiento, mitigación de sesgos y prácticas de monitoreo continuo.',
  'ethics',
  ARRAY['regulation', 'policy', 'compliance'],
  'https://europa.eu/newsroom/ai-ethics-framework',
  'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=1600&q=80',
  NOW() - INTERVAL '1 day',
  false,
  0.94,
  5
);

-- Log the seed operation
INSERT INTO ai_system_logs (
  action_type,
  model_used,
  input_tokens,
  output_tokens,
  success,
  execution_time,
  cost,
  metadata
) VALUES (
  'database_seed',
  'manual',
  0,
  0,
  true,
  0,
  0.0,
  '{"articles_created": 3}'::jsonb
);
