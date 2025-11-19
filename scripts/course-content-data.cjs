// Pre-generated comprehensive ML course content
// This will be used to populate the course modules with real, substantive content

const courseContent = {
  modules: [
    {
      title: "Introducción a la Machine Learning",
      index: 1,
      content: `# Introducción a la Machine Learning

Machine Learning es una rama fundamental de la Inteligencia Artificial que permite a las máquinas aprender patrones a partir de datos, sin ser programadas explícitamente para cada tarea. Es el motor detrás de muchas aplicaciones modernas como recomendaciones de Netflix, reconocimiento facial, conducción autónoma y detección de fraude.

## ¿Qué es Machine Learning?

Machine Learning (ML) es el proceso de entrenar algoritmos para identificar patrones en datos y hacer predicciones o decisiones basadas en esos patrones. A diferencia de la programación tradicional donde especificamos cada regla, en ML proporcionamos datos y dejamos que el algoritmo aprenda las reglas automáticamente.

### Paradigma Tradicional vs Machine Learning

**Programación Tradicional:**
- Entrada: Datos + Reglas → Salida: Respuestas

**Machine Learning:**
- Entrada: Datos + Respuestas → Aprendizaje: Reglas/Patrones

## Tipos de Machine Learning

### 1. Aprendizaje Supervisado
El algoritmo aprende a partir de datos etiquetados. Cada ejemplo de entrenamiento tiene una respuesta correcta (etiqueta).

**Aplicaciones:**
- Clasificación: Predecir si un email es spam o no
- Regresión: Predecir el precio de una casa basado en sus características

**Ejemplos:** Árboles de decisión, Regresión Lineal, Redes Neuronales, SVM

### 2. Aprendizaje No Supervisado
El algoritmo descubre patrones en datos sin etiquetar. El sistema encuentra estructuras y agrupaciones por sí solo.

**Aplicaciones:**
- Clustering: Agrupar clientes por comportamiento de compra
- Dimensionalidad: Reducir características para visualización

**Ejemplos:** K-means, PCA, Clustering Jerárquico

### 3. Aprendizaje Reforzado
Un agente aprende mediante interacción con un entorno, recibiendo recompensas o penalizaciones.

**Aplicaciones:**
- Juegos: AlphaGo, sistemas de ajedrez
- Robótica: Entrenamiento de robots para tareas
- Conducción autónoma

## Por Qué Machine Learning es Revolucionario

1. **Automatización:** Procesos que eran imposibles automatizar manualmente
2. **Escalabilidad:** Sistemas que mejoran con más datos
3. **Adaptabilidad:** Modelos que se actualizan con nuevos datos
4. **Insights:** Descubrir patrones ocultos en datos grandes
5. **Precisión:** Sistemas que superan el desempeño humano

## El Ciclo de Vida del Machine Learning

1. **Recolección de Datos:** Obtener datos relevantes y de calidad
2. **Limpieza y Preparación:** Preprocesar y limpiar los datos
3. **Exploración:** Entender los datos mediante análisis
4. **Selección de Modelo:** Elegir el algoritmo apropiado
5. **Entrenamiento:** Entrenar el modelo con los datos
6. **Evaluación:** Medir el desempeño del modelo
7. **Ajuste:** Optimizar hiperparámetros
8. **Validación:** Probar en datos nuevos
9. **Despliegue:** Poner el modelo en producción
10. **Monitoreo:** Vigilar el desempeño continuo

## Conceptos Clave que Aprenderás

- **Datos de Entrenamiento y Testing:** Cómo dividir datos
- **Características (Features):** Variables de entrada
- **Etiquetas (Labels):** Variables de salida
- **Modelo:** La representación matemática de patrones
- **Precisión (Accuracy):** Qué tan correcto es el modelo
- **Overfitting:** Cuando el modelo memoriza en lugar de generalizar
- **Validación Cruzada:** Técnica para evaluar modelos

## Herramientas y Lenguajes Principales

- **Python:** El lenguaje dominante en ML
- **Scikit-learn:** Librería para algoritmos clásicos
- **TensorFlow/PyTorch:** Para Deep Learning
- **Pandas:** Manipulación de datos
- **NumPy:** Cálculos numéricos
- **Matplotlib/Seaborn:** Visualización

## Aplicaciones Reales de Machine Learning

- **Diagnóstico Médico:** Detectar enfermedades en imágenes
- **Finanzas:** Detección de fraude y predicción de mercado
- **E-commerce:** Recomendaciones personalizadas
- **Procesamiento de Lenguaje Natural:** Traducción automática, chatbots
- **Visión por Computadora:** Reconocimiento facial, conducción autónoma
- **Recursos Humanos:** Análisis de datos de empleados

## Resumen

Machine Learning es la capacidad de las máquinas para aprender de los datos sin ser programadas explícitamente. Transformará tu forma de resolver problemas complejos y te abrirá puertas a carreras emocionantes en tecnología. En este curso, construiremos las habilidades fundamentales que necesitas para ser un profesional de ML competente.`
    },
    {
      title: "Tipos de Modelos de Machine Learning",
      index: 2,
      content: `# Tipos de Modelos de Machine Learning

Existen muchos algoritmos y modelos de Machine Learning, cada uno con fortalezas y debilidades únicas. La clave es entender cuándo usar cada uno. En este módulo, exploraremos los principales tipos de modelos y cómo se clasifican.

## Clasificación Principal: Supervisado vs No Supervisado

### Aprendizaje Supervisado

El aprendizaje supervisado usa datos etiquetados para entrenar modelos. Proporcionamos ejemplos con respuestas correctas y el modelo aprende a mapear entradas a salidas.

#### Modelos de Clasificación

Predicen categorías discretas (clases). Responden preguntas de "¿A qué categoría pertenece esto?"

**Árbol de Decisión:**
- Crea reglas mediante divisiones recursivas
- Fácil de interpretar
- Propenso a overfitting

**Regresión Logística:**
- A pesar del nombre, es un clasificador
- Predice probabilidades entre 0 y 1
- Ideal para problemas binarios (dos clases)

**Support Vector Machine (SVM):**
- Encuentra el hiperplano óptimo que separa clases
- Muy efectivo en espacios de alta dimensión
- Sensible al escalado de datos

**K-Vecinos Más Cercanos (KNN):**
- Clasifica basado en los k vecinos más cercanos
- Simple pero computacionalmente costoso
- Requiere escalado de características

**Naive Bayes:**
- Basado en probabilidades bayesianas
- Muy rápido para entrenar
- Común en clasificación de textos

**Bosques Aleatorios (Random Forest):**
- Combina múltiples árboles de decisión
- Reduce overfitting
- Maneja bien datos de alta dimensión
- Interpreta importancia de características

#### Modelos de Regresión

Predicen valores continuos (números). Responden preguntas de "¿Cuál será el valor?"

**Regresión Lineal:**
- El modelo más simple
- Asume relación lineal entre variables
- Base para entender muchos otros algoritmos
- Fórmula: y = mx + b

**Regresión Polinomial:**
- Extiende regresión lineal a polinomios
- Captura relaciones curvilíneas
- Riesgo de overfitting

**Ridge y Lasso Regression:**
- Añaden penalizaciones para regularización
- Ridge (L2): Reduce magnitud de coeficientes
- Lasso (L1): Algunos coeficientes se hacen cero

**Gradient Boosting:**
- Construye modelos secuencialmente
- Muy efectivo para competiciones de datos
- Ejemplos: XGBoost, LightGBM

### Aprendizaje No Supervisado

Sin etiquetas proporcionadas, el modelo descubre estructuras en los datos.

#### Clustering (Agrupamiento)

Agrupa datos similares juntos.

**K-Means:**
- Divide datos en k clusters
- Rápido y escalable
- Requiere especificar k de antemano

**DBSCAN:**
- Basado en densidad
- Descubre clusters de formas arbitrarias
- No requiere especificar número de clusters

**Clustering Jerárquico:**
- Crea árbol de clusters
- Dendrograma para visualización
- Computacionalmente más costoso

**Gaussian Mixture Models (GMM):**
- Probabilístico
- Proporciona probabilidades de pertenencia
- Más flexible que K-means

#### Reducción de Dimensionalidad

Reduce número de características mientras preserva información.

**Principal Component Analysis (PCA):**
- Encuentra direcciones de máxima varianza
- Estándar para reducción lineal
- Útil para visualización

**t-SNE:**
- Especializada para visualización
- Preserva estructuras locales
- No es determinística

**Autoencoder:**
- Red neuronal para reducción no lineal
- Aprender representación comprimida
- Base para muchas aplicaciones modernas

### Aprendizaje Reforzado

El agente aprende mediante prueba y error con recompensas.

**Q-Learning:**
- Aprende valor de acciones
- Base para Deep Q-Networks
- Aplicaciones: Juegos, robótica

**Policy Gradient:**
- Aprende política directamente
- Actor-Critic methods
- Más stable que Q-learning en espacios continuos

## Deep Learning (Aprendizaje Profundo)

Subconjunto de Machine Learning basado en redes neuronales.

### Redes Neuronales Convolucionales (CNN)
- Para procesamiento de imágenes
- Capas convolucionales extraen características
- Aplicaciones: Reconocimiento facial, diagnóstico médico

### Redes Neuronales Recurrentes (RNN)
- Para datos secuenciales
- Memoria de pasos anteriores
- LSTM/GRU: Versiones mejoradas que evitan vanishing gradients
- Aplicaciones: NLP, series temporales

### Transformers
- Arquitectura basada en atención
- Revolutionaron NLP
- Ejemplos: BERT, GPT
- Más eficientes que RNN

## Seleccionando el Modelo Correcto

**Considera:**
1. Tipo de problema (clasificación, regresión, clustering)
2. Tamaño del dataset
3. Dimensionalidad de datos
4. Necesidad de interpretabilidad
5. Recursos computacionales disponibles
6. Velocidad requerida

**Reglas generales:**
- Comienza con modelos simples (Regresión Lineal, Árboles)
- Aumenta complejidad gradualmente
- Usa validación cruzada
- Compara múltiples modelos

## Resumen

Machine Learning ofrece un arsenal de herramientas para diferentes problemas. No existe "el mejor" modelo universalmente - depende de tus datos y objetivo. La experiencia te enseñará a elegir el modelo apropiado rápidamente. En próximos módulos, aprenderemos a implementar estos modelos en práctica.`
    },
    {
      title: "Selección de Datos para Entrenar un Modelo",
      index: 3,
      content: `# Selección de Datos para Entrenar un Modelo

La calidad de tus datos determina directamente la calidad de tu modelo. "Basura entra, basura sale" es una verdad fundamental en Machine Learning. Este módulo te enseña cómo seleccionar, preparar y limpiar datos correctamente.

## Importancia de la Preparación de Datos

Estadísticas muestran que data scientists gastan 60-80% de su tiempo limpiando y preparando datos, solo 20-40% en modelado. Los mejores modelos con datos malos producen resultados malos. Los modelos mediocres con datos excelentes producen buenos resultados.

## Fases de Preparación de Datos

### 1. Recolección de Datos

**Fuentes comunes:**
- APIs públicas
- Bases de datos corporativas
- Sensores y dispositivos IoT
- Datasets públicos (Kaggle, UCI Machine Learning Repository)
- Web scraping
- Estudios y encuestas

**Consideraciones:**
- Cantidad: ¿Cuántos datos necesitas? Generalmente, más datos es mejor
- Representatividad: ¿Los datos representan toda la población?
- Sesgo: ¿Hay grupos subrepresentados?
- Privacidad: ¿Cumples regulaciones (GDPR, CCPA)?

### 2. Exploración y Análisis (EDA)

Exploratory Data Analysis comprende los datos antes de usarlos.

**Técnicas:**
- **Estadísticas Descriptivas:** Media, mediana, desviación estándar
- **Visualizaciones:** Histogramas, scatter plots, box plots
- **Correlaciones:** Identificar relaciones entre variables
- **Distribuciones:** Entender cómo se distribuyen los datos

**Preguntas a responder:**
- ¿Cuál es el rango de valores?
- ¿Hay valores atípicos (outliers)?
- ¿Hay patrones o tendencias?
- ¿Cómo están distribuidos los datos?

### 3. Limpieza de Datos

**Valores Faltantes (Missing Values):**

Existen tres estrategias principales:

*Eliminación:*
- Elimina filas o columnas con muchos valores faltantes
- Fácil pero pierde información
- Use si < 5% de datos faltan

*Imputación Simple:*
- Media: Reemplaza con el promedio
- Mediana: Robusto a outliers
- Moda: Para datos categóricos
- Último valor válido: Para series temporales

*Imputación Avanzada:*
- K-Nearest Neighbors: Usa valores de vecinos similares
- Regresión: Predice valores faltantes
- Métodos múltiples: MICE (Multiple Imputation by Chained Equations)

**Valores Atípicos (Outliers):**

Outliers son valores extremadamente diferentes del resto.

*Detección:*
- Método IQR: Valores fuera de [Q1-1.5*IQR, Q3+1.5*IQR]
- Z-score: Valores con |z| > 3
- Isolation Forest: Algoritmo específico para outliers

*Tratamiento:*
- Eliminación: Si son errores o muy raros
- Capping: Limitar a un umbral
- Transformación: Log o raíz cuadrada
- Análisis separado: A veces son información valiosa

**Duplicados:**
- Identifica y elimina filas idénticas
- Considera duplicados parciales (mismo ID diferente datos)

**Inconsistencias:**
- Datos contradictorios (edad = 200)
- Formato inconsistente ("01-02-2023" vs "1/2/2023")
- Tipográficos ("Machine Laerning" vs "Machine Learning")

### 4. Transformación de Datos

**Escalado (Normalization):**

Algunos algoritmos (KNN, SVM, Redes Neuronales) son sensibles a la escala.

*Estandarización (Z-score):*
Resultado: Media=0, Desviación=1
x_scaled = (x - mean) / std_dev

*Normalización (Min-Max):*
Resultado: Rango [0, 1]
x_scaled = (x - min) / (max - min)

**Encoding de Variables Categóricas:**

Los algoritmos trabajan con números, no texto.

*One-Hot Encoding:*
- Crea variable binaria para cada categoría
- Ideal para categorías limitadas

*Label Encoding:*
- Asigna números: [rojo=0, verde=1, azul=2]
- Cuidado: Algoritmo podría asumir orden

*Target Encoding:*
- Usa promedio de target por categoría
- Muy efectivo pero riesgo de overfitting

### 5. Selección de Características (Feature Selection)

No todas las características son útiles. Eliminar irrelevantes mejora eficiencia y desempeño.

**Métodos Estadísticos:**
- Correlación: Elimina características poco correlacionadas con target
- Chi-square: Para datos categóricos
- Prueba F: Para regresión

**Métodos de Modelo:**
- Importancia de características: Del modelo entrenado
- Permutación: Mide degradación al permutar
- Basados en coeficientes: De modelos lineales

**Métodos de Selección:**
- Eliminación recursiva (RFE)
- Búsqueda hacia adelante
- Búsqueda hacia atrás
- Búsqueda exhaustiva (computacionalmente costosa)

## División Entrenamiento/Validación/Test

**Entrenamiento (60-70%):** Datos para entrenar el modelo
**Validación (10-15%):** Datos para ajustar hiperparámetros
**Test (15-20%):** Datos para evaluación final - NO TOCAR HASTA EL FINAL

**Validación Cruzada (K-Fold):**
- Divide datos en k folds
- Entrena k modelos, cada uno sin un fold
- Promedia resultados
- Usa mejor datos disponibles

## Desbalance de Clases

Problema común en clasificación: Una clase tiene muchos más ejemplos que otra (ej. 95% negativos, 5% positivos).

**Soluciones:**
- Oversampling: Duplica clase minoritaria
- Undersampling: Reduce clase mayoritaria
- SMOTE: Genera muestras sintéticas
- Pesos de clase: Pondera clases en loss function

## Resumen

Datos de calidad son el cimiento del Machine Learning. Invierte tiempo en entender, limpiar y preparar tus datos. Las decisiones en esta fase impactarán todo lo demás. Un análisis cuidadoso en el inicio ahorra semanas de debugging más adelante.`
    },
    {
      title: "Entrenamiento de un Modelo de Machine Learning",
      index: 4,
      content: `# Entrenamiento de un Modelo de Machine Learning

Entrenar un modelo es el proceso de ajustar los parámetros del algoritmo para minimizar el error en los datos de entrenamiento. Este módulo cubre la teoría y práctica del entrenamiento de modelos.

## Conceptos Fundamentales

### Función de Pérdida (Loss Function)

La función de pérdida mide cuán malo es nuestro modelo. Cuantifica la diferencia entre predicciones y valores reales.

**Para Regresión:**
- **Mean Squared Error (MSE):** Suma de errores al cuadrado
  ```
  MSE = (1/n) * Σ(y_true - y_pred)²
  ```
  Penaliza errores grandes fuertemente

- **Mean Absolute Error (MAE):** Promedio de diferencias absolutas
  ```
  MAE = (1/n) * Σ|y_true - y_pred|
  ```
  Más robusto a outliers

- **Root Mean Squared Error (RMSE):**
  ```
  RMSE = √MSE
  ```
  Mismas unidades que y

**Para Clasificación:**
- **Cross-Entropy (Log Loss):** Penaliza confianza en predicciones incorrectas
  ```
  Loss = -Σ y_true * log(y_pred)
  ```

- **Hinge Loss:** Usado en SVM

### Optimización

El objetivo es encontrar parámetros que minimicen la función de pérdida.

**Gradient Descent:**

El método principal para optimización en ML. Actualiza parámetros en dirección opuesta al gradiente.

```
θ_nuevo = θ_viejo - learning_rate * ∂Loss/∂θ
```

Visualización: Imagina una bola rodando cuesta abajo para encontrar el valle (mínimo).

**Variantes:**

*Batch Gradient Descent:*
- Usa TODO el dataset para cada actualización
- Lento pero estable

*Stochastic Gradient Descent (SGD):*
- Usa UNA muestra para cada actualización
- Rápido, ruidoso, puede salir de mínimos locales

*Mini-Batch Gradient Descent:*
- Usa un pequeño batch (32-256 muestras)
- Equilibrio entre velocidad y estabilidad
- Estándar en Deep Learning

**Optimizadores Avanzados:**

*Momentum:*
- Acelera en direcciones consistentes
- Ralentiza cambios de dirección erráticos

*Adam (Adaptive Moment Estimation):*
- Ajusta learning rate por parámetro
- Combina ventajas de RMSprop y Momentum
- Muy popular en Deep Learning

*RMSprop:*
- Adapta learning rate
- Efectivo para redes neuronales

## Entrenamiento en la Práctica

### Usando Scikit-learn

```python
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split

# Dividir datos
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Crear y entrenar modelo
modelo = RandomForestRegressor(n_estimators=100)
modelo.fit(X_train, y_train)

# Evaluar
score = modelo.score(X_test, y_test)
```

### Usando TensorFlow/Keras

```python
from tensorflow import keras

# Construir red neuronal
modelo = keras.Sequential([
    keras.layers.Dense(128, activation='relu', input_shape=(784,)),
    keras.layers.Dropout(0.2),
    keras.layers.Dense(64, activation='relu'),
    keras.layers.Dense(10, activation='softmax')
])

# Compilar
modelo.compile(
    optimizer='adam',
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

# Entrenar
historia = modelo.fit(
    X_train, y_train,
    epochs=10,
    batch_size=32,
    validation_split=0.2
)
```

## Ajuste de Hiperparámetros

Parámetros que definen cómo el modelo aprende (NO aprendidos durante entrenamiento).

**Learning Rate:**
- Controla el tamaño de los pasos de actualización
- Muy alto: Oscila sin converger
- Muy bajo: Entrena lentamente
- Típicamente: 0.001 - 0.1

**Batch Size:**
- Número de muestras antes de actualizar
- Pequeño: Ruidoso, rápido
- Grande: Estable, necesita más memoria

**Número de Epochs:**
- Cuántas veces iteramos sobre el dataset completo
- Demasiados: Overfitting
- Muy pocos: Modelo sin entrenar

**Regularización:**
- L1/L2: Penaliza pesos grandes
- Dropout: Elimina neuronas aleatoriamente
- Early Stopping: Para cuando validación empeora

**Grid Search vs Random Search:**

*Grid Search:* Prueba todas las combinaciones - exhaustivo pero lento

*Random Search:* Prueba combinaciones aleatorias - más rápido, a menudo mejor

## Convergencia

Un modelo ha convergido cuando la pérdida no mejora significativamente en iteraciones adicionales.

**Señales de no convergencia:**
- Pérdida aún disminuye rápidamente
- Oscilaciones erráticas
- Tendencia creciente

## Eficiencia Computacional

**Reduzca tiempo de entrenamiento:**
- Use GPU/TPU (TensorFlow, PyTorch)
- Paralelize con múltiples CPUs
- Reduzca dataset (sampling)
- Feature reduction
- Modelos más simples

## Resumen

El entrenamiento es donde el modelo aprende. Entender funciones de pérdida, optimización y ajuste de hiperparámetros te permite crear modelos efectivos. La experiencia te enseñará a diagnosticar problemas de entrenamiento y ajustar apropiadamente.`
    },
    {
      title: "Evaluación y Mejora del Rendimiento del Modelo",
      index: 5,
      content: `# Evaluación y Mejora del Rendimiento del Modelo

Entrenar un modelo no es el final. Necesitas evaluarlo rigurosamente y mejorarlo continuamente. Este módulo cubre métricas, validación y técnicas de optimización.

## Métricas de Evaluación

### Para Clasificación Binaria

**Matriz de Confusión:**
```
              Predicho Positivo | Predicho Negativo
Actual Positivo        TP       |        FN
Actual Negativo        FP       |        TN
```

TP = True Positive (correcto positivo)
FP = False Positive (incorrecto positivo)
TN = True Negative (correcto negativo)
FN = False Negative (incorrecto negativo)

**Accuracy (Precisión General):**
```
Accuracy = (TP + TN) / (TP + TN + FP + FN)
```
¿Qué porcentaje de predicciones fue correcto?

**Limitación:** En datasets desbalanceados es engañosa

**Precision (Precisión Positiva):**
```
Precision = TP / (TP + FP)
```
De todas las predicciones positivas, ¿cuántas fueron correctas?
- Importante cuando falsos positivos son costosos (diagnóstico médico)

**Recall (Sensibilidad):**
```
Recall = TP / (TP + FN)
```
De todos los positivos reales, ¿cuántos detectamos?
- Importante cuando falsos negativos son costosos (detección de fraude)

**F1-Score:**
```
F1 = 2 * (Precision * Recall) / (Precision + Recall)
```
Media armónica de Precision y Recall
- Equilibra ambas métricas
- Mejor cuando clases desbalanceadas

**Specificity (Especificidad):**
```
Specificity = TN / (TN + FP)
```
De todos los negativos reales, ¿cuántos identificamos correctamente?

**ROC-AUC:**
- Curva Receiver Operating Characteristic
- Plot de True Positive Rate vs False Positive Rate
- AUC = Área bajo la curva
- 0.5 = Random, 1.0 = Perfecto
- Excelente para datasets desbalanceados

**Precision-Recall Curve:**
- Plot de Precision vs Recall
- Mejor que ROC cuando clases muy desbalanceadas
- AUPRC = Área bajo la curva

### Para Clasificación Multiclase

**Macro Average:** Promedia métricas de cada clase igualmente
**Weighted Average:** Promedia ponderado por número de muestras
**Micro Average:** Calcula TP/FP/TN/FN globalmente

### Para Regresión

**Mean Absolute Error (MAE):**
```
MAE = (1/n) * Σ|y_true - y_pred|
```
Error promedio en mismo scale que y

**Mean Squared Error (MSE):**
MSE = (1/n) * Σ(y_true - y_pred)²
Penaliza errores grandes

**Root Mean Squared Error (RMSE):**
```
RMSE = √MSE
```
Interpretable en mismo scale que y

**R-squared (R²):**
```
R² = 1 - (SS_res / SS_tot)
```
Porcentaje de varianza explicada
- 1.0 = Perfecto
- 0.0 = Tan bueno como baseline
- Negativo = Peor que baseline

**Mean Absolute Percentage Error (MAPE):**
```
MAPE = (100/n) * Σ|y_true - y_pred| / |y_true|
```
Error relativo, útil para diferentes escalas

## Overfitting y Underfitting

### Underfitting (Subajuste)

El modelo es demasiado simple para los datos.

**Síntomas:**
- Alto error en entrenamiento
- Alto error en validación
- Pérdida decrece lentamente

**Soluciones:**
- Modelo más complejo
- Más características
- Entrenar más iteraciones
- Reducir regularización

### Overfitting (Sobreajuste)

El modelo memoriza entrenamiento en lugar de generalizar.

**Síntomas:**
- Bajo error en entrenamiento
- Alto error en validación
- Gran diferencia entre ambos

**Soluciones:**
- Regularización (L1, L2)
- Dropout (en redes neuronales)
- Early stopping
- Más datos de entrenamiento
- Modelo más simple
- Validación cruzada

## Validación Cruzada (K-Fold)

Técnica para evaluar modelos con datasets limitados.

```
1. Divide dataset en k folds (típicamente k=5)
2. Para cada fold:
   - Usa fold como test
   - Usa otros k-1 como entrenamiento
   - Entrena y evalúa
3. Promedia resultados
```

**Ventajas:**
- Usa mejor los datos disponibles
- Estimación más confiable
- Detecta variabilidad

**Variantes:**
- Stratified K-Fold: Mantiene distribución de clases
- Time Series Split: Para datos temporales

## Técnicas de Mejora

### 1. Ensemble Methods

Combinar múltiples modelos para mejor desempeño.

**Bagging:**
- Entrena múltiples modelos con muestras diferentes
- Promedia predicciones
- Ejemplo: Random Forest

**Boosting:**
- Entrena secuencialmente, enfocando en errores previos
- Cada modelo corrige débilidades anteriores
- Ejemplos: Gradient Boosting, AdaBoost, XGBoost

**Stacking:**
- Entrena meta-modelo sobre predicciones de modelos base
- Aprende cómo combinar mejor

### 2. Feature Engineering Avanzado

**Interacciones:**
- Crear nuevas características de combinaciones

**Transformaciones:**
- Log, exponencial, polinomial
- Binning: Convertir continuas a categóricas

**Domain Knowledge:**
- Características basadas en expertos
- A menudo más efectivas

### 3. Algoritmos Complementarios

Probar diferentes algoritmos y combinar:
- Decisión trees + Neural networks
- Lineal + no lineal
- Interpretable + complejo

## Interpretabilidad y Explicabilidad

Entender POR QUÉ el modelo hace predicciones.

**SHAP Values:**
- Asigna importancia a cada feature por predicción
- Matemáticamente riguroso

**LIME (Local Interpretable Model-agnostic Explanations):**
- Aproxima modelo localmente con modelo interpretable
- Explica predicciones individuales

**Feature Importance:**
- Del modelo (árboles, modelos lineales)
- Por permutación
- Por ablación

## Resumen

Evaluación rigurosa es crítica para ML responsable. Usa métricas apropiadas para tu problema, valida cuidadosamente, y mejora iterativamente. El mejor modelo no es el más complejo, es el que generaliza mejor a datos nuevos.`
    },
    {
      title: "Implementación de un Modelo de Machine Learning en una Aplicación",
      index: 6,
      content: `# Implementación de un Modelo de Machine Learning en una Aplicación

Un modelo entrenado es solo código muerto si no está en producción. Este módulo cubre cómo tomar un modelo y convertirlo en un sistema en vivo que proporciona valor real.

## Serialización y Guardado de Modelos

### Guardando Modelos

**Scikit-learn:**
```python
import joblib

# Guardar
joblib.dump(modelo, 'mi_modelo.pkl')

# Cargar
modelo_cargado = joblib.load('mi_modelo.pkl')
```

**TensorFlow/Keras:**
```python
# Guardar en formato SavedModel
modelo.save('mi_modelo')

# Guardar en HDF5
modelo.save('mi_modelo.h5')

# Cargar
modelo = keras.models.load_model('mi_modelo')
```

**ONNX (Open Neural Network Exchange):**
```python
import onnx
import skl2onnx

# Convertir modelo de scikit-learn a ONNX
initial_type = [('float_input', FloatTensorType([None, 4]))]
onx = skl2onnx.convert_sklearn(modelo, initial_types=initial_type)
onnx.save_model(onx, "modelo.onnx")
```

### Versionado de Modelos

**MLflow:**
```python
import mlflow

with mlflow.start_run():
    mlflow.log_param("learning_rate", 0.01)
    mlflow.log_metric("accuracy", 0.95)
    mlflow.sklearn.log_model(modelo, "modelo")
```

Beneficios:
- Seguimiento de experimentos
- Reproducibilidad
- Comparación de versiones

## Arquitectura de Aplicación

### API REST

**Flask:**
```python
from flask import Flask, request, jsonify
import joblib

app = Flask(__name__)
modelo = joblib.load('modelo.pkl')

@app.route('/predict', methods=['POST'])
def predict():
    datos = request.json['features']
    prediccion = modelo.predict([datos])
    return jsonify({'prediccion': prediccion[0]})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

**FastAPI:**
```python
from fastapi import FastAPI
from pydantic import BaseModel
import joblib

app = FastAPI()
modelo = joblib.load('modelo.pkl')

class PredictRequest(BaseModel):
    features: list[float]

@app.post("/predict")
def predict(request: PredictRequest):
    prediccion = modelo.predict([request.features])
    return {"prediccion": float(prediccion[0])}
```

FastAPI es más moderno: validación automática, documentación, mejor performance.

### Arquitectura de Microservicios

```
┌─────────────────────────────────────────┐
│         Frontend (React/Vue)            │
├─────────────────────────────────────────┤
│              API Gateway                │
├──────────┬──────────┬──────────────────┤
│ Model A  │ Model B  │  Data Service    │
│ (FastAPI)│(FastAPI) │  (Database)      │
└──────────┴──────────┴──────────────────┘
```

Ventajas:
- Escalabilidad independiente
- Deploys independientes
- Resilencia

### Containerización (Docker)

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY modelo.pkl .
COPY app.py .

EXPOSE 5000
CMD ["python", "app.py"]
```

Build: `docker build -t ml-app .`
Run: `docker run -p 5000:5000 ml-app`

## Deployment

### Cloud Platforms

**AWS SageMaker:**
- Servicio gestionado de ML
- Hosting automático
- Escalado automático
- Monitoreo integrado

**Google Cloud Vertex AI:**
- Gemelos de AWS SageMaker
- Buena integración con TensorFlow
- AutoML capabilities

**Azure ML:**
- Integración con ecosistema Microsoft
- Buena para empresas con Azure existente

**Heroku / Railway (Startups):**
- Deployment simple
- Gratis/bajo costo
- Escalado limitado

### Edge Deployment

**TensorFlow Lite:**
```python
# Convertir para mobile
converter = tf.lite.TFLiteConverter.from_saved_model('modelo')
tflite_model = converter.convert()
```

**ONNX Runtime:**
- Ejecutar modelos ONNX en edge devices
- Bajo latency
- Bajo consumo de recursos

Casos de uso:
- Aplicaciones móviles
- Dispositivos IoT
- Requisitos de latency bajo

## Batch Processing vs Real-time

### Real-time (Online)

API que predice inmediatamente.

Ejemplos:
- Detección de fraude en transacciones
- Recomendaciones en tiempo real
- Chatbots

Requisitos:
- Latency bajo (< 100ms típicamente)
- Alta disponibilidad
- Escalabilidad

### Batch Processing

Procesa muchas muestras juntas periódicamente.

Ejemplos:
- Reportes diarios
- Procesamiento de logs
- Recomendaciones personalizadas diarias

Ventajas:
- Más eficiente
- Menos requisitos de infraestructura
- Mejor throughput

```python
# Batch prediction con pandas
datos = pd.read_csv('datos_grandes.csv')
predicciones = modelo.predict(datos)
datos['prediccion'] = predicciones
datos.to_csv('resultados.csv')
```

## Monitoreo en Producción

### Model Monitoring

**Drift Detection:**
```python
# Distribuición de entrada cambia
X_train_mean = X_train.mean()
X_current_mean = X_current.mean()
drift = abs(X_current_mean - X_train_mean) > threshold
```

**Performance Monitoring:**
- Accuracy decrece con tiempo
- Latencia aumenta
- Errores en API

### Tools

**Prometheus + Grafana:**
- Metrics collection
- Visualization
- Alertas

**Evidently AI:**
- Especializado en ML monitoring
- Data drift detection
- Explicabilidad

### Alerts

```python
if accuracy < threshold:
    enviar_alerta("Accuracy degraded")
    
if latencia > max_latencia:
    escalar_recursos()
```

## A/B Testing

Comparar versiones de modelo en producción.

```python
import random

def predecir(features):
    if random.random() < 0.5:
        # Modelo A (control)
        return modelo_a.predict(features)
    else:
        # Modelo B (experimento)
        return modelo_b.predict(features)

# Registra: version, features, predicción, resultado real
```

Analiza: ¿Cuál tiene mejor métrica?

## Resumen

La implementación es donde ML crea valor. Requiere pensar en arquitectura, escalabilidad, confiabilidad y mantenimiento. Un modelo excelente en notebook sin producción no ayuda a nadie.`
    },
    {
      title: "Pruebas y Validación de un Modelo de Machine Learning",
      index: 7,
      content: `# Pruebas y Validación de un Modelo de Machine Learning

Las pruebas exhaustivas son críticas para desplegar modelos de forma segura y confiable. Este módulo cubre cómo validar modelos antes de producción y garantizar calidad continua.

## Tipos de Pruebas

### Unit Tests para ML

**Test de Entrada/Salida:**
```python
def test_modelo_shape():
    X = np.random.randn(10, 4)
    y = modelo.predict(X)
    assert y.shape == (10,)
    
def test_modelo_rango():
    X = np.random.randn(10, 4)
    y = modelo.predict(X)
    assert (y >= 0).all() and (y <= 1).all()
```

**Test de Casos Edge:**
```python
def test_nans():
    X_con_nans = np.array([[1, np.nan, 3, 4]])
    # Debe manejar gracefully
    y = modelo.predict(X_con_nans)
    assert not np.isnan(y[0])

def test_datos_vacios():
    X_vacio = np.empty((0, 4))
    y = modelo.predict(X_vacio)
    assert y.shape == (0,)
```

### Integration Tests

Prueba cómo componentes funcionan juntos.

```python
def test_pipeline_completo():
    # Datos crudos
    datos_crudos = {"edad": "25", "salario": "50000"}
    
    # Preprocesamiento
    datos_limpios = limpiar_datos(datos_crudos)
    
    # Escalado
    datos_escalados = escalador.transform(datos_limpios)
    
    # Predicción
    predicción = modelo.predict(datos_escalados)
    
    assert isinstance(predicción, (int, float))
    assert predicción >= 0
```

### API Tests

```python
def test_endpoint_predict():
    response = client.post("/predict", json={
        "features": [1.0, 2.0, 3.0, 4.0]
    })
    assert response.status_code == 200
    assert "prediccion" in response.json()
    
def test_endpoint_error():
    response = client.post("/predict", json={
        "features": [1, 2]  # Número incorrecto
    })
    assert response.status_code == 400
```

## Validación Estadística

### Test Set Final

NUNCA toques el test set hasta el final. Es tu "modelo de verdad".

```python
# Workflow correcto
X_train_val, X_test, y_train_val, y_test = train_test_split(X, y, 0.8)
X_train, X_val, y_train, y_val = train_test_split(X_train_val, y_train_val, 0.75)

# Entrena con X_train
# Ajusta con X_val
# SOLO AL FINAL evalúa con X_test
```

### Cross-Validation

```python
from sklearn.model_selection import cross_val_score

scores = cross_val_score(modelo, X, y, cv=5, scoring='accuracy')
print(f"Mean: {scores.mean():.3f} (+/- {scores.std():.3f})")
```

Resultado: 0.950 (+/- 0.025) significa scores entre 0.925 y 0.975

### Comparación Estadística

**Prueba t de Student:**
```python
from scipy import stats

# ¿Modelo A es significativamente mejor que B?
t_stat, p_value = stats.ttest_ind(scores_a, scores_b)
if p_value < 0.05:
    print("Diferencia estadísticamente significativa")
```

## Validación de Datos

### Data Quality Checks

```python
def validar_datos(df):
    assert df.shape[0] > 0, "Dataset vacío"
    assert df.isnull().sum().sum() == 0, "Hay valores faltantes"
    assert (df < 0).sum().sum() == 0, "Valores negativos en features"
    assert df.duplicated().sum() == 0, "Datos duplicados"
    return True
```

### Schema Validation

```python
from pydantic import BaseModel

class DatosEntrada(BaseModel):
    edad: int
    ingreso: float
    experiencia: int
    
    class Config:
        json_schema_extra = {
            "example": {"edad": 30, "ingreso": 50000, "experiencia": 5}
        }

# Si no cumple schema, rechaza
datos = DatosEntrada(**entrada_json)
```

## Fairness y Bias

Modelo discriminatorio es inaceptable.

### Disparate Impact Analysis

```python
# Accuracy por grupo demográfico
for grupo in ['A', 'B', 'C']:
    mascara = datos['grupo'] == grupo
    acc = accuracy_score(y[mascara], predictions[mascara])
    print(f"{grupo}: {acc:.3f}")

# Todos deben ser similares
```

### Equalized Odds

```python
# True positive rate igual entre grupos
# False positive rate igual entre grupos
tpr_a = tp_a / (tp_a + fn_a)
tpr_b = tp_b / (tp_b + fn_b)
assert abs(tpr_a - tpr_b) < 0.05
```

## Adversarial Testing

¿Puede el modelo ser engañado?

```python
# Perturba ligeramente entrada
perturbación = 0.1
X_adversarial = X + perturbación * np.random.randn(*X.shape)

# ¿Cambia predicción?
y_original = modelo.predict(X)
y_adversarial = modelo.predict(X_adversarial)

diferencia = np.abs(y_original - y_adversarial).mean()
print(f"Cambio promedio: {diferencia}")
```

## Robustness Testing

### Out-of-Distribution Detection

```python
# Training distribution
X_train_mean = X_train.mean(axis=0)
X_train_std = X_train.std(axis=0)

# Test point
z_score = (x_test - X_train_mean) / X_train_std
if np.abs(z_score).max() > 3:
    print("Dato muy diferente del entrenamiento")
```

### Stress Testing

```python
# Prueba con datos extremos
X_extreme = np.ones((10, 4)) * 1e6
y = modelo.predict(X_extreme)
assert not np.any(np.isnan(y))
assert not np.any(np.isinf(y))
```

## Reproducibilidad

Crítico para ciencia y debugging.

```python
import random
import numpy as np
import tensorflow as tf

def set_seed(seed):
    random.seed(seed)
    np.random.seed(seed)
    tf.random.set_seed(seed)
    
# Siempre obtiene los mismos resultados
set_seed(42)
```

## Documentación

```python
"""
Modelo de detección de fraude

Arquitectura: Random Forest con 100 árboles
Entrenado: 2024-01-15
Dataset: datos_2023.csv (50k muestras)

Rendimiento:
- Accuracy: 0.97
- Precision: 0.96
- Recall: 0.98
- ROC-AUC: 0.985

Limitaciones:
- No generaliza bien a transacciones > $10k
- Sesgo hacia tarjetas de crédito vs débito

Mantener: Juan García (juan@company.com)
"""
```

## Regresión Testing

Cuando actualizas el modelo, ¿funciona como antes?

```python
# Test set histórico
historic_predictions = joblib.load('historic_predictions.pkl')

# Nuevas predicciones
new_predictions = nuevo_modelo.predict(X_test)

# Debe ser similar
assert np.allclose(historic_predictions, new_predictions, rtol=0.01)
```

## Resumen

La validación exhaustiva es la diferencia entre un experimento de notebook y un sistema en producción confiable. Invierte tiempo en pruebas, especialmente antes de desplegar. Un error en producción afecta a usuarios reales. Pruebas bien diseñadas dan confianza en tu modelo.`
    }
  ]
};

module.exports = courseContent;
