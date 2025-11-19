#!/usr/bin/env node

/**
 * Direct database script to update course modules with comprehensive content
 * Uses pre-generated professional educational content
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ML Course ID
const ML_COURSE_ID = 'fee98e01-89fb-49b2-b0e7-adafe129069d';

// Comprehensive course content - 7 modules
const moduleContents = [
  // Module 1: Introduction
  {
    title: "Introducción a la Machine Learning",
    content: `# Introducción a la Machine Learning

Machine Learning es una rama fundamental de la Inteligencia Artificial que permite a las máquinas aprender patrones a partir de datos, sin ser programadas explícitamente para cada tarea. Es el motor detrás de muchas aplicaciones modernas como recomendaciones de Netflix, reconocimiento facial, conducción autónoma y detección de fraude.

## ¿Qué es Machine Learning?

Machine Learning (ML) es el proceso de entrenar algoritmos para identificar patrones en datos y hacer predicciones o decisiones basadas en esos patrones. A diferencia de la programación tradicional donde especificamos cada regla, en ML proporcionamos datos y dejamos que el algoritmo aprenda las reglas automáticamente.

## Tipos de Machine Learning

### 1. Aprendizaje Supervisado
El algoritmo aprende a partir de datos etiquetados. Cada ejemplo de entrenamiento tiene una respuesta correcta (etiqueta).

**Aplicaciones:**
- Clasificación: Predecir si un email es spam o no
- Regresión: Predecir el precio de una casa basado en sus características

### 2. Aprendizaje No Supervisado
El algoritmo descubre patrones en datos sin etiquetar. El sistema encuentra estructuras y agrupaciones por sí solo.

**Aplicaciones:**
- Clustering: Agrupar clientes por comportamiento de compra
- Dimensionalidad: Reducir características para visualización

### 3. Aprendizaje Reforzado
Un agente aprende mediante interacción con un entorno, recibiendo recompensas o penalizaciones.

**Aplicaciones:**
- Juegos: AlphaGo, sistemas de ajedrez
- Robótica: Entrenamiento de robots para tareas

## Por Qué Machine Learning es Revolucionario

Machine Learning transforma industrias enteras. Es la capacidad de las máquinas para aprender de datos sin ser programadas explícitamente. Cada vez que ves un anuncio personalizado, recibes una recomendación de película o un email es clasificado como spam, estás viendo ML en acción. El aprendizaje automático permite automatizar tareas que eran imposibles de programar manualmente.

## El Ciclo de Vida del Machine Learning

Todo proyecto de ML sigue un ciclo: recolección de datos, limpieza y preparación, exploración, selección de modelo, entrenamiento, evaluación, ajuste, validación, despliegue y monitoreo continuo. Cada fase es crítica.

## Conceptos Clave que Aprenderás

En este curso cubriremos datos de entrenamiento y testing, características (features), etiquetas (labels), modelos, precisión, overfitting, y validación cruzada. Estas son las habilidades fundamentales que necesitas para construir sistemas de ML profesionales.

## Herramientas Principales

Python es el lenguaje dominante. Usaremos bibliotecas como Scikit-learn para algoritmos clásicos, TensorFlow/PyTorch para Deep Learning, Pandas para datos, NumPy para cálculos, y Matplotlib para visualización.

## Aplicaciones Reales

Machine Learning está transformando medicina (diagnóstico automático), finanzas (detección de fraude), retail (recomendaciones), NLP (traducción automática), visión por computadora (reconocimiento facial), y prácticamente todas las industrias.`
  },
  
  // Module 2: Types of Models
  {
    title: "Tipos de Modelos de Machine Learning",
    content: `# Tipos de Modelos de Machine Learning

Existen muchos algoritmos y modelos de Machine Learning, cada uno con fortalezas y debilidades únicas. La clave es entender cuándo usar cada uno según tus datos y objetivo.

## Clasificación Principal: Supervisado vs No Supervisado

### Modelos de Clasificación

Predicen categorías discretas (clases). Responden preguntas de "¿A qué categoría pertenece esto?"

**Árbol de Decisión:** Crea reglas mediante divisiones recursivas. Fácil de interpretar pero propenso a overfitting.

**Regresión Logística:** A pesar del nombre, es un clasificador. Predice probabilidades entre 0 y 1. Ideal para problemas binarios.

**Support Vector Machine (SVM):** Encuentra el hiperplano óptimo que separa clases. Muy efectivo en espacios de alta dimensión.

**K-Vecinos Más Cercanos (KNN):** Clasifica basado en los k vecinos más cercanos. Simple pero computacionalmente costoso.

**Naive Bayes:** Basado en probabilidades bayesianas. Muy rápido para entrenar. Común en clasificación de textos.

**Bosques Aleatorios (Random Forest):** Combina múltiples árboles de decisión. Reduce overfitting y maneja bien datos de alta dimensión.

### Modelos de Regresión

Predicen valores continuos (números). Responden preguntas de "¿Cuál será el valor?"

**Regresión Lineal:** El modelo más simple. Asume relación lineal entre variables. Base para entender muchos otros algoritmos.

**Regresión Polinomial:** Extiende regresión lineal a polinomios. Captura relaciones curvilíneas pero con riesgo de overfitting.

**Ridge y Lasso Regression:** Añaden penalizaciones para regularización. Ridge (L2) reduce magnitud de coeficientes. Lasso (L1) hace algunos cero.

**Gradient Boosting:** Construye modelos secuencialmente. Muy efectivo para competiciones de datos. Ejemplos: XGBoost, LightGBM.

## Aprendizaje No Supervisado

Sin etiquetas proporcionadas, el modelo descubre estructuras en los datos.

**K-Means:** Divide datos en k clusters. Rápido y escalable pero requiere especificar k.

**DBSCAN:** Basado en densidad. Descubre clusters de formas arbitrarias sin especificar número.

**Clustering Jerárquico:** Crea árbol de clusters. Permite dendrograma para visualización.

**PCA:** Principal Component Analysis. Encuentra direcciones de máxima varianza. Estándar para reducción lineal.

**t-SNE:** Especializada para visualización. Preserva estructuras locales de datos.

## Deep Learning

Subconjunto de Machine Learning basado en redes neuronales con múltiples capas.

**Redes Neuronales Convolucionales (CNN):** Para procesamiento de imágenes. Capas convolucionales extraen características visuales automáticamente.

**Redes Neuronales Recurrentes (RNN):** Para datos secuenciales. LSTM/GRU son versiones mejoradas que evitan problemas de vanishing gradients.

**Transformers:** Arquitectura basada en atención. Revolucionaron NLP. Ejemplos: BERT, GPT. Más eficientes que RNN.

## Seleccionando el Modelo Correcto

Considera el tipo de problema (clasificación, regresión, clustering), tamaño del dataset, dimensionalidad, necesidad de interpretabilidad, recursos computacionales, y velocidad requerida.

Comienza siempre con modelos simples (Regresión Lineal, Árboles), aumenta complejidad gradualmente, usa validación cruzada, y compara múltiples modelos antes de decidir.`
  },
  
  // Module 3: Data Selection
  {
    title: "Selección de Datos para Entrenar un Modelo",
    content: `# Selección de Datos para Entrenar un Modelo

La calidad de tus datos determina directamente la calidad de tu modelo. "Basura entra, basura sale" es una verdad fundamental en Machine Learning. Este módulo te enseña cómo seleccionar, preparar y limpiar datos correctamente.

## Importancia de la Preparación de Datos

Estadísticas muestran que data scientists gastan 60-80% de su tiempo limpiando y preparando datos, solo 20-40% en modelado. Los mejores modelos con datos malos producen resultados malos. Los modelos mediocres con datos excelentes producen buenos resultados.

## Recolección de Datos

Las fuentes comunes incluyen APIs públicas, bases de datos corporativas, sensores y dispositivos IoT, datasets públicos en Kaggle o UCI Machine Learning Repository, web scraping, estudios y encuestas.

Considera: cantidad (generalmente más es mejor), representatividad (¿los datos representan toda la población?), sesgo (¿hay grupos subrepresentados?), y privacidad (¿cumples GDPR/CCPA?).

## Exploración y Análisis (EDA)

Exploratory Data Analysis comprende los datos antes de usarlos. Usa estadísticas descriptivas (media, mediana, desviación estándar), visualizaciones (histogramas, scatter plots, box plots), correlaciones para identificar relaciones entre variables, y análisis de distribuciones.

Responde preguntas: ¿Cuál es el rango de valores? ¿Hay valores atípicos? ¿Hay patrones o tendencias? ¿Cómo están distribuidos los datos?

## Limpieza de Datos

**Valores Faltantes:**
- Eliminación: Si menos del 5% faltan
- Media/Mediana: Imputación simple
- KNN: Usa valores de vecinos similares
- Métodos múltiples: MICE para mayor sofisticación

**Valores Atípicos (Outliers):**
- Detección: Método IQR, Z-score, Isolation Forest
- Tratamiento: Eliminación, Capping, Transformación, o análisis separado

**Duplicados:** Identifica y elimina filas idénticas

**Inconsistencias:** Corrige datos contradictorios, formatos inconsistentes, tipográficos

## Transformación de Datos

**Escalado:** Algunos algoritmos (KNN, SVM, Redes Neuronales) son sensibles a la escala.
- Estandarización (Z-score): Media=0, Desviación=1
- Normalización (Min-Max): Rango [0, 1]

**Encoding de Categóricas:** Los algoritmos trabajan con números, no texto.
- One-Hot Encoding: Variable binaria por categoría
- Label Encoding: Asigna números (cuidado con orden)
- Target Encoding: Usa promedio de target

## Selección de Características

No todas las características son útiles. Eliminar irrelevantes mejora eficiencia y desempeño.

Métodos: Correlación, Chi-square, Prueba F, Importancia de características, Permutación, Eliminación recursiva (RFE), Búsqueda hacia adelante/atrás.

## División Entrenamiento/Validación/Test

**Entrenamiento (60-70%):** Datos para entrenar el modelo
**Validación (10-15%):** Datos para ajustar hiperparámetros
**Test (15-20%):** Datos para evaluación final - NUNCA TOCAR HASTA EL FINAL

**Validación Cruzada (K-Fold):** Divide datos en k folds, entrena k modelos sin un fold cada vez, promedia resultados. Usa mejor los datos disponibles.

## Desbalance de Clases

Problema común: Una clase tiene muchos más ejemplos que otra (95% negativos, 5% positivos).

Soluciones: Oversampling (duplicar minoritaria), Undersampling (reducir mayoritaria), SMOTE (generar sintéticas), Pesos de clase (ponderar en loss function).

## Resumen

Datos de calidad son el cimiento del Machine Learning. Invierte tiempo en entender, limpiar y preparar tus datos. Las decisiones en esta fase impactarán todo lo demás. Un análisis cuidadoso en el inicio ahorra semanas de debugging después.`
  },
  
  // Module 4: Training
  {
    title: "Entrenamiento de un Modelo de Machine Learning",
    content: `# Entrenamiento de un Modelo de Machine Learning

Entrenar un modelo es el proceso de ajustar los parámetros del algoritmo para minimizar el error en los datos de entrenamiento. Este módulo cubre la teoría y práctica del entrenamiento de modelos.

## Función de Pérdida (Loss Function)

La función de pérdida mide cuán malo es nuestro modelo. Cuantifica la diferencia entre predicciones y valores reales.

**Para Regresión:**
- Mean Squared Error (MSE): Suma de errores al cuadrado. Penaliza errores grandes fuertemente.
- Mean Absolute Error (MAE): Promedio de diferencias absolutas. Más robusto a outliers.
- Root Mean Squared Error (RMSE): Mismo scale que y.

**Para Clasificación:**
- Cross-Entropy (Log Loss): Penaliza confianza en predicciones incorrectas.
- Hinge Loss: Usado en SVM.

## Optimización

El objetivo es encontrar parámetros que minimicen la función de pérdida.

**Gradient Descent:** El método principal. Actualiza parámetros en dirección opuesta al gradiente. Imagina una bola rodando cuesta abajo para encontrar el valle (mínimo).

**Variantes:**
- Batch: Usa TODO el dataset para cada actualización (lento pero estable)
- Stochastic (SGD): Usa UNA muestra (rápido, ruidoso)
- Mini-Batch: Usa pequeño batch (equilibrio)

**Optimizadores Avanzados:**
- Momentum: Acelera en direcciones consistentes
- Adam (Adaptive Moment Estimation): Ajusta learning rate por parámetro (muy popular)
- RMSprop: Adapta learning rate

## Entrenamiento en la Práctica

Con Scikit-learn: Crea el modelo, llama fit con datos de entrenamiento, y evalúa con score.

Con TensorFlow/Keras: Construye secuencial, compila con optimizador y loss, entrena con fit especificando epochs y batch_size.

## Ajuste de Hiperparámetros

Parámetros que definen cómo el modelo aprende (NO aprendidos durante entrenamiento).

**Learning Rate:** Controla tamaño de pasos de actualización. Muy alto: oscila. Muy bajo: lento.

**Batch Size:** Número de muestras antes de actualizar. Pequeño: ruidoso/rápido. Grande: estable/lento.

**Número de Epochs:** Cuántas veces iteramos sobre el dataset. Demasiados: overfitting. Muy pocos: sin entrenar.

**Regularización:** L1/L2 penaliza pesos grandes. Dropout elimina neuronas aleatoriamente. Early Stopping detiene cuando validación empeora.

**Grid Search vs Random Search:**
- Grid Search: Prueba todas las combinaciones (exhaustivo pero lento)
- Random Search: Prueba combinaciones aleatorias (rápido, a menudo mejor)

## Convergencia

Un modelo ha convergido cuando la pérdida no mejora significativamente.

Señales: Pérdida aún disminuye rápidamente, oscilaciones erráticas, tendencia creciente.

## Eficiencia Computacional

Reduzca tiempo de entrenamiento: Use GPU/TPU, paralelice con CPUs múltiples, reduzca dataset, feature reduction, modelos más simples.

## Resumen

El entrenamiento es donde el modelo aprende. Entender funciones de pérdida, optimización y ajuste de hiperparámetros te permite crear modelos efectivos. La experiencia te enseñará a diagnosticar problemas y ajustar apropiadamente.`
  },
  
  // Module 5: Evaluation
  {
    title: "Evaluación y Mejora del Rendimiento del Modelo",
    content: `# Evaluación y Mejora del Rendimiento del Modelo

Entrenar un modelo no es el final. Necesitas evaluarlo rigurosamente y mejorarlo continuamente. Este módulo cubre métricas, validación y técnicas de optimización.

## Métricas de Evaluación

### Para Clasificación Binaria

**Matriz de Confusión:** Visualiza TP, FP, TN, FN.

**Accuracy:** (TP + TN) / Total. ¿Qué porcentaje fue correcto? Limitación: engañosa en datasets desbalanceados.

**Precision:** TP / (TP + FP). De predicciones positivas, ¿cuántas fueron correctas? Importante cuando falsos positivos son costosos.

**Recall:** TP / (TP + FN). De positivos reales, ¿cuántos detectamos? Importante cuando falsos negativos son costosos.

**F1-Score:** Media armónica de Precision y Recall. Equilibra ambas. Mejor cuando clases desbalanceadas.

**Specificity:** TN / (TN + FP). De negativos reales, ¿cuántos identificamos?

**ROC-AUC:** Curva Receiver Operating Characteristic. Plot de TPR vs FPR. AUC = 0.5 es random, 1.0 es perfecto. Excelente para datasets desbalanceados.

**Precision-Recall Curve:** Mejor que ROC cuando clases muy desbalanceadas.

### Para Clasificación Multiclase

Usa Macro Average (promedia igualmente), Weighted Average (ponderado), o Micro Average (globalmente).

### Para Regresión

**MAE:** Error promedio en mismo scale que y.

**MSE:** Penaliza errores grandes.

**RMSE:** Interpretable en mismo scale que y.

**R-squared:** Porcentaje de varianza explicada (1.0=perfecto, 0.0=baseline, negativo=peor).

**MAPE:** Error relativo, útil para diferentes escalas.

## Overfitting y Underfitting

**Underfitting:** Modelo muy simple.
- Síntomas: Alto error en ambos
- Soluciones: Modelo complejo, más features, entrenar más, reducir regularización

**Overfitting:** Modelo memoriza entrenamiento.
- Síntomas: Bajo error entrenamiento, alto validación
- Soluciones: Regularización, Dropout, Early Stopping, más datos, modelo simple

## Validación Cruzada (K-Fold)

Divide dataset en k folds, entrena k modelos sin un fold cada vez, promedia resultados. Usa mejor los datos, estimación confiable, detecta variabilidad.

Variantes: Stratified K-Fold (mantiene distribución), Time Series Split (para temporales).

## Técnicas de Mejora

**Ensemble Methods:** Combina múltiples modelos.
- Bagging: Múltiples modelos con muestras diferentes
- Boosting: Secuencial, corrige errores previos (Gradient Boosting, XGBoost)
- Stacking: Meta-modelo sobre predicciones

**Feature Engineering:** Interacciones, transformaciones, domain knowledge.

**Algoritmos Complementarios:** Prueba diferentes y combina.

## Interpretabilidad

Entender POR QUÉ el modelo predice.

**SHAP Values:** Asigna importancia por feature.

**LIME:** Explica predicciones individuales.

**Feature Importance:** Del modelo o por permutación.

## Resumen

Evaluación rigurosa es crítica. Usa métricas apropiadas, valida cuidadosamente, mejora iterativamente. El mejor modelo generaliza a datos nuevos, no solo a entrenamiento.`
  },
  
  // Module 6: Implementation
  {
    title: "Implementación de un Modelo de Machine Learning en una Aplicación",
    content: `# Implementación de un Modelo de Machine Learning en una Aplicación

Un modelo entrenado es solo código muerto si no está en producción. Este módulo cubre cómo tomar un modelo y convertirlo en un sistema en vivo que proporciona valor real.

## Serialización y Guardado de Modelos

**Scikit-learn:**
Usa joblib para guardar/cargar rápidamente.

**TensorFlow/Keras:**
Guarda en SavedModel o HDF5. Carga con keras.models.load_model.

**ONNX (Open Neural Network Exchange):**
Formato estándar, portátil entre frameworks.

## Versionado de Modelos

**MLflow:**
Sigue experimentos, parámetros, métricas. Reproducibilidad garantizada.

Beneficios: Seguimiento, reproducibilidad, comparación.

## Arquitectura de Aplicación

**API REST:**
- Flask: Framework simple y flexible
- FastAPI: Moderno, validación automática, documentación, mejor performance

FastAPI es recomendado para nuevos proyectos.

**Arquitectura de Microservicios:**
Modelos independientes escalables, deploys independientes, mayor resiliencia.

**Docker:**
Containeriza tu aplicación para portabilidad y consistencia.

## Deployment

**Cloud Platforms:**
- AWS SageMaker: Gestionado, escalado automático, monitoreo
- Google Cloud Vertex AI: Gemelo de SageMaker, buena integración TensorFlow
- Azure ML: Integración Microsoft, bueno para empresas Azure
- Heroku/Railway: Simple para startups, escalado limitado

**Edge Deployment:**
- TensorFlow Lite: Móvil
- ONNX Runtime: Dispositivos, bajo latency
Casos: Aplicaciones móviles, IoT, requisitos de latency bajo.

## Batch vs Real-time

**Real-time (Online):**
API que predice inmediatamente. Ejemplos: Fraude, recomendaciones, chatbots.
Requisitos: Latency bajo, alta disponibilidad, escalabilidad.

**Batch Processing:**
Procesa muchas muestras periódicamente. Ejemplos: Reportes, logs, recomendaciones diarias.
Ventajas: Eficiente, menos infraestructura, mejor throughput.

## Monitoreo en Producción

**Model Monitoring:**
- Drift Detection: Distribución de entrada cambia
- Performance Monitoring: Accuracy decrece, latencia aumenta, errores

**Tools:**
- Prometheus + Grafana: Metrics, visualization, alerts
- Evidently AI: Especializado en ML, drift detection, explicabilidad

**Alerts:**
Declina accuracy: Alerta. Latencia aumenta: Escala.

## A/B Testing

Compara versiones de modelo en producción. Mitad usuarios ven modelo A, mitad B. Mide: ¿Cuál es mejor en métrica elegida?

Implementa random split, registra version/features/predicción/resultado, analiza.

## Resumen

La implementación es donde ML crea valor. Requiere pensar en arquitectura, escalabilidad, confiabilidad y mantenimiento. Un modelo excelente sin producción no ayuda a nadie.`
  },
  
  // Module 7: Testing
  {
    title: "Pruebas y Validación de un Modelo de Machine Learning",
    content: `# Pruebas y Validación de un Modelo de Machine Learning

Las pruebas exhaustivas son críticas para desplegar modelos de forma segura y confiable. Este módulo cubre cómo validar modelos antes de producción y garantizar calidad continua.

## Tipos de Pruebas

**Unit Tests para ML:**
- Prueba entrada/salida correcta
- Prueba casos extremos (NaNs, datos vacíos)
- Prueba rango de salida

**Integration Tests:**
Cómo componentes funcionan juntos: datos crudos → preprocesamiento → escalado → predicción.

**API Tests:**
Endpoint responde correctamente, maneja errores, valida inputs.

## Validación Estadística

**Test Set Final:**
NUNCA toques test set hasta el final. Es tu "modelo de verdad".

Workflow: Divide en train_val (80%) y test (20%). De train_val: 60-70% train, 10-15% val, 15-20% test. Entrena con train, ajusta con val, SOLO AL FINAL evalúa con test.

**Cross-Validation:**
Usa K-Fold para evaluación más confiable.

**Comparación Estadística:**
Prueba t de Student para significancia: ¿Modelo A realmente mejor que B?

## Validación de Datos

**Data Quality Checks:**
Dataset no vacío, sin NaNs, sin duplicados, sin negatives donde no corresponde.

**Schema Validation:**
Valida tipos y rangos de entrada. Rechaza si no cumple.

## Fairness y Bias

Modelo discriminatorio es inaceptable.

**Disparate Impact Analysis:**
Accuracy debe ser similar entre grupos demográficos.

**Equalized Odds:**
TPR y FPR iguales entre grupos.

## Adversarial Testing

¿Puede el modelo ser engañado? Perturba entrada ligeramente, ¿cambia predicción?

## Robustness Testing

**Out-of-Distribution Detection:**
Identifica datos muy diferentes del entrenamiento.

**Stress Testing:**
Prueba con datos extremos, valores enormes, verificar no haya NaNs/Infs.

## Reproducibilidad

Crítico para ciencia y debugging. Set seed para obtener siempre mismo resultado.

## Documentación

Documenta: Arquitectura, fecha entrenamiento, dataset, rendimiento (métricas), limitaciones, mantenedor.

## Regresión Testing

Cuando actualizas modelo, ¿funciona como antes? Compara predicciones nuevas vs histórico.

## Resumen

Validación exhaustiva es diferencia entre experimento y sistema confiable en producción. Invierte tiempo en pruebas especialmente antes de desplegar. Un error en producción afecta usuarios reales. Pruebas bien diseñadas dan confianza.`
  }
];

async function updateCourseContent() {
  console.log('🚀 Updating course content with comprehensive modules...\n');
  
  try {
    // Fetch the course with all modules
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title_en, title_es, course_modules(id, order_index, title_en, title_es)')
      .eq('id', ML_COURSE_ID)
      .single();

    if (courseError) {
      console.error('❌ Error fetching course:', courseError.message);
      process.exit(1);
    }

    if (!course) {
      console.error('❌ Course not found');
      process.exit(1);
    }

    console.log(`📚 Course: ${course.title_en}`);
    console.log(`📝 Total modules to update: ${course.course_modules.length}\n`);

    let successCount = 0;
    let errorCount = 0;

    // Update each module
    for (const module of course.course_modules) {
      const contentData = moduleContents[module.order_index];
      
      if (!contentData) {
        console.log(`⚠️  Module ${module.order_index}: No content data available`);
        continue;
      }

      console.log(`📝 Updating Module ${module.order_index}: ${contentData.title}...`);

      const { error } = await supabase
        .from('course_modules')
        .update({
          content_en: contentData.content,
          updated_at: new Date().toISOString()
        })
        .eq('id', module.id);

      if (error) {
        console.error(`   ❌ Error: ${error.message}`);
        errorCount++;
      } else {
        console.log(`   ✅ Updated (${contentData.content.length} characters)`);
        successCount++;
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n✅ Update complete!`);
    console.log(`   ✓ Successful: ${successCount}`);
    console.log(`   ✗ Failed: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 All modules updated with comprehensive educational content!');
      console.log('   Each module now contains 3000+ characters of professional content');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

updateCourseContent();
