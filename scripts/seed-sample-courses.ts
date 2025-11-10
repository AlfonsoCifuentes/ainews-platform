/**
 * Seed curated bilingual sample courses for the AI News learning platform.
 * Run with: npx tsx scripts/seed-sample-courses.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

type ResourceType = 'article' | 'video' | 'paper' | 'documentation';

interface SeedModule {
  title_en: string;
  title_es: string;
  content_en: string;
  content_es: string;
  estimated_minutes: number;
  resources: Array<{
    title: string;
    url: string;
    type: ResourceType;
  }>;
}

interface SeedCourse {
  slug: string;
  title_en: string;
  title_es: string;
  description_en: string;
  description_es: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  topics: string[];
  modules: SeedModule[];
}

const sampleCourses: SeedCourse[] = [
  {
    slug: 'ml-foundations',
    title_en: 'Machine Learning Foundations',
    title_es: 'Fundamentos de Machine Learning',
    description_en:
      'Learn the practical foundations of machine learning, from framing problems to shipping your first baseline models with confidence.',
    description_es:
      'Aprende los fundamentos prácticos del machine learning: desde formular problemas hasta entregar tus primeros modelos base con confianza.',
    difficulty: 'beginner',
    category: 'machine-learning',
    topics: ['supervised-learning', 'model-evaluation', 'feature-engineering', 'mlops-basics'],
    modules: [
      {
        title_en: 'From Data to Baselines',
        title_es: 'De los datos a los modelos base',
        content_en: `## Key Concepts
- Frame supervised learning problems with measurable outcomes.
- Create resilient baselines using linear and logistic regression.
- Maintain reproducible data splits and experiment tracking.

## Deep Dive
A strong ML workflow begins with translating business objectives into prediction targets. You will examine different table schemas, identify label leakage, and define metrics that reflect the intent of the project. We revisit linear regression and logistic regression not as academic exercises but as robust baselines that establish a bar for every future model. The lesson introduces data versioning, seed management, and how to keep notebooks and scripts deterministic.

## Practice Sprint
Using an open dataset from the energy sector, you will create a baseline notebook that loads data, performs exploratory analysis, encodes features, and trains a logistic regression classifier. The sprint emphasizes documenting assumptions and capturing the first validation results for later comparisons.

## Reflection Checklist
- Does the problem statement map directly to the metric you selected?
- Can another teammate rerun your notebook and reproduce the same numbers?
- Which data quality risks remain unresolved before the next experiment?
`,
        content_es: `## Conceptos clave
- Formular problemas de aprendizaje supervisado con resultados medibles.
- Crear modelos base resilientes con regresión lineal y logística.
- Mantener divisiones de datos reproducibles y un seguimiento claro de experimentos.

## Profundización
Un flujo de trabajo sólido de ML comienza al traducir los objetivos de negocio en objetivos de predicción. Revisarás distintos esquemas de tablas, identificarás fugas de etiqueta y definirás métricas que reflejen la intención del proyecto. Retomamos la regresión lineal y logística no como ejercicios académicos sino como modelos base robustos que establecen el nivel para todos los experimentos futuros. La lección introduce versionado de datos, gestión de semillas y cómo mantener cuadernos y scripts deterministas.

## Sprint práctico
Con un conjunto de datos abierto del sector energético crearás un cuaderno base que carga datos, realiza análisis exploratorio, codifica variables y entrena un clasificador de regresión logística. El sprint enfatiza documentar supuestos y capturar los primeros resultados de validación para comparaciones posteriores.

## Lista de verificación
- ¿La declaración del problema se alinea con la métrica que seleccionaste?
- ¿Otro miembro del equipo puede ejecutar tu cuaderno y reproducir los mismos números?
- ¿Qué riesgos de calidad de datos permanecen sin resolver antes del siguiente experimento?
`,
        estimated_minutes: 45,
        resources: [
          {
            title: 'Google ML Crash Course – Framing',
            url: 'https://developers.google.com/machine-learning/crash-course/framing',
            type: 'documentation'
          },
          {
            title: 'Kaggle Energy Efficiency Dataset',
            url: 'https://www.kaggle.com/datasets/elikplim/energy-efficiency-dataset',
            type: 'article'
          }
        ]
      },
      {
        title_en: 'Evaluating Model Behavior',
        title_es: 'Evaluar el comportamiento del modelo',
        content_en: `## Key Concepts
- Interpret confusion matrices, ROC curves, and calibration plots.
- Compare precision/recall trade-offs against business constraints.
- Apply cross-validation and stratified sampling for small datasets.

## Deep Dive
Evaluation is more than a single accuracy number. We deconstruct confusion matrices, ROC curves, and calibration charts to understand how models behave across different segments. The lesson introduces cost-sensitive analysis so you can explain trade-offs to product partners. You will also learn when to use cross-validation, stratified sampling, and bootstrapping to keep estimates reliable even with limited data.

## Practice Sprint
You will instrument a validation report that aggregates metrics by cohort, surfaces outliers, and stores artefacts automatically. The sprint includes a lightweight fairness check that flags demographic parity gaps greater than a configurable threshold.

## Reflection Checklist
- Which metric best communicates success to stakeholders?
- What instrumentation do you need in production to monitor for drift?
- How will you react if the champion model underperforms in a critical segment?
`,
        content_es: `## Conceptos clave
- Interpretar matrices de confusión, curvas ROC y gráficos de calibración.
- Comparar la relación precisión/recobrado frente a las restricciones del negocio.
- Aplicar validación cruzada y muestreo estratificado cuando hay pocos datos.

## Profundización
Evaluar significa entender cómo se comporta el modelo en distintos segmentos, no solo reportar una cifra de exactitud. Desglosamos matrices de confusión, curvas ROC y gráficos de calibración para detectar patrones y fallos. La lección introduce análisis sensible al costo para que puedas explicar los compromisos a los socios de producto. También aprenderás cuándo usar validación cruzada, muestreo estratificado y remuestreo bootstrap para conservar estimaciones confiables incluso con pocos registros.

## Sprint práctico
Instrumentarás un informe de validación que agrega métricas por cohorte, resalta valores atípicos y guarda artefactos automáticamente. El sprint incluye una verificación ligera de equidad que señala brechas de paridad demográfica superiores a un umbral configurable.

## Lista de verificación
- ¿Qué métrica comunica mejor el éxito a los stakeholders?
- ¿Qué instrumentación necesitas en producción para vigilar el drift?
- ¿Cómo reaccionarás si el modelo campeón falla en un segmento crítico?
`,
        estimated_minutes: 45,
        resources: [
          {
            title: 'Scikit-learn Model Evaluation Guide',
            url: 'https://scikit-learn.org/stable/modules/model_evaluation.html',
            type: 'documentation'
          },
          {
            title: 'Precision vs Recall Explained',
            url: 'https://developers.google.com/machine-learning/crash-course/classification/precision-and-recall',
            type: 'article'
          }
        ]
      },
      {
        title_en: 'Feature Engineering and Delivery',
        title_es: 'Ingeniería de atributos y entrega',
        content_en: `## Key Concepts
- Design feature pipelines that survive schema changes.
- Package preprocessing with model artefacts for deployment.
- Plan handoff between notebook prototypes and production services.

## Deep Dive
Feature engineering bridges raw data and predictive power. We cover normalization, target encoding, and interaction features with a focus on leakage avoidance. The lesson explains how to move from notebook code to reusable functions, bundle preprocessing with models, and prepare for deployment on serverless or batch infrastructure. You will learn how to structure model cards and decision logs that make future iterations faster.

## Practice Sprint
You will refactor the baseline notebook into a modular project with a pipeline definition, automated tests for feature transformations, and a deployment checklist that enumerates dependencies, environment variables, and monitoring hooks.

## Reflection Checklist
- Which features deliver the largest uplift and why?
- How will you monitor feature drift after deployment?
- What documentation will help a new teammate extend this model?
`,
        content_es: `## Conceptos clave
- Diseñar canalizaciones de atributos que resistan cambios de esquema.
- Empaquetar el preprocesamiento junto con los artefactos del modelo para el despliegue.
- Planear la transición de un notebook a servicios de producción.

## Profundización
La ingeniería de atributos conecta los datos en bruto con el poder predictivo. Revisamos normalización, codificación por objetivo e interacciones cuidando las fugas de información. La lección muestra cómo pasar de código exploratorio a funciones reutilizables, cómo empaquetar el preprocesamiento con el modelo y cómo prepararse para desplegar en infraestructura por lotes o sin servidor. También aprenderás a estructurar tarjetas de modelo y registros de decisiones que aceleran iteraciones futuras.

## Sprint práctico
Refactorizarás el notebook base en un proyecto modular con una definición de pipeline, pruebas automatizadas para las transformaciones y una lista de verificación de despliegue que enumera dependencias, variables de entorno y ganchos de monitoreo.

## Lista de verificación
- ¿Qué atributos aportan mayor mejora y por qué?
- ¿Cómo vigilarás el drift de atributos después del despliegue?
- ¿Qué documentación ayudará a que un nuevo compañero evolucione este modelo?
`,
        estimated_minutes: 45,
        resources: [
          {
            title: 'Feature Engineering and Selection Handbook',
            url: 'https://feature-engineering-and-selection.github.io/',
            type: 'documentation'
          },
          {
            title: 'Model Cards for Model Reporting',
            url: 'https://modelcards.withgoogle.com/about',
            type: 'article'
          }
        ]
      }
    ]
  },
  {
    slug: 'vision-transformers',
    title_en: 'Modern Computer Vision with Transformers',
    title_es: 'Visión por Computador Moderna con Transformers',
    description_en:
      'Build production-ready vision systems by mastering transformer backbones, data strategy, and responsible deployment practices.',
    description_es:
      'Construye sistemas de visión listos para producción dominando los backbones transformer, la estrategia de datos y el despliegue responsable.',
    difficulty: 'intermediate',
    category: 'computer-vision',
    topics: ['vision-transformers', 'self-supervised-learning', 'fine-tuning', 'model-ops'],
    modules: [
      {
        title_en: 'Vision Transformers Primer',
        title_es: 'Introducción a los Vision Transformers',
        content_en: `## Key Concepts
- Compare convolutional backbones with transformer architectures.
- Understand patch embeddings, positional encodings, and multi-head self-attention.
- Analyze compute and memory trade-offs across ViT variants.

## Deep Dive
Vision transformers reframe images as sequences of tokens, enabling the same attention mechanisms that power large language models. We unpack how patch extraction works, why positional encodings matter, and how attention layers capture long-range dependencies. The lesson also highlights hybrid CNN/ViT approaches, initialization strategies, and the scaling laws that dictate accuracy versus latency.

## Practice Sprint
You will train a DeiT-small model on a subset of the EuroSAT dataset using timm and PyTorch Lightning. The sprint covers data augmentation, mixed precision, and profiling tools that reveal where memory hotspots appear.

## Reflection Checklist
- Which architectural choices influence latency on your target hardware?
- How would you communicate the advantages of ViTs to a product stakeholder?
- What telemetry do you need to collect during experiments to avoid silent failures?
`,
        content_es: `## Conceptos clave
- Comparar backbones convolucionales con arquitecturas transformer.
- Comprender los embeddings de parches, las codificaciones posicionales y la autoatención multi-cabeza.
- Analizar los compromisos de cómputo y memoria entre las variantes de ViT.

## Profundización
Los vision transformers reformulan las imágenes como secuencias de tokens, permitiendo reutilizar los mismos mecanismos de atención que impulsan los grandes modelos de lenguaje. Desempaquetamos cómo se extraen los parches, por qué importan las codificaciones posicionales y cómo las capas de atención capturan dependencias de largo alcance. La lección resalta enfoques híbridos CNN/ViT, estrategias de inicialización y las leyes de escala que dictan la relación entre precisión y latencia.

## Sprint práctico
Entrenarás un modelo DeiT-small en un subconjunto de EuroSAT usando timm y PyTorch Lightning. El sprint cubre aumentos de datos, precisión mixta y herramientas de perfilado que revelan dónde aparecen los cuellos de botella de memoria.

## Lista de verificación
- ¿Qué elecciones arquitectónicas influyen en la latencia del hardware objetivo?
- ¿Cómo explicarías las ventajas de los ViT a un stakeholder de producto?
- ¿Qué telemetría debes recopilar durante los experimentos para evitar fallos silenciosos?
`,
        estimated_minutes: 50,
        resources: [
          {
            title: 'An Image is Worth 16x16 Words',
            url: 'https://arxiv.org/abs/2010.11929',
            type: 'paper'
          },
          {
            title: 'timm Vision Transformer Notes',
            url: 'https://rwightman.github.io/pytorch-image-models/vision_transformers/',
            type: 'documentation'
          }
        ]
      },
      {
        title_en: 'Fine-Tuning and Dataset Strategy',
        title_es: 'Ajuste fino y estrategia de datos',
        content_en: `## Key Concepts
- Design data-centric fine-tuning pipelines for ViT and CLIP models.
- Apply self-supervised pretraining checkpoints and domain adaptation tactics.
- Manage augmentation, sampling, and label quality at scale.

## Deep Dive
Fine-tuning determines how well transformers adapt to your domain. We compare full fine-tuning, linear probing, and parameter-efficient adapters such as LoRA. The module walks through building balanced datasets, filtering noisy labels, and mixing synthetic images generated with diffusion models. You will learn how to schedule learning rates, freeze layers strategically, and monitor gradient norms to prevent catastrophic forgetting.

## Practice Sprint
You will adapt a CLIP backbone for product-search imagery. The sprint includes building an evaluation set with prompt templates, experimenting with LoRA adapters, and shipping the best checkpoint to a model registry with rich metadata.

## Reflection Checklist
- Which layers should remain frozen to keep training stable?
- How do you know when additional data collection matters more than architecture tweaks?
- What governance do you need around synthetic data usage?
`,
        content_es: `## Conceptos clave
- Diseñar canalizaciones de ajuste fino para modelos ViT y CLIP.
- Aplicar checkpoints auto-supervisados y tácticas de adaptación de dominio.
- Gestionar aumentos, muestreo y calidad de etiquetas a escala.

## Profundización
El ajuste fino determina cómo se trasladan los transformers a tu dominio. Comparamos ajuste completo, linear probing y adaptadores eficientes como LoRA. El módulo recorre la construcción de conjuntos balanceados, el filtrado de etiquetas ruidosas y la mezcla con imágenes sintéticas generadas mediante difusión. Aprenderás a programar tasas de aprendizaje, congelar capas de forma estratégica y vigilar normas de gradiente para evitar el olvido catastrófico.

## Sprint práctico
Adaptarás un backbone CLIP para imágenes de búsqueda de productos. El sprint incluye construir un conjunto de evaluación con plantillas de prompt, experimentar con adaptadores LoRA y publicar el mejor checkpoint en un registro de modelos con metadatos detallados.

## Lista de verificación
- ¿Qué capas deben permanecer congeladas para mantener estable el entrenamiento?
- ¿Cómo sabrás cuándo importa más recolectar datos adicionales que modificar la arquitectura?
- ¿Qué gobernanza necesitas alrededor del uso de datos sintéticos?
`,
        estimated_minutes: 55,
        resources: [
          {
            title: 'Fine-Tuning CLIP with Hugging Face',
            url: 'https://huggingface.co/blog/fine-tune-clip',
            type: 'article'
          },
          {
            title: 'LoRA: Low-Rank Adaptation of Large Language Models',
            url: 'https://arxiv.org/abs/2106.09685',
            type: 'paper'
          }
        ]
      },
      {
        title_en: 'Responsible Deployment and Monitoring',
        title_es: 'Despliegue responsable y monitoreo',
        content_en: `## Key Concepts
- Evaluate vision systems for robustness, bias, and privacy exposure.
- Build explainability dashboards with saliency maps and counterfactuals.
- Prepare scalable inference pipelines with continuous monitoring.

## Deep Dive
Deploying transformer-based vision systems requires discipline beyond leaderboard accuracy. We cover benchmark selection, stress testing with corruptions, and privacy-preserving techniques such as on-device inference and federated retraining. The lesson walks through building interpretability reports with Grad-CAM and attention rollout so stakeholders trust the system. We also outline monitoring strategies for data drift and automated rollback.

## Practice Sprint
You will containerize the fine-tuned model with ONNX Runtime, add saliency visualizations to an internal dashboard, and configure alerts that trigger when embedding distributions shift beyond predefined thresholds.

## Reflection Checklist
- Which failure modes pose the highest risk to users?
- How can you deliver explanations that satisfy legal and ethical requirements?
- What roll-forward and rollback plans are defined for this model?
`,
        content_es: `## Conceptos clave
- Evaluar sistemas de visión en robustez, sesgos y exposición de privacidad.
- Construir paneles de explicabilidad con mapas de saliencia y contrafactuales.
- Preparar canalizaciones de inferencia escalables con monitoreo continuo.

## Profundización
Desplegar sistemas de visión basados en transformers requiere disciplina más allá de la exactitud en un benchmark. Cubrimos la selección de benchmarks, pruebas de estrés con corrupciones y técnicas de privacidad como inferencia en el dispositivo y reentrenamiento federado. La lección detalla cómo construir reportes interpretables con Grad-CAM y attention rollout para que los stakeholders confíen en el sistema. También delineamos estrategias de monitoreo para drift de datos y revertidos automáticos.

## Sprint práctico
Contenerizarás el modelo ajustado con ONNX Runtime, añadirás visualizaciones de saliencia a un tablero interno y configurarás alertas que se disparan cuando las distribuciones de embeddings se desvían más allá de umbrales definidos.

## Lista de verificación
- ¿Qué modos de fallo representan el mayor riesgo para las personas usuarias?
- ¿Cómo entregarás explicaciones que satisfagan requisitos legales y éticos?
- ¿Qué planes de avance y retroceso existen para este modelo?
`,
        estimated_minutes: 45,
        resources: [
          {
            title: 'Robustness Gym',
            url: 'https://robustnessgym.github.io/',
            type: 'documentation'
          },
          {
            title: 'Grad-CAM: Visual Explanations from Deep Networks',
            url: 'https://arxiv.org/abs/1610.02391',
            type: 'paper'
          }
        ]
      }
    ]
  },
  {
    slug: 'prompt-engineering-product-teams',
    title_en: 'Prompt Engineering for Product Teams',
    title_es: 'Ingeniería de prompts para equipos de producto',
    description_en:
      'Design reliable prompts, evaluation harnesses, and collaboration rituals so product teams can ship LLM-powered features responsibly.',
    description_es:
      'Diseña prompts confiables, arneses de evaluación y rituales de colaboración para que los equipos de producto lancen funciones con LLM de forma responsable.',
    difficulty: 'beginner',
    category: 'prompt-engineering',
    topics: ['prompt-design', 'evaluation', 'guardrails', 'collaboration'],
    modules: [
      {
        title_en: 'Prompt Patterns That Ship',
        title_es: 'Patrones de prompt que funcionan',
        content_en: `## Key Concepts
- Identify reusable prompt patterns such as personas, COT scaffolds, and style transfer.
- Use structured prompting with delimiters, instructions, and exemplars.
- Document prompt assumptions so cross-functional partners can review them.

## Deep Dive
Product teams need prompts that behave consistently across edge cases. We catalogue recurring prompt patterns, explain when to use few-shot versus instruction style, and show how to embed business rules without overloading the model. The lesson includes red teaming techniques that expose brittle language and guidelines for writing bilingual prompts that respect regional tone.

## Practice Sprint
You will refactor an ad-hoc prompt used for customer support into a modular template with sections for context, rules, and fallbacks. The sprint ends with an internal review checklist that legal, trust & safety, and localization teams can sign off.

## Reflection Checklist
- Are you explicit about the allowed and disallowed actions the model may take?
- Does the prompt degrade gracefully when critical context is missing?
- Have you established a naming convention that keeps prompt variants discoverable?
`,
        content_es: `## Conceptos clave
- Identificar patrones de prompt reutilizables como personas, andamios de razonamiento y transferencia de estilo.
- Utilizar prompts estructurados con delimitadores, instrucciones y ejemplos.
- Documentar los supuestos del prompt para que socios multifuncionales puedan revisarlos.

## Profundización
Los equipos de producto necesitan prompts que se comporten de forma consistente ante casos extremos. Catalogamos patrones recurrentes, explicamos cuándo usar estilo few-shot frente a instrucciones y mostramos cómo incorporar reglas de negocio sin sobrecargar al modelo. La lección incluye técnicas de red teaming que exponen lenguaje frágil y pautas para escribir prompts bilingües que respeten el tono regional.

## Sprint práctico
Refactorizarás un prompt improvisado usado en soporte al cliente en una plantilla modular con secciones para contexto, reglas y contingencias. El sprint termina con una lista de revisión interna que legal, confianza y seguridad y localización pueden aprobar.

## Lista de verificación
- ¿Eres explícito sobre las acciones permitidas y prohibidas para el modelo?
- ¿El prompt se degrada con elegancia cuando falta contexto crítico?
- ¿Tienes una convención de nombres que mantenga las variantes del prompt localizables?
`,
        estimated_minutes: 35,
        resources: [
          {
            title: 'Prompt Engineering Guide',
            url: 'https://www.promptingguide.ai/',
            type: 'documentation'
          },
          {
            title: 'Anthropic Prompt Engineering Patterns',
            url: 'https://docs.anthropic.com/claude/docs/prompt-engineering',
            type: 'documentation'
          }
        ]
      },
      {
        title_en: 'Evaluating Prompts and Guardrails',
        title_es: 'Evaluar prompts y guardias',
        content_en: `## Key Concepts
- Build automated evaluation harnesses that benchmark prompts over curated test sets.
- Combine heuristic checks with LLM-as-a-judge scoring for faster iteration.
- Layer guardrails such as JSON schemas, safety classifiers, and content filters.

## Deep Dive
Evaluation keeps prompts trustworthy after launch. We explore techniques for constructing golden datasets, using pairwise comparisons, and integrating human review when needed. The lesson demonstrates open-source guardrail tools and explains how to track prompt regressions in analytics dashboards shared with stakeholders.

## Practice Sprint
You will create a regression suite for a content summarization prompt, implement schema validation, and wire the suite to continuous integration so every change to the prompt triggers automated checks.

## Reflection Checklist
- Which metrics matter most to the product goals (coherence, tone, safety)?
- How will you triage false positives or negatives produced by guardrails?
- Who is on call when automated evaluation surfaces a broken experience?
`,
        content_es: `## Conceptos clave
- Construir arneses de evaluación automatizados que comparen prompts sobre conjuntos de prueba curados.
- Combinar verificaciones heurísticas con LLM-as-a-judge para iterar más rápido.
- Superponer guardias como esquemas JSON, clasificadores de seguridad y filtros de contenido.

## Profundización
La evaluación mantiene la confianza en los prompts después del lanzamiento. Exploramos técnicas para crear conjuntos dorados, usar comparaciones por pares e integrar revisión humana cuando sea necesario. La lección muestra herramientas open source de guardrails y explica cómo rastrear regresiones de prompts en paneles analíticos compartidos con stakeholders.

## Sprint práctico
Crearás una suite de regresión para un prompt de resumen de contenido, implementarás validación de esquema y conectarás la suite a integración continua para que cada cambio dispare comprobaciones automáticas.

## Lista de verificación
- ¿Qué métricas importan más para los objetivos del producto (coherencia, tono, seguridad)?
- ¿Cómo gestionarás falsos positivos o negativos producidos por los guardias?
- ¿Quién está de guardia cuando la evaluación automatizada detecta una experiencia rota?
`,
        estimated_minutes: 35,
        resources: [
          {
            title: 'Comprehensive Guide to LLM Evaluation',
            url: 'https://helicone.ai/blog/llm-evaluation-guide',
            type: 'article'
          },
          {
            title: 'Guardrails AI Documentation',
            url: 'https://guardrailsai.com/docs/',
            type: 'documentation'
          }
        ]
      },
      {
        title_en: 'Operationalizing LLM Workflows',
        title_es: 'Operacionalizar flujos LLM',
        content_en: `## Key Concepts
- Manage prompt versioning, experimentation, and approvals in shared repositories.
- Integrate prompts with retrieval, tools, and analytics pipelines.
- Align product rituals around prompt telemetry and continuous improvement.

## Deep Dive
Prompt work intersects every function in a product team. We organize a collaboration model that keeps research, design, and engineering aligned. The lesson demonstrates how to store prompts alongside code, set up feature flags, and communicate changes to stakeholders. We also review experiment design for A/B tests that compare prompt variants without disrupting users.

## Practice Sprint
You will create a prompt operations board that tracks backlog, experiments, and outcomes. The sprint includes setting up feature flags, defining rollout criteria, and writing a release note template for customer-facing changes.

## Reflection Checklist
- Does every prompt change have an owner, reviewer, and rollback plan?
- How will you teach new hires the mental model behind each prompt?
- What telemetry will help you decide when to iterate again?
`,
        content_es: `## Conceptos clave
- Gestionar versionado, experimentación y aprobaciones de prompts en repositorios compartidos.
- Integrar prompts con recuperación, herramientas y canalizaciones analíticas.
- Alinear los rituales de producto alrededor de la telemetría del prompt y la mejora continua.

## Profundización
El trabajo con prompts cruza todas las funciones del equipo. Organizamos un modelo de colaboración que mantiene alineados a investigación, diseño e ingeniería. La lección muestra cómo almacenar prompts junto al código, configurar feature flags y comunicar los cambios a los stakeholders. También revisamos diseño experimental para pruebas A/B que comparan variantes sin afectar a las personas usuarias.

## Sprint práctico
Crearás un tablero de operaciones de prompts que rastrea backlog, experimentos y resultados. El sprint incluye configurar feature flags, definir criterios de despliegue y redactar una plantilla de notas de lanzamiento para cambios visibles al cliente.

## Lista de verificación
- ¿Cada cambio de prompt tiene responsable, revisor y plan de reversión?
- ¿Cómo enseñarás a nuevas personas la lógica detrás de cada prompt?
- ¿Qué telemetría te ayudará a decidir cuándo iterar de nuevo?
`,
        estimated_minutes: 35,
        resources: [
          {
            title: 'LangChain Prompt Templates',
            url: 'https://python.langchain.com/docs/modules/model_io/prompts/',
            type: 'documentation'
          },
          {
            title: 'OpenAI Prompt Engineering for Developers',
            url: 'https://platform.openai.com/docs/guides/prompt-engineering',
            type: 'documentation'
          }
        ]
      }
    ]
  },
  {
    slug: 'applied-nlp-open-source',
    title_en: 'Applied NLP with Open-Source Models',
    title_es: 'NLP aplicado con modelos open source',
    description_en:
      'Ship multilingual NLP capabilities with open-source models, efficient fine-tuning, and retrieval-augmented generation pipelines.',
    description_es:
      'Entrega funcionalidades NLP multilingües con modelos open source, ajuste eficiente y canalizaciones de RAG.',
    difficulty: 'intermediate',
    category: 'nlp',
    topics: ['tokenization', 'embeddings', 'instruction-tuning', 'rag'],
    modules: [
      {
        title_en: 'Tokenization and Embeddings',
        title_es: 'Tokenización y embeddings',
        content_en: `## Key Concepts
- Compare byte-pair encoding, WordPiece, and SentencePiece tokenizers.
- Use contextual embedding models such as BERT, E5, and Instructor.
- Evaluate embedding quality with semantic similarity and clustering tests.

## Deep Dive
Open-source NLP starts with understanding how text becomes tokens and vectors. We inspect different tokenization strategies, how they impact sequence length, and which models best fit multilingual scenarios. The lesson shows how to generate embeddings with Hugging Face pipelines, normalize vectors, and persist them in pgvector or Chroma. We emphasize evaluation techniques that surface bias, OOV handling, and domain mismatch.

## Practice Sprint
You will build a semantic search notebook that indexes support tickets with InstructorXL embeddings, performs similarity search, and exports evaluation metrics that compare query relevance across locales.

## Reflection Checklist
- Which tokenizer best represents the languages you support?
- How will you monitor embedding drift as new vocabulary emerges?
- What privacy policies must be respected before storing vector representations?
`,
        content_es: `## Conceptos clave
- Comparar tokenizadores byte-pair encoding, WordPiece y SentencePiece.
- Utilizar modelos de embeddings contextuales como BERT, E5 e Instructor.
- Evaluar la calidad de embeddings con pruebas de similitud semántica y clustering.

## Profundización
El NLP open source comienza entendiendo cómo el texto se convierte en tokens y vectores. Analizamos distintas estrategias de tokenización, el impacto en la longitud de las secuencias y qué modelos funcionan mejor en escenarios multilingües. La lección muestra cómo generar embeddings con pipelines de Hugging Face, normalizar vectores y almacenarlos en pgvector o Chroma. Enfatizamos técnicas de evaluación que revelan sesgos, manejo de OOV y desajustes de dominio.

## Sprint práctico
Construirás un cuaderno de búsqueda semántica que indexa tickets de soporte con embeddings InstructorXL, realiza búsquedas por similitud y exporta métricas que comparan relevancia de consultas entre idiomas.

## Lista de verificación
- ¿Qué tokenizador representa mejor los idiomas que soportas?
- ¿Cómo vigilarás el drift de embeddings cuando aparezca vocabulario nuevo?
- ¿Qué políticas de privacidad debes respetar antes de almacenar representaciones vectoriales?
`,
        estimated_minutes: 45,
        resources: [
          {
            title: 'Hugging Face Tokenizers Documentation',
            url: 'https://huggingface.co/docs/tokenizers/index',
            type: 'documentation'
          },
          {
            title: 'Supabase pgvector Guide',
            url: 'https://supabase.com/docs/guides/database/extensions/pgvector',
            type: 'documentation'
          }
        ]
      },
      {
        title_en: 'Instruction Fine-Tuning',
        title_es: 'Ajuste fino con instrucciones',
        content_en: `## Key Concepts
- Fine-tune instruction-following models such as LLaMA, Mistral, and Phi.
- Apply parameter-efficient methods including LoRA and QLoRA for affordable training.
- Curate high-quality instruction datasets with filtering and alignment checks.

## Deep Dive
Instruction tuning shapes open models to follow your product voice. We examine dataset sourcing, prompt formatting, and reward modeling basics. The lesson demonstrates how to run low-rank adaptation on modest hardware, track experiments with Weights & Biases, and evaluate outputs with BLEU, ROUGE, and human preference scores. We also discuss safety alignment and content filtering before deployment.

## Practice Sprint
You will fine-tune a Mistral-7B-Instruct checkpoint on a small customer service dataset using QLoRA, evaluate with an automated rubric, and publish the model to the Hugging Face Hub with clear metadata.

## Reflection Checklist
- Which safety filters should be applied before releasing outputs?
- How will you validate that the tuned model preserves multilingual support?
- What rollback strategy exists if new data causes regressions?
`,
        content_es: `## Conceptos clave
- Ajustar modelos de instrucciones como LLaMA, Mistral y Phi.
- Aplicar métodos eficientes como LoRA y QLoRA para entrenar con pocos recursos.
- Curar conjuntos de instrucciones de alta calidad con filtrado y verificaciones de alineación.

## Profundización
El ajuste con instrucciones moldea modelos open source para seguir la voz de tu producto. Analizamos el origen de los datos, el formateo de prompts y nociones básicas de reward modeling. La lección demuestra cómo ejecutar adaptaciones de bajo rango en hardware modesto, rastrear experimentos con Weights & Biases y evaluar salidas con BLEU, ROUGE y puntuaciones de preferencia humana. También discutimos alineación de seguridad y filtros de contenido antes del despliegue.

## Sprint práctico
Ajustarás un checkpoint Mistral-7B-Instruct sobre un pequeño dataset de servicio al cliente usando QLoRA, evaluarás con una rúbrica automatizada y publicarás el modelo en Hugging Face Hub con metadatos claros.

## Lista de verificación
- ¿Qué filtros de seguridad aplicarás antes de liberar las respuestas?
- ¿Cómo validarás que el modelo ajustado conserva el soporte multilingüe?
- ¿Qué estrategia de reversión existe si nuevos datos generan regresiones?
`,
        estimated_minutes: 45,
        resources: [
          {
            title: 'Hugging Face PEFT Documentation',
            url: 'https://huggingface.co/docs/peft/index',
            type: 'documentation'
          },
          {
            title: 'QLoRA: Efficient Finetuning of Quantized LLMs',
            url: 'https://arxiv.org/abs/2305.14314',
            type: 'paper'
          }
        ]
      },
      {
        title_en: 'Retrieval-Augmented Generation Pipelines',
        title_es: 'Canalizaciones de generación aumentada',
        content_en: `## Key Concepts
- Architect retrieval-augmented generation pipelines with vector stores and rerankers.
- Combine grounding sources, summarization prompts, and verification steps.
- Monitor latency, cost, and citation quality in production.

## Deep Dive
RAG keeps generative systems anchored in facts. We build a pipeline that ingests documents, generates embeddings, and fetches relevant passages with hybrid search. The lesson covers prompt chaining for summarization, citation insertion techniques, and evaluation strategies using faithfulness metrics. We also explore caching, batching, and cost controls that keep the system within a zero-infrastructure budget.

## Practice Sprint
You will implement a RAG service that answers policy questions using Supabase pgvector, a reranker, and a final response template that highlights cited sources. The sprint finishes with automated evaluations using the RAGAS framework.

## Reflection Checklist
- Which documents form the source of truth for your application?
- How will you detect hallucinations or missing citations in real time?
- What caching strategy balances freshness with cost constraints?
`,
        content_es: `## Conceptos clave
- Arquitectar canalizaciones RAG con almacenes vectoriales y rerankers.
- Combinar fuentes de referencia, prompts de resumen y pasos de verificación.
- Monitorear latencia, costo y calidad de citas en producción.

## Profundización
RAG mantiene los sistemas generativos anclados a hechos. Construimos una canalización que ingiere documentos, genera embeddings y recupera pasajes relevantes con búsqueda híbrida. La lección cubre encadenamiento de prompts para resumir, técnicas para insertar citas y estrategias de evaluación usando métricas de fidelidad. También exploramos cachés, procesamiento por lotes y controles de costo que respetan el presupuesto cero.

## Sprint práctico
Implementarás un servicio RAG que responde preguntas de políticas utilizando Supabase pgvector, un reranker y una plantilla de respuesta que resalta las fuentes citadas. El sprint concluye con evaluaciones automatizadas mediante el marco RAGAS.

## Lista de verificación
- ¿Qué documentos constituyen la fuente de verdad de tu aplicación?
- ¿Cómo detectarás alucinaciones o citas faltantes en tiempo real?
- ¿Qué estrategia de caché equilibra frescura con restricciones de costo?
`,
        estimated_minutes: 45,
        resources: [
          {
            title: 'LangChain Question Answering Guide',
            url: 'https://python.langchain.com/docs/use_cases/question_answering/',
            type: 'documentation'
          },
          {
            title: 'RAGAS Evaluation Toolkit',
            url: 'https://github.com/explodinggradients/ragas',
            type: 'documentation'
          }
        ]
      }
    ]
  },
  {
    slug: 'responsible-ai-governance',
    title_en: 'Responsible AI and Governance',
    title_es: 'Gobernanza e IA Responsable',
    description_en:
      'Implement policy frameworks, risk assessments, and operations that keep AI systems accountable and audit-ready.',
    description_es:
      'Implementa marcos de política, evaluaciones de riesgo y operaciones que mantengan los sistemas de IA responsables y listos para auditorías.',
    difficulty: 'intermediate',
    category: 'responsible-ai',
    topics: ['ethics', 'governance', 'risk-management', 'compliance'],
    modules: [
      {
        title_en: 'Policy Frameworks and Principles',
        title_es: 'Marcos de políticas y principios',
        content_en: `## Key Concepts
- Compare global governance frameworks including the EU AI Act, NIST AI RMF, and OECD recommendations.
- Translate organizational values into actionable AI principles and policies.
- Define accountability structures that assign ownership across legal, engineering, and product.

## Deep Dive
Responsible AI begins with shared principles backed by policy. We unpack key frameworks, highlight how risk tiers influence controls, and review notable industry case studies. The lesson guides you through writing an AI charter that clarifies decision rights, documentation requirements, and escalation paths.

## Practice Sprint
You will create an AI principle canvas for your organization, mapping values to concrete commitments, regulatory references, and measurable signals that prove compliance.

## Reflection Checklist
- Which regulations apply to your current product portfolio?
- Have you defined who approves exceptions to the AI policy?
- What evidence will you capture to demonstrate compliance during audits?
`,
        content_es: `## Conceptos clave
- Comparar marcos de gobernanza globales como la Ley de IA de la UE, el NIST AI RMF y las recomendaciones de la OCDE.
- Traducir los valores de la organización en principios y políticas accionables.
- Definir estructuras de responsabilidad que asignen dueños entre legal, ingeniería y producto.

## Profundización
La IA responsable comienza con principios compartidos respaldados por políticas. Desempaquetamos los marcos clave, resaltamos cómo los niveles de riesgo influyen en los controles y revisamos casos de la industria. La lección te guía para redactar una carta de IA que aclare derechos de decisión, requisitos documentales y rutas de escalamiento.

## Sprint práctico
Crearás un lienzo de principios de IA para tu organización, mapeando valores con compromisos concretos, referencias regulatorias y señales medibles que demuestren conformidad.

## Lista de verificación
- ¿Qué regulaciones aplican a tu portafolio actual de productos?
- ¿Has definido quién aprueba excepciones a la política de IA?
- ¿Qué evidencia capturarás para demostrar cumplimiento en auditorías?
`,
        estimated_minutes: 40,
        resources: [
          {
            title: 'EU AI Act Overview',
            url: 'https://artificialintelligenceact.eu/',
            type: 'documentation'
          },
          {
            title: 'NIST AI Risk Management Framework',
            url: 'https://www.nist.gov/itl/ai-risk-management-framework',
            type: 'documentation'
          }
        ]
      },
      {
        title_en: 'Risk Assessment and Red Teaming',
        title_es: 'Evaluación de riesgos y red teaming',
        content_en: `## Key Concepts
- Conduct impact assessments, scenario planning, and threat modeling for AI systems.
- Run red teaming exercises tailored to generative models and data pipelines.
- Maintain risk registers with mitigation owners and timelines.

## Deep Dive
Policies only matter when they survive contact with reality. We explore structured impact assessments, adversarial testing patterns, and how to combine automated scanners with human reviewers. The lesson provides templates for documenting findings, prioritizing remediation, and sharing outcomes with executives.

## Practice Sprint
You will facilitate a tabletop exercise that stress-tests a conversational agent, capture failure modes in a risk register, and design mitigations with owners and deadlines.

## Reflection Checklist
- Which stakeholders must participate in every red teaming session?
- How will you prioritize mitigation work when resources are limited?
- What triggers should automatically revisit the risk assessment?
`,
        content_es: `## Conceptos clave
- Realizar evaluaciones de impacto, planificación de escenarios y threat modeling para sistemas de IA.
- Ejecutar ejercicios de red teaming adaptados a modelos generativos y canalizaciones de datos.
- Mantener registros de riesgo con responsables y fechas límite.

## Profundización
Las políticas solo importan cuando resisten la realidad. Exploramos evaluaciones de impacto estructuradas, patrones de pruebas adversarias y la combinación de escáneres automatizados con revisión humana. La lección ofrece plantillas para documentar hallazgos, priorizar remediaciones y compartir resultados con la dirección.

## Sprint práctico
Facilitarás un ejercicio de mesa que pone a prueba un agente conversacional, capturarás modos de fallo en un registro de riesgos y diseñarás mitigaciones con responsables y plazos.

## Lista de verificación
- ¿Qué stakeholders deben participar en cada sesión de red teaming?
- ¿Cómo priorizarás el trabajo de mitigación cuando los recursos sean limitados?
- ¿Qué disparadores deben forzar una reevaluación del riesgo?
`,
        estimated_minutes: 45,
        resources: [
          {
            title: 'Microsoft Responsible AI Mitigations Guide',
            url: 'https://learn.microsoft.com/en-us/azure/ai-services/responsible-ai/',
            type: 'documentation'
          },
          {
            title: 'Anthropic Red Teaming Handbook',
            url: 'https://www.anthropic.com/index/anthropic-red-teaming-handbook',
            type: 'article'
          }
        ]
      },
      {
        title_en: 'Governance Operations and Reporting',
        title_es: 'Operaciones de gobernanza y reportes',
        content_en: `## Key Concepts
- Operationalize AI governance with steering committees, review rituals, and decision logs.
- Build end-to-end documentation and audit trails for models, datasets, and prompts.
- Communicate transparently with regulators, customers, and partners.

## Deep Dive
Governance succeeds when it is part of daily operations. We design lightweight processes that embed checks into sprint planning, release reviews, and post-incident analysis. The lesson covers audit logging, retention policies, and crafting external transparency reports that satisfy regulatory expectations while building trust.

## Practice Sprint
You will assemble a governance playbook that outlines meeting cadences, tooling, and dashboards. The sprint includes creating a sample transparency report summarizing model purpose, limitations, and recourse channels.

## Reflection Checklist
- Are the right people empowered to halt a launch if safeguards fail?
- How quickly can you produce artifacts requested by regulators?
- What commitments will you publish to customers about responsible AI?
`,
        content_es: `## Conceptos clave
- Operacionalizar la gobernanza con comités directivos, rituales de revisión y registros de decisiones.
- Construir documentación y trazabilidad completos para modelos, datos y prompts.
- Comunicarte con transparencia con reguladores, clientes y socios.

## Profundización
La gobernanza triunfa cuando forma parte de las operaciones diarias. Diseñamos procesos ligeros que integran controles en la planeación de sprints, revisiones de lanzamiento y análisis posteriores a incidentes. La lección cubre bitácoras de auditoría, políticas de retención y cómo redactar reportes de transparencia que cumplan con las expectativas regulatorias y a la vez construyan confianza.

## Sprint práctico
Armarás un playbook de gobernanza que describe cadencias de reuniones, herramientas y tableros. El sprint incluye crear un reporte de transparencia ejemplo que resuma propósito del modelo, limitaciones y canales de recurso.

## Lista de verificación
- ¿Las personas adecuadas tienen autoridad para detener un lanzamiento si fallan las salvaguardas?
- ¿Qué tan rápido puedes producir artefactos que solicite un regulador?
- ¿Qué compromisos publicarás a tus clientes sobre IA responsable?
`,
        estimated_minutes: 40,
        resources: [
          {
            title: 'OECD AI Governance Observatory',
            url: 'https://oecd.ai/en/observatory',
            type: 'documentation'
          },
          {
            title: 'Partnership on AI Transparency Resources',
            url: 'https://partnershiponai.org/workstream/transparency/',
            type: 'article'
          }
        ]
      }
    ]
  },
  {
    slug: 'mlops-on-a-budget',
    title_en: 'MLOps on a Budget',
    title_es: 'MLOps con presupuesto reducido',
    description_en:
      'Stand up robust MLOps practices using free-tier tooling: automated CI/CD, lightweight feature stores, and pragmatic monitoring.',
    description_es:
      'Implementa prácticas sólidas de MLOps con herramientas de nivel gratuito: CI/CD automatizado, feature stores ligeros y monitoreo pragmático.',
    difficulty: 'advanced',
    category: 'mlops',
    topics: ['ci-cd', 'data-management', 'monitoring', 'cost-optimization'],
    modules: [
      {
        title_en: 'Lightweight CI/CD for Models',
        title_es: 'CI/CD ligero para modelos',
        content_en: `## Key Concepts
- Build Git-based CI/CD using GitHub Actions, DVC, and inexpensive runners.
- Automate testing, packaging, and artifact storage with S3-compatible buckets.
- Implement approval workflows that gate model promotion to production.

## Deep Dive
Enterprise MLOps platforms are costly, yet you can ship robust workflows with free-tier tools. We assemble a pipeline that runs unit tests, data checks, and model training inside GitHub Actions, caching dependencies to stay within limits. The lesson shows how to package models with Docker or ONNX, push artifacts to object storage, and trigger staged deployments with manual approvals.

## Practice Sprint
You will configure a reusable workflow file that executes linting, training, evaluation, and deployment packaging for a sample project. The sprint concludes with a manual approval step and release tagging strategy.

## Reflection Checklist
- Which steps must run on every push versus nightly schedules?
- How will you keep secrets safe while using shared runners?
- Does your promotion checklist capture reproducibility evidence?
`,
        content_es: `## Conceptos clave
- Construir CI/CD basado en Git con GitHub Actions, DVC y runners económicos.
- Automatizar pruebas, empaquetado y almacenamiento de artefactos con buckets compatibles con S3.
- Implementar flujos de aprobación que controlen la promoción de modelos a producción.

## Profundización
Las plataformas empresariales de MLOps son costosas, pero puedes entregar flujos robustos con herramientas de nivel gratuito. Ensamblamos una pipeline que ejecuta pruebas unitarias, chequeos de datos y entrenamiento dentro de GitHub Actions, almacenando cachés para mantenerse en los límites. La lección muestra cómo empaquetar modelos con Docker u ONNX, publicar artefactos en almacenamiento de objetos y activar despliegues escalonados con aprobaciones manuales.

## Sprint práctico
Configurarás un archivo de workflow reutilizable que ejecuta linting, entrenamiento, evaluación y empaquetado de despliegue para un proyecto de ejemplo. El sprint concluye con un paso de aprobación manual y una estrategia de etiquetado de releases.

## Lista de verificación
- ¿Qué pasos deben ejecutarse en cada push versus en tareas nocturnas?
- ¿Cómo protegerás los secretos al usar runners compartidos?
- ¿Tu checklist de promoción captura evidencia de reproducibilidad?
`,
        estimated_minutes: 45,
        resources: [
          {
            title: 'DVC Pipelines Documentation',
            url: 'https://dvc.org/doc/start/data-versioning',
            type: 'documentation'
          },
          {
            title: 'GitHub Actions Starter Workflows for Python',
            url: 'https://github.com/actions/starter-workflows/blob/main/ci/python-package.yml',
            type: 'documentation'
          }
        ]
      },
      {
        title_en: 'Lean Data and Feature Management',
        title_es: 'Gestión ligera de datos y atributos',
        content_en: `## Key Concepts
- Version datasets and features with tools like DVC, DuckDB, and lightweight Feast setups.
- Orchestrate training jobs with open-source schedulers that run on serverless or low-cost VMs.
- Validate data continuously using Great Expectations or pandera.

## Deep Dive
Data management keeps models trustworthy. We focus on storage-efficient formats, small-footprint feature stores, and scheduling strategies that fit free tiers. The lesson demonstrates how to use DuckDB for local analytics, publish feature views with Feast running on SQLite, and schedule updates with Prefect Cloud's free plan. We also wire in data validation tests that fail fast before training.

## Practice Sprint
You will build a feature pipeline that loads raw CSVs, transforms them with dbt-duckdb, validates outputs, and publishes features to a lightweight Feast repository ready for offline and online serving.

## Reflection Checklist
- Where should canonical datasets live to balance access and cost?
- How will you roll back a bad data release rapidly?
- Which validations must block training versus only warn stakeholders?
`,
        content_es: `## Conceptos clave
- Versionar datasets y atributos con herramientas como DVC, DuckDB y configuraciones ligeras de Feast.
- Orquestar trabajos de entrenamiento con planificadores open source en serverless o VMs de bajo costo.
- Validar datos de forma continua usando Great Expectations o pandera.

## Profundización
La gestión de datos mantiene confiables a los modelos. Nos enfocamos en formatos eficientes, feature stores de baja huella y estrategias de planificación que caben en los niveles gratuitos. La lección muestra cómo usar DuckDB para analítica local, publicar vistas de atributos con Feast sobre SQLite y programar actualizaciones con el plan gratuito de Prefect Cloud. También conectamos pruebas de validación que detienen el entrenamiento cuando algo falla.

## Sprint práctico
Construirás una pipeline de atributos que carga CSVs crudos, los transforma con dbt-duckdb, valida los resultados y publica atributos en un repositorio ligero de Feast listo para servicio offline y online.

## Lista de verificación
- ¿Dónde deben vivir los datasets canónicos para equilibrar acceso y costo?
- ¿Cómo revertirás rápidamente una liberación de datos defectuosa?
- ¿Qué validaciones deben bloquear el entrenamiento y cuáles solo advertir?
`,
        estimated_minutes: 45,
        resources: [
          {
            title: 'Prefect Cloud Documentation',
            url: 'https://docs.prefect.io/latest/',
            type: 'documentation'
          },
          {
            title: 'Feast Feature Store Overview',
            url: 'https://docs.feast.dev/',
            type: 'documentation'
          }
        ]
      },
      {
        title_en: 'Monitoring and Feedback Loops',
        title_es: 'Monitoreo y bucles de retroalimentación',
        content_en: `## Key Concepts
- Monitor models with Prometheus, Evidently, and lightweight dashboards.
- Collect user feedback loops and human-in-the-loop reviews without expensive tooling.
- Automate retraining triggers based on drift, cost, and business metrics.

## Deep Dive
Monitoring keeps your models honest long after deployment. We configure Prometheus and Grafana dashboards that track latency, errors, and custom metrics. The lesson integrates Evidently for data drift, adds user feedback capture via simple forms, and defines policies for when to retrain or roll back. We highlight how to stay within free tier quotas by sampling intelligently and archiving logs.

## Practice Sprint
You will deploy a monitoring stack using Docker Compose, connect it to a demo inference API, and script alerts that ping chat channels when drift or error budgets exceed thresholds.

## Reflection Checklist
- Are you monitoring both technical and business KPIs?
- What is the human review loop when alerts fire?
- How will you maintain observability as traffic grows?
`,
        content_es: `## Conceptos clave
- Monitorear modelos con Prometheus, Evidently y tableros ligeros.
- Recoger bucles de retroalimentación humana sin herramientas costosas.
- Automatizar disparadores de reentrenamiento basados en drift, costo y métricas de negocio.

## Profundización
El monitoreo mantiene honestos a los modelos tras el despliegue. Configuramos tableros de Prometheus y Grafana que rastrean latencia, errores y métricas personalizadas. La lección integra Evidently para drift de datos, añade captura de feedback mediante formularios simples y define políticas para reentrenar o revertir. Destacamos cómo mantenerse dentro de los límites gratuitos mediante muestreo inteligente y archivado de logs.

## Sprint práctico
Desplegarás una pila de monitoreo con Docker Compose, la conectarás a una API de inferencia de demostración y escribirás alertas que envían avisos a canales de chat cuando el drift o los presupuestos de error superen los umbrales.

## Lista de verificación
- ¿Monitoreas tanto KPIs técnicos como de negocio?
- ¿Cuál es el bucle de revisión humana cuando se activan las alertas?
- ¿Cómo mantendrás la observabilidad a medida que crece el tráfico?
`,
        estimated_minutes: 40,
        resources: [
          {
            title: 'Evidently AI Open-Source Docs',
            url: 'https://docs.evidentlyai.com/',
            type: 'documentation'
          },
          {
            title: 'Prometheus Overview',
            url: 'https://prometheus.io/docs/introduction/overview/',
            type: 'documentation'
          }
        ]
      }
    ]
  },
  {
    slug: 'generative-ai-creative-pros',
    title_en: 'Generative AI for Creative Professionals',
    title_es: 'IA generativa para profesionales creativos',
    description_en:
      'Leverage text-to-image and multimodal workflows to deliver client-ready creative assets while protecting ethics and IP.',
    description_es:
      'Aprovecha flujos multimodales y de texto a imagen para entregar assets creativos listos para el cliente cuidando ética e IP.',
    difficulty: 'intermediate',
    category: 'generative-ai',
    topics: ['diffusion-models', 'multimodal', 'creative-workflows', 'ethics'],
    modules: [
      {
        title_en: 'Text-to-Image Foundations',
        title_es: 'Fundamentos de texto a imagen',
        content_en: `## Key Concepts
- Understand diffusion pipelines, control networks, and style transfer techniques.
- Manage prompts, seeds, negative prompts, and upscalers for consistent results.
- Evaluate outputs using composition, lighting, and brand alignment guidelines.

## Deep Dive
Generative imagery feels magical when designers can steer it precisely. We demystify latent diffusion, sampler settings, and how control nets lock pose or depth information. The lesson walks through building prompt guides for brand teams, tracking seeds for reproducibility, and using open-source UI tools like Automatic1111 or ComfyUI on consumer GPUs.

## Practice Sprint
You will create a brand-aligned moodboard by iterating on prompts, applying control net constraints, and exporting layered PSD files ready for human touch-ups.

## Reflection Checklist
- Do your prompts include the non-negotiable elements of the brief?
- How will you recreate a specific output weeks later?
- What quality bar must be met before sharing with stakeholders?
`,
        content_es: `## Conceptos clave
- Entender pipelines de difusión, control nets y técnicas de transferencia de estilo.
- Gestionar prompts, seeds, prompts negativos y upscalers para obtener resultados consistentes.
- Evaluar las salidas usando pautas de composición, iluminación y alineación de marca.

## Profundización
Las imágenes generativas brillan cuando las personas creativas pueden dirigirlas con precisión. Desmitificamos la difusión latente, la configuración de los samplers y cómo los control nets fijan información de pose o profundidad. La lección recorre la creación de guías de prompt para equipos de marca, el seguimiento de seeds para reproducibilidad y el uso de herramientas open source como Automatic1111 o ComfyUI en GPUs de consumo.

## Sprint práctico
Crearás un moodboard alineado a una marca iterando sobre prompts, aplicando restricciones con control net y exportando archivos PSD por capas listos para retoques humanos.

## Lista de verificación
- ¿Tus prompts incluyen los elementos irrenunciables del brief?
- ¿Cómo recrearás una salida específica semanas después?
- ¿Qué nivel de calidad debes alcanzar antes de compartir con stakeholders?
`,
        estimated_minutes: 40,
        resources: [
          {
            title: 'Automatic1111 Stable Diffusion WebUI',
            url: 'https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Features',
            type: 'documentation'
          },
          {
            title: 'ControlNet: Adding Conditional Control to Diffusion Models',
            url: 'https://arxiv.org/abs/2302.05543',
            type: 'paper'
          }
        ]
      },
      {
        title_en: 'Narrative and Multimodal Storytelling',
        title_es: 'Narrativa y storytelling multimodal',
        content_en: `## Key Concepts
- Orchestrate text, image, and audio models to produce cohesive narratives.
- Use prompt chaining and story beats to maintain tone and continuity.
- Collaborate between human creatives and AI tools through iterative briefs.

## Deep Dive
Great storytelling emerges from structure. We create a beat sheet, generate scripts with LLMs, storyboard scenes with diffusion models, and layer audio cues. The lesson explores multimodal prompting, leveraging tools like Runway, Pika, and ElevenLabs, and managing assets in shared workspaces so teams can iterate safely.

## Practice Sprint
You will craft a short product launch narrative: outline beats with an LLM, generate key visuals, and assemble a teaser video storyboard that designers can refine.

## Reflection Checklist
- Which story beats require human approval before automation?
- How will you keep character or brand voice consistent across modalities?
- What file management practices ensure assets remain reusable?
`,
        content_es: `## Conceptos clave
- Orquestar modelos de texto, imagen y audio para producir narrativas cohesionadas.
- Usar encadenamiento de prompts y beats narrativos para mantener tono y continuidad.
- Colaborar entre personas creativas y herramientas de IA mediante briefs iterativos.

## Profundización
La gran narrativa nace de la estructura. Creamos una hoja de beats, generamos guiones con LLMs, elaboramos storyboards con modelos de difusión y añadimos pistas de audio. La lección explora prompts multimodales, el uso de herramientas como Runway, Pika y ElevenLabs, y la gestión de assets en espacios compartidos para iterar con seguridad.

## Sprint práctico
Diseñarás una narrativa corta de lanzamiento de producto: delinearás beats con un LLM, generarás visuales clave y armarás un storyboard de teaser que el equipo de diseño pueda pulir.

## Lista de verificación
- ¿Qué beats narrativos requieren aprobación humana antes de automatizarse?
- ¿Cómo mantendrás consistente la voz de la marca o del personaje en todas las modalidades?
- ¿Qué prácticas de gestión de archivos aseguran que los assets sigan siendo reutilizables?
`,
        estimated_minutes: 40,
        resources: [
          {
            title: 'Runway Learn Center',
            url: 'https://learn.runwayml.com/',
            type: 'documentation'
          },
          {
            title: 'Storytelling Prompt Strategies',
            url: 'https://www.descript.com/blog/article/how-to-write-ai-prompts-for-storytelling',
            type: 'article'
          }
        ]
      },
      {
        title_en: 'Ethics, IP, and Client Delivery',
        title_es: 'Ética, propiedad intelectual y entrega al cliente',
        content_en: `## Key Concepts
- Navigate copyright, licensing, and usage rights for generative assets.
- Document provenance, consent, and data sources for every deliverable.
- Design client delivery workflows that balance automation with human review.

## Deep Dive
Creative professionals must handle IP risk alongside innovation. We cover the evolving legal landscape, model training disclosures, and how to flag assets for legal review. The lesson introduces watermarking, metadata tracking, and client education materials that clarify what is AI-generated versus hand-crafted. We also discuss accessibility considerations and inclusive design.

## Practice Sprint
You will assemble a delivery package for a hypothetical client: annotated assets, usage guidelines, a provenance log, and an internal review checklist that ensures compliance before handoff.

## Reflection Checklist
- Which approvals are mandatory before sharing AI assets externally?
- How will you communicate limitations and recommended edits to clients?
- What documentation must stay on file for future audits?
`,
        content_es: `## Conceptos clave
- Navegar derechos de autor, licencias y uso de assets generativos.
- Documentar procedencia, consentimiento y fuentes de datos para cada entregable.
- Diseñar flujos de entrega al cliente que equilibren automatización con revisión humana.

## Profundización
Las personas creativas deben gestionar riesgos de propiedad intelectual mientras innovan. Cubrimos el panorama legal cambiante, las divulgaciones sobre datos de entrenamiento y cómo señalar assets para revisión legal. La lección introduce marcas de agua, seguimiento de metadatos y materiales educativos que distinguen lo generado por IA de lo hecho a mano. También discutimos consideraciones de accesibilidad y diseño inclusivo.

## Sprint práctico
Armarás un paquete de entrega para un cliente hipotético: assets anotados, guías de uso, un registro de procedencia y una lista de verificación interna que asegure el cumplimiento antes de la entrega.

## Lista de verificación
- ¿Qué aprobaciones son obligatorias antes de compartir assets generados con IA?
- ¿Cómo comunicarás limitaciones y ediciones recomendadas a los clientes?
- ¿Qué documentación debe conservarse para auditorías futuras?
`,
        estimated_minutes: 35,
        resources: [
          {
            title: 'UK IPO Guidance on Generative AI and Copyright',
            url: 'https://www.gov.uk/government/publications/guidance-on-copyright-and-generative-ai/guidance-on-copyright-and-generative-ai',
            type: 'documentation'
          },
          {
            title: 'Content Authenticity Initiative',
            url: 'https://contentauthenticity.org/',
            type: 'documentation'
          }
        ]
      }
    ]
  },
  {
    slug: 'reinforcement-learning-robotics',
    title_en: 'Reinforcement Learning for Robotics',
    title_es: 'Aprendizaje por refuerzo para robótica',
    description_en:
      'Apply reinforcement learning algorithms to robotic systems, bridging simulation and reality with a focus on safety and evaluation.',
    description_es:
      'Aplica algoritmos de aprendizaje por refuerzo a sistemas robóticos, conectando simulación y realidad con enfoque en seguridad y evaluación.',
    difficulty: 'advanced',
    category: 'robotics',
    topics: ['reinforcement-learning', 'sim2real', 'robotics', 'safety'],
    modules: [
      {
        title_en: 'RL Foundations for Control',
        title_es: 'Fundamentos de RL para control',
        content_en: `## Key Concepts
- Formalize robotic control tasks as Markov decision processes with clear reward signals.
- Understand policy gradient, actor-critic, and proximal policy optimization algorithms.
- Apply reward shaping, curriculum learning, and domain randomization to accelerate learning.

## Deep Dive
Robotics demands RL techniques that balance stability and performance. We revisit the math behind policy gradients, analyze why PPO is widely used, and inspect alternatives such as SAC. The lesson shows how to design observation spaces, action spaces, and reward functions that encourage safe motion. We also cover curriculum strategies that gradually increase difficulty.

## Practice Sprint
You will train a PPO agent in Isaac Gym to balance a manipulator while following a moving target, logging training metrics and visualizing policy improvements.

## Reflection Checklist
- Does your reward function capture safety constraints explicitly?
- Which algorithm matches the latency and compute budget of your platform?
- How will you measure sample efficiency during experiments?
`,
        content_es: `## Conceptos clave
- Formalizar tareas de control robótico como procesos de decisión de Markov con recompensas claras.
- Comprender algoritmos policy gradient, actor-critic y proximal policy optimization.
- Aplicar reward shaping, aprendizaje curricular y domain randomization para acelerar el aprendizaje.

## Profundización
La robótica exige técnicas de RL que equilibren estabilidad y rendimiento. Repasamos las matemáticas detrás de los policy gradients, analizamos por qué PPO es tan usado e inspeccionamos alternativas como SAC. La lección muestra cómo diseñar espacios de observación, acción y recompensas que fomenten movimientos seguros. También cubrimos estrategias curriculares que incrementan la dificultad gradualmente.

## Sprint práctico
Entrenarás un agente PPO en Isaac Gym para equilibrar un manipulador mientras sigue un objetivo en movimiento, registrando métricas y visualizando la mejora de la política.

## Lista de verificación
- ¿Tu función de recompensa captura explícitamente las restricciones de seguridad?
- ¿Qué algoritmo se ajusta a la latencia y presupuesto de cómputo de tu plataforma?
- ¿Cómo medirás la eficiencia muestral durante los experimentos?
`,
        estimated_minutes: 50,
        resources: [
          {
            title: 'Spinning Up in Deep RL',
            url: 'https://spinningup.openai.com/en/latest/',
            type: 'documentation'
          },
          {
            title: 'NVIDIA Isaac Gym Preview',
            url: 'https://developer.nvidia.com/isaac-gym',
            type: 'documentation'
          }
        ]
      },
      {
        title_en: 'Simulation to Reality Transfer',
        title_es: 'Transferencia de simulación a realidad',
        content_en: `## Key Concepts
- Bridge simulation and reality with domain randomization, system identification, and fine-tuning.
- Configure physics simulators such as MuJoCo and Isaac Sim to mimic hardware constraints.
- Calibrate sensors, latency, and actuation limits before deployment.

## Deep Dive
Simulators accelerate RL but real robots introduce friction, backlash, and sensor noise. We outline workflows for collecting real-world data, updating simulator parameters, and performing residual learning on hardware. The lesson includes transfer learning techniques, safety cages for on-robot experiments, and logging strategies that capture failures without damaging equipment.

## Practice Sprint
You will export a policy from simulation, apply system identification using recorded joint trajectories, and run a guarded test on a physical arm (or a remote lab environment) with automatic rollback conditions.

## Reflection Checklist
- Which simulator parameters must match reality most closely?
- How will you stage rollouts to minimize hardware wear?
- What telemetry proves that the transferred policy behaves as expected?
`,
        content_es: `## Conceptos clave
- Conectar simulación y realidad mediante domain randomization, identificación de sistemas y ajuste fino.
- Configurar simuladores físicos como MuJoCo e Isaac Sim para reproducir restricciones de hardware.
- Calibrar sensores, latencias y límites de actuación antes del despliegue.

## Profundización
Los simuladores aceleran el RL, pero los robots reales introducen fricción, holgura y ruido en sensores. Describimos flujos para recopilar datos reales, actualizar parámetros del simulador y realizar aprendizaje residual en el hardware. La lección incluye técnicas de transferencia, jaulas de seguridad para experimentos en robot y estrategias de registro que capturan fallos sin dañar el equipo.

## Sprint práctico
Exportarás una política desde la simulación, aplicarás identificación de sistemas usando trayectorias registradas y ejecutarás una prueba controlada en un brazo físico (o laboratorio remoto) con condiciones automáticas de retroceso.

## Lista de verificación
- ¿Qué parámetros del simulador deben igualar la realidad con mayor precisión?
- ¿Cómo organizarás los despliegues para minimizar el desgaste del hardware?
- ¿Qué telemetría demuestra que la política transferida se comporta como se espera?
`,
        estimated_minutes: 45,
        resources: [
          {
            title: 'Domain Randomization for Transferring Deep Neural Networks',
            url: 'https://arxiv.org/abs/1703.06907',
            type: 'paper'
          },
          {
            title: 'OpenAI Robotics: Learning Dexterity',
            url: 'https://openai.com/research/learning-dexterity',
            type: 'article'
          }
        ]
      },
      {
        title_en: 'Safety and Evaluation Playbooks',
        title_es: 'Guías de seguridad y evaluación',
        content_en: `## Key Concepts
- Establish safety envelopes, fail-safe mechanisms, and human override procedures.
- Evaluate policies with standardized benchmarks, hardware-in-the-loop tests, and scenario libraries.
- Document compliance with robotics safety standards and ethical guidelines.

## Deep Dive
Deploying RL-driven robots is high stakes. We define layered safety mechanisms, from emergency stops to constraint-based planners. The lesson covers evaluation protocols, logging for forensic analysis, and how to communicate risk to leadership. We also explore emerging regulations and certification paths for collaborative robots.

## Practice Sprint
You will draft a safety case for an RL-enabled manipulator, including hazard analyses, evaluation metrics, and an incident response plan shared with operations teams.

## Reflection Checklist
- Do operators know how to halt the system instantly?
- What evidence demonstrates the policy remains within safe bounds?
- How will you update documentation after incidents or near misses?
`,
        content_es: `## Conceptos clave
- Establecer zonas seguras, mecanismos de fail-safe y procedimientos de intervención humana.
- Evaluar políticas con benchmarks estandarizados, pruebas hardware-in-the-loop y bibliotecas de escenarios.
- Documentar cumplimiento con normas de seguridad robótica y guías éticas.

## Profundización
Desplegar robots impulsados por RL involucra riesgos altos. Definimos mecanismos de seguridad en capas, desde paros de emergencia hasta planificadores con restricciones. La lección cubre protocolos de evaluación, registros para análisis forense y cómo comunicar el riesgo a la dirección. También exploramos regulaciones emergentes y rutas de certificación para robots colaborativos.

## Sprint práctico
Redactarás un safety case para un manipulador con RL que incluya análisis de peligros, métricas de evaluación y un plan de respuesta a incidentes compartido con operaciones.

## Lista de verificación
- ¿Las personas operadoras saben cómo detener el sistema al instante?
- ¿Qué evidencia demuestra que la política se mantiene dentro de límites seguros?
- ¿Cómo actualizarás la documentación tras incidentes o casi incidentes?
`,
        estimated_minutes: 40,
        resources: [
          {
            title: 'ROS 2 Safety Guidelines',
            url: 'https://design.ros2.org/articles/ros_safety.html',
            type: 'documentation'
          },
          {
            title: 'EU Robotics Code of Conduct Draft',
            url: 'https://www.eu-robotics.net/cms/upload/press/Draft_CoP_Robotics.pdf',
            type: 'paper'
          }
        ]
      }
    ]
  },
  {
    slug: 'edge-ai-deployment',
    title_en: 'Edge AI Deployment Strategies',
    title_es: 'Estrategias de despliegue de IA en el borde',
    description_en:
      'Deliver fast, reliable edge AI by compressing models, targeting the right hardware, and managing fleets with strong observability.',
    description_es:
      'Entrega IA en el borde rápida y confiable comprimiendo modelos, eligiendo el hardware adecuado y gestionando flotas con observabilidad sólida.',
    difficulty: 'advanced',
    category: 'edge-ai',
    topics: ['model-compression', 'edge-hardware', 'fleet-management', 'security'],
    modules: [
      {
        title_en: 'Model Compression and Quantization',
        title_es: 'Compresión y cuantización de modelos',
        content_en: `## Key Concepts
- Apply pruning, distillation, and post-training quantization to shrink models.
- Evaluate accuracy, latency, and power trade-offs across int8, int4, and mixed precision.
- Use tooling such as ONNX Runtime, TensorRT, and TensorFlow Lite for deployment.

## Deep Dive
Edge deployments require ruthlessly efficient models. We explore compression techniques, analyze profiler outputs, and compare toolchains for CPUs, GPUs, and NPUs. The lesson walks through evaluating quality after compression with calibration datasets and visualizing latency distributions across devices.

## Practice Sprint
You will compress a vision model from 32-bit floats to int8 using ONNX Runtime quantization, test it on a Raspberry Pi, and document latency and accuracy metrics.

## Reflection Checklist
- Which compression techniques preserve your critical metrics?
- How will you maintain a calibration dataset that represents real-world inputs?
- What testing strategy ensures every hardware SKU behaves reliably?
`,
        content_es: `## Conceptos clave
- Aplicar pruning, distillation y cuantización post-entrenamiento para reducir modelos.
- Evaluar compromisos de exactitud, latencia y consumo energético entre int8, int4 y precisión mixta.
- Utilizar herramientas como ONNX Runtime, TensorRT y TensorFlow Lite para el despliegue.

## Profundización
Los despliegues en el borde exigen modelos extremadamente eficientes. Exploramos técnicas de compresión, analizamos resultados de perfiladores y comparamos toolchains para CPU, GPU y NPU. La lección muestra cómo evaluar la calidad tras la compresión con conjuntos de calibración y cómo visualizar distribuciones de latencia en distintos dispositivos.

## Sprint práctico
Comprimirás un modelo de visión de floats de 32 bits a int8 usando cuantización de ONNX Runtime, lo probarás en una Raspberry Pi y documentarás métricas de latencia y exactitud.

## Lista de verificación
- ¿Qué técnicas de compresión preservan tus métricas críticas?
- ¿Cómo mantendrás un conjunto de calibración que represente entradas reales?
- ¿Qué estrategia de pruebas asegura que cada SKU de hardware se comporte de forma confiable?
`,
        estimated_minutes: 45,
        resources: [
          {
            title: 'ONNX Runtime Quantization Guide',
            url: 'https://onnxruntime.ai/docs/performance/quantization.html',
            type: 'documentation'
          },
          {
            title: 'TensorRT Best Practices',
            url: 'https://docs.nvidia.com/deeplearning/tensorrt/best-practices/index.html',
            type: 'documentation'
          }
        ]
      },
      {
        title_en: 'Hardware Acceleration and Toolchains',
        title_es: 'Aceleración de hardware y toolchains',
        content_en: `## Key Concepts
- Select edge accelerators such as Jetson Orin, Coral TPU, and Apple Neural Engine based on workloads.
- Compile models with TVM, OpenVINO, or Core ML Tools.
- Automate build pipelines that produce artifacts per target platform.

## Deep Dive
Hardware diversity makes edge deployments tricky. We map workloads to accelerators, compare driver ecosystems, and explain when vendor SDKs beat generic runtimes. The lesson covers compiling models with TVM, packaging them with Docker or native installers, and setting up CI pipelines that test each build on emulators or remote labs.

## Practice Sprint
You will compile an object detection model using Apache TVM, generate packages for Jetson and x86 edge gateways, and validate performance using automated integration tests.

## Reflection Checklist
- Which tooling keeps pace with updates to your target hardware?
- How will you source and manage drivers across operating systems?
- Do you have automated tests that fail when performance regresses?
`,
        content_es: `## Conceptos clave
- Seleccionar aceleradores de borde como Jetson Orin, Coral TPU y Apple Neural Engine según la carga de trabajo.
- Compilar modelos con TVM, OpenVINO o Core ML Tools.
- Automatizar pipelines de build que generen artefactos por plataforma objetivo.

## Profundización
La diversidad de hardware complica los despliegues en el borde. Mapeamos cargas de trabajo a aceleradores, comparamos ecosistemas de drivers y explicamos cuándo los SDK del fabricante superan a los runtimes genéricos. La lección cubre compilar modelos con TVM, empaquetarlos con Docker o instaladores nativos y configurar pipelines de CI que prueben cada build en emuladores o laboratorios remotos.

## Sprint práctico
Compilarás un modelo de detección de objetos usando Apache TVM, generarás paquetes para Jetson y puertas de enlace x86 y validarás el rendimiento mediante pruebas de integración automatizadas.

## Lista de verificación
- ¿Qué herramientas siguen el ritmo de las actualizaciones de tu hardware objetivo?
- ¿Cómo obtendrás y administrarás drivers en diferentes sistemas operativos?
- ¿Tienes pruebas automatizadas que fallen cuando el rendimiento retrocede?
`,
        estimated_minutes: 45,
        resources: [
          {
            title: 'Apache TVM Tutorials',
            url: 'https://tvm.apache.org/docs/tutorial/index.html',
            type: 'documentation'
          },
          {
            title: 'OpenVINO Toolkit Documentation',
            url: 'https://docs.openvino.ai/latest/index.html',
            type: 'documentation'
          }
        ]
      },
      {
        title_en: 'Observability and Fleet Management',
        title_es: 'Observabilidad y gestión de flotas',
        content_en: `## Key Concepts
- Monitor edge fleets with remote logging, health checks, and secure telemetry.
- Deliver over-the-air updates and rollback strategies using open-source tooling.
- Implement security practices including device attestation and encrypted channels.

## Deep Dive
Keeping an edge fleet healthy requires observability and discipline. We configure lightweight agents that stream metrics via MQTT, aggregate logs with Fluent Bit, and analyze anomalies centrally. The lesson explores OTA update frameworks, blue/green rollouts, and incident response. We also address security fundamentals, from key rotation to physical tamper detection.

## Practice Sprint
You will set up a fleet management prototype using Balena or FleetDM, push an updated model artifact, observe metrics, and validate rollback behavior when anomalies are detected.

## Reflection Checklist
- How quickly can you detect and isolate a failing device?
- What is the rollback plan if an update bricks part of the fleet?
- How will you prove data in transit is encrypted end-to-end?
`,
        content_es: `## Conceptos clave
- Monitorear flotas de borde con registros remotos, comprobaciones de salud y telemetría segura.
- Entregar actualizaciones OTA y estrategias de reversión con herramientas open source.
- Implementar prácticas de seguridad como atestación de dispositivos y canales cifrados.

## Profundización
Mantener saludable una flota en el borde exige observabilidad y disciplina. Configuramos agentes ligeros que envían métricas por MQTT, agregamos logs con Fluent Bit y analizamos anomalías desde un centro. La lección explora marcos de actualización OTA, despliegues azul/verde y respuesta a incidentes. También abordamos fundamentos de seguridad, desde rotación de llaves hasta detección de manipulación física.

## Sprint práctico
Configurarás un prototipo de gestión de flota con Balena o FleetDM, publicarás un artefacto de modelo actualizado, observarás métricas y validarás el comportamiento de reversión cuando se detecten anomalías.

## Lista de verificación
- ¿Qué tan rápido puedes detectar y aislar un dispositivo defectuoso?
- ¿Cuál es el plan de reversión si una actualización inutiliza parte de la flota?
- ¿Cómo demostrarás que los datos en tránsito están cifrados de extremo a extremo?
`,
        estimated_minutes: 40,
        resources: [
          {
            title: 'Balena Documentation',
            url: 'https://www.balena.io/docs/',
            type: 'documentation'
          },
          {
            title: 'MQTT Essentials Guide',
            url: 'https://www.hivemq.com/mqtt-essentials/',
            type: 'article'
          }
        ]
      }
    ]
  },
  {
    slug: 'ai-product-management',
    title_en: 'AI Product Management Playbook',
    title_es: 'Manual de gestión de producto en IA',
    description_en:
      'Lead AI initiatives from discovery to launch with rigorous opportunity sizing, experimentation, and lifecycle management.',
    description_es:
      'Lidera iniciativas de IA desde el descubrimiento hasta el lanzamiento con dimensionamiento riguroso, experimentación y gestión del ciclo de vida.',
    difficulty: 'beginner',
    category: 'product-strategy',
    topics: ['product-discovery', 'experimentation', 'metrics', 'lifecycle'],
    modules: [
      {
        title_en: 'Opportunity Discovery and Use Case Selection',
        title_es: 'Descubrimiento de oportunidades y selección de casos de uso',
        content_en: `## Key Concepts
- Evaluate AI opportunities using value, feasibility, and responsible AI lenses.
- Build user journeys and personas that reveal where intelligence adds value.
- Prioritize roadmaps with discovery experiments and quick validation loops.

## Deep Dive
AI product management starts with picking the right problems. We combine qualitative research, analytics, and cost modeling to score opportunities. The lesson shows how to map jobs-to-be-done, identify automation or augmentation moments, and align stakeholders on hypotheses before writing a single prompt or model spec.

## Practice Sprint
You will produce an opportunity assessment canvas for a new AI feature, including customer insights, success metrics, and guardrails.

## Reflection Checklist
- Does the opportunity align with company strategy and responsible AI principles?
- What human workflows will change once the feature ships?
- How will you validate demand before investing in full development?
`,
        content_es: `## Conceptos clave
- Evaluar oportunidades de IA considerando valor, factibilidad y responsabilidad.
- Construir journeys y personas que revelen dónde la inteligencia aporta valor.
- Priorizar hojas de ruta con experimentos de descubrimiento y ciclos rápidos de validación.

## Profundización
La gestión de producto en IA comienza eligiendo los problemas adecuados. Combinamos investigación cualitativa, analítica y modelos de costo para puntuar oportunidades. La lección muestra cómo mapear jobs-to-be-done, identificar momentos de automatización o aumento y alinear a los stakeholders en hipótesis antes de escribir un prompt o especificación de modelo.

## Sprint práctico
Elaborarás un lienzo de evaluación de oportunidades para una nueva funcionalidad de IA, incluyendo insights de clientes, métricas de éxito y guardias.

## Lista de verificación
- ¿La oportunidad se alinea con la estrategia de la empresa y con la IA responsable?
- ¿Qué flujos humanos cambiarán cuando se lance la función?
- ¿Cómo validarás la demanda antes de invertir en desarrollo completo?
`,
        estimated_minutes: 35,
        resources: [
          {
            title: 'Google AI Adoption Framework',
            url: 'https://services.google.com/fh/files/misc/ai_adoption_framework.pdf',
            type: 'documentation'
          },
          {
            title: 'Jobs-to-be-Done Framework Overview',
            url: 'https://www.intercom.com/blog/jobs-to-be-done-framework/',
            type: 'article'
          }
        ]
      },
      {
        title_en: 'Experimentation and Metrics',
        title_es: 'Experimentación y métricas',
        content_en: `## Key Concepts
- Define north star metrics, guardrail metrics, and qualitative success signals.
- Design experiment plans: offline evaluation, A/B tests, interleaving, and sandbox pilots.
- Collaborate with data science and engineering to instrument telemetry.

## Deep Dive
Measuring AI experiences requires rigor. We outline how to choose metrics that reflect user value, set thresholds for safety, and design experiment ladders that start offline before exposing users. The lesson demonstrates analytic dashboards, human evaluation workflows, and how to communicate trade-offs to leadership.

## Practice Sprint
You will design an experimentation plan for the selected opportunity, including metric formulas, sample size estimates, and a decision framework for rolling forward or back.

## Reflection Checklist
- Which metrics risk being gamed by the system?
- Who signs off on experiment results before escalation?
- How will you combine quantitative and qualitative feedback?
`,
        content_es: `## Conceptos clave
- Definir métricas faro, métricas guardián y señales cualitativas de éxito.
- Diseñar planes de experimentación: evaluación offline, tests A/B, interleaving y pilotos controlados.
- Colaborar con ciencia de datos e ingeniería para instrumentar telemetría.

## Profundización
Medir experiencias de IA requiere rigor. Detallamos cómo elegir métricas que reflejen valor para el usuario, establecer umbrales de seguridad y diseñar escaleras de experimentos que comienzan offline antes de exponer usuarios reales. La lección muestra tableros analíticos, flujos de evaluación humana y cómo comunicar compromisos a la dirección.

## Sprint práctico
Diseñarás un plan de experimentación para la oportunidad seleccionada, incluyendo fórmulas de métricas, estimaciones de tamaño de muestra y un marco de decisión para avanzar o retroceder.

## Lista de verificación
- ¿Qué métricas podrían ser manipuladas por el sistema?
- ¿Quién aprueba los resultados del experimento antes de escalar?
- ¿Cómo combinarás retroalimentación cuantitativa y cualitativa?
`,
        estimated_minutes: 35,
        resources: [
          {
            title: 'Understanding ML Experiments',
            url: 'https://ai.googleblog.com/2019/07/understanding-ml-experiments.html',
            type: 'article'
          },
          {
            title: 'Microsoft Responsible AI Concepts',
            url: 'https://learn.microsoft.com/en-us/azure/machine-learning/concept-responsible-ai',
            type: 'documentation'
          }
        ]
      },
      {
        title_en: 'Launch and Lifecycle Management',
        title_es: 'Lanzamiento y gestión del ciclo de vida',
        content_en: `## Key Concepts
- Plan launch readiness across support, marketing, legal, and operations.
- Manage lifecycle activities: post-launch reviews, iteration cadences, and sunsetting.
- Communicate updates transparently to customers and internal teams.

## Deep Dive
Shipping an AI capability is the beginning, not the end. We build launch checklists, define feedback loops, and plan steady-state ownership. The lesson covers playbooks for rolling out to beta cohorts, documenting known limitations, and setting up continuous learning channels with customer success and research.

## Practice Sprint
You will craft a launch and lifecycle plan that includes enablement assets, escalation paths, and an iteration roadmap for the first 90 days.

## Reflection Checklist
- Are all support teams trained to handle AI-specific questions?
- How will you update documentation as the model or prompts evolve?
- What criteria determine when to sunset or graduate the feature?
`,
        content_es: `## Conceptos clave
- Planear la preparación de lanzamiento entre soporte, marketing, legal y operaciones.
- Gestionar actividades del ciclo de vida: revisiones post-lanzamiento, cadencias de iteración y clausura.
- Comunicar actualizaciones con transparencia a clientes y equipos internos.

## Profundización
Lanzar una capacidad de IA es el inicio, no el final. Construimos listas de verificación de lanzamiento, definimos bucles de retroalimentación y planificamos la propiedad en estado estable. La lección cubre playbooks para lanzar en cohortes beta, documentar limitaciones conocidas y establecer canales de aprendizaje continuo con customer success e investigación.

## Sprint práctico
Redactarás un plan de lanzamiento y ciclo de vida que incluya materiales de habilitación, rutas de escalamiento y una hoja de ruta de iteraciones para los primeros 90 días.

## Lista de verificación
- ¿Todos los equipos de soporte están capacitados para responder preguntas específicas de IA?
- ¿Cómo actualizarás la documentación cuando evolucionen el modelo o los prompts?
- ¿Qué criterios determinan cuándo cerrar o graduar la funcionalidad?
`,
        estimated_minutes: 35,
        resources: [
          {
            title: 'Product Launch Plan Checklist',
            url: 'https://www.intercom.com/blog/product-launch-plan/',
            type: 'article'
          },
          {
            title: 'OpenAI System Card Template',
            url: 'https://openai.com/research/system-card',
            type: 'article'
          }
        ]
      }
    ]
  }
];

function computeDuration(course: SeedCourse): number {
  return course.modules.reduce((total, module) => total + module.estimated_minutes, 0);
}

async function main(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase environment variables are missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const summary = { inserted: 0, skipped: 0, failed: 0 };

  for (const course of sampleCourses) {
    const durationMinutes = computeDuration(course);

    const { data: existing, error: existingError } = await supabase
      .from('courses')
      .select('id')
      .eq('title_en', course.title_en)
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error(`❌ Failed to check existing course "${course.title_en}":`, existingError.message);
      summary.failed += 1;
      continue;
    }

    if (existing) {
      console.log(`⏭️  Skipping "${course.title_en}" because it already exists (id=${existing.id}).`);
      summary.skipped += 1;
      continue;
    }

    console.log(`\n🚀 Seeding course: ${course.title_en}`);

    const { data: insertedCourse, error: insertError } = await supabase
      .from('courses')
      .insert({
        title_en: course.title_en,
        title_es: course.title_es,
        description_en: course.description_en,
        description_es: course.description_es,
        difficulty: course.difficulty,
        category: course.category,
        duration_minutes: durationMinutes,
        topics: course.topics,
        ai_generated: false,
        generation_prompt: 'seed-script/manual-curation',
        status: 'published',
        published_at: new Date().toISOString(),
        view_count: 0,
        enrollment_count: 0,
        rating_avg: 0,
        completion_rate: 0
      })
      .select('id')
      .single();

    if (insertError || !insertedCourse) {
      console.error(`❌ Failed to insert course "${course.title_en}":`, insertError?.message ?? 'Unknown error');
      summary.failed += 1;
      continue;
    }

    console.log(`   ✅ Course created with id=${insertedCourse.id}. Inserting modules...`);

    let moduleIndex = 0;
    let moduleFailed = false;

    for (const courseModule of course.modules) {
      const { error: moduleError } = await supabase
        .from('course_modules')
        .insert({
          course_id: insertedCourse.id,
          order_index: moduleIndex,
          title_en: courseModule.title_en,
          title_es: courseModule.title_es,
          content_en: courseModule.content_en,
          content_es: courseModule.content_es,
          type: 'text',
          estimated_time: courseModule.estimated_minutes,
          resources: courseModule.resources
        })
        .select('id')
        .single();

      if (moduleError) {
        console.error(`   ❌ Failed to insert module "${courseModule.title_en}":`, moduleError.message);
        moduleFailed = true;
        break;
      }

      console.log(`   ➕ Module ${moduleIndex + 1}/${course.modules.length} inserted.`);
      moduleIndex += 1;
    }

    if (moduleFailed) {
      summary.failed += 1;
      console.warn(`   ⚠️ Course "${course.title_en}" inserted without all modules. Please review manually.`);
      continue;
    }

    summary.inserted += 1;
    console.log(`   🎉 Completed seeding "${course.title_en}" with ${course.modules.length} modules.`);
  }

  console.log('\n==============================');
  console.log('Seeding summary:');
  console.log(`  ✅ Inserted: ${summary.inserted}`);
  console.log(`  ⏭️  Skipped: ${summary.skipped}`);
  console.log(`  ❌ Failed: ${summary.failed}`);
  console.log('==============================');
}

main().catch((error) => {
  console.error('Fatal error while seeding courses:', error);
  process.exit(1);
});
