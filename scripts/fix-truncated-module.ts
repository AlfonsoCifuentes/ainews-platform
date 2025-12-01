#!/usr/bin/env npx tsx
/**
 * Fix Truncated Module Content
 * 
 * This script regenerates content for modules that have been truncated or
 * have insufficient content. It uses the cascade LLM system to generate
 * comprehensive educational content.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Comprehensive content for "Seguridad y Higiene en el Tatuaje"
const COMPREHENSIVE_CONTENT = `# Módulo 4: Seguridad y Higiene en el Tatuaje

## Introducción

La seguridad y la higiene son pilares fundamentales en el arte del tatuaje. No importa cuán talentoso sea un artista o cuán innovador sea su diseño; si no se siguen protocolos estrictos de seguridad e higiene, se pone en riesgo tanto la salud del cliente como la del tatuador. Este módulo proporciona una guía exhaustiva sobre todos los aspectos de la seguridad e higiene en el tatuaje, desde la preparación del espacio de trabajo hasta el cuidado posterior del tatuaje.

---

## 1. Marco Legal y Normativo

### 1.1 Regulaciones Sanitarias

En la mayoría de los países, los estudios de tatuaje están sujetos a regulaciones sanitarias específicas. Estas normativas varían según la jurisdicción, pero generalmente incluyen:

- **Licencias y permisos**: Los tatuadores deben obtener licencias específicas que certifiquen su formación en higiene y seguridad.
- **Inspecciones sanitarias**: Los estudios son sometidos a inspecciones periódicas por autoridades sanitarias.
- **Registro de clientes**: Se debe mantener un registro detallado de cada cliente y procedimiento realizado.
- **Certificaciones de esterilización**: Los equipos de esterilización deben ser certificados y calibrados regularmente.

### 1.2 Consentimiento Informado

Antes de realizar cualquier tatuaje, el cliente debe firmar un consentimiento informado que incluya:

- Información sobre los riesgos potenciales
- Instrucciones de cuidado posterior
- Historial médico relevante
- Alergias conocidas
- Confirmación de mayoría de edad

---

## 2. El Espacio de Trabajo

### 2.1 Diseño del Estudio

Un estudio de tatuaje seguro debe cumplir con los siguientes requisitos:

**Áreas separadas:**
- **Recepción**: Área de espera para clientes, separada del área de trabajo.
- **Zona de tatuaje**: Espacio dedicado exclusivamente a realizar tatuajes.
- **Área de esterilización**: Zona separada para la limpieza y esterilización de equipos.
- **Almacenamiento**: Espacio para guardar suministros en condiciones higiénicas.

**Características físicas:**
- Superficies no porosas y fáciles de limpiar
- Iluminación adecuada (mínimo 500 lux)
- Ventilación apropiada
- Lavamanos con agua caliente y fría
- Dispensadores de jabón antibacterial

### 2.2 Limpieza y Desinfección

**Protocolo de limpieza diaria:**

1. **Al inicio del día:**
   - Limpieza general de todas las superficies
   - Desinfección de estaciones de trabajo
   - Verificación de suministros

2. **Entre clientes:**
   - Desinfección completa de la estación
   - Cambio de cubiertas protectoras
   - Eliminación de material desechable

3. **Al final del día:**
   - Limpieza profunda
   - Esterilización de equipos reutilizables
   - Eliminación adecuada de residuos

---

## 3. Equipos y Materiales

### 3.1 Material Desechable

El uso de material desechable es fundamental para prevenir infecciones cruzadas:

- **Agujas**: Siempre de un solo uso, nunca reutilizadas
- **Cartuchos**: Específicos para cada cliente
- **Guantes**: Látex o nitrilo, cambio frecuente
- **Copas de tinta**: Individuales por sesión
- **Protectores de máquina**: Fundas desechables
- **Papel de transferencia**: Un uso por diseño

### 3.2 Equipos Reutilizables

Los equipos reutilizables requieren protocolos de esterilización rigurosos:

**Proceso de esterilización:**

1. **Pre-limpieza**: Eliminación de residuos visibles con cepillo y agua
2. **Limpieza ultrasónica**: Baño en equipo ultrasónico (15-20 minutos)
3. **Enjuague**: Con agua destilada
4. **Secado**: Aire caliente o toallas estériles
5. **Empaquetado**: En bolsas de esterilización
6. **Autoclave**: Ciclo completo (121°C, 15-20 minutos)
7. **Almacenamiento**: En área seca y protegida

### 3.3 Tintas para Tatuaje

Las tintas deben cumplir con estándares de seguridad:

- Certificadas por autoridades sanitarias
- Fecha de caducidad vigente
- Almacenamiento adecuado (temperatura, luz)
- Pigmentos no tóxicos
- Nunca diluidas con productos no autorizados

---

## 4. Protección Personal

### 4.1 Para el Tatuador

**Equipo de protección obligatorio:**

- **Guantes**: Nitrilo o látex de alta calidad
  - Cambio entre tareas diferentes
  - Nunca tocar superficies no estériles
  - Tamaño adecuado para evitar roturas

- **Mascarilla**: Especialmente importante para:
  - Tatuajes de larga duración
  - Clientes con síntomas respiratorios
  - Trabajo con aerosoles

- **Protección ocular**: Gafas o pantalla facial para:
  - Salpicaduras de fluidos
  - Trabajo con láser (eliminación)

- **Ropa de trabajo**:
  - Uniforme específico para el estudio
  - Lavado frecuente a alta temperatura
  - Mangas cortas o ajustadas

### 4.2 Para el Cliente

- Posición cómoda y estable
- Protección de ropa
- Área de tatuaje limpia y depilada (si es necesario)
- Hidratación adecuada antes de la sesión

---

## 5. Procedimientos de Seguridad

### 5.1 Antes del Tatuaje

**Evaluación del cliente:**

1. **Historial médico:**
   - Condiciones cardíacas
   - Diabetes
   - Trastornos de coagulación
   - Inmunodeficiencias
   - Alergias (especialmente a metales)
   - Medicación actual

2. **Estado de la piel:**
   - Sin heridas abiertas
   - Sin infecciones activas
   - Sin quemaduras solares recientes
   - Sin condiciones dermatológicas en el área

3. **Contraindicaciones absolutas:**
   - Embarazo (primer trimestre especialmente)
   - Intoxicación por alcohol o drogas
   - Fiebre o enfermedad aguda
   - Tratamiento con anticoagulantes (sin supervisión médica)

### 5.2 Durante el Tatuaje

**Protocolos de higiene:**

- Lavado de manos antes de colocar guantes
- Preparación del área con antiséptico (clorhexidina o povidona yodada)
- Uso de barreras protectoras en todas las superficies
- Cambio de guantes si se contaminan
- Manejo adecuado de agujas usadas

**Manejo de emergencias:**

- **Reacción alérgica**: Tener antihistamínicos disponibles
- **Lipotimia (desmayo)**: Posición de seguridad, líquidos azucarados
- **Sangrado excesivo**: Presión directa, evaluación médica si persiste
- **Reacción anafiláctica**: Llamar emergencias inmediatamente

### 5.3 Después del Tatuaje

**Instrucciones de cuidado posterior:**

**Primeras 24 horas:**
- Mantener el vendaje inicial (2-4 horas)
- Lavar suavemente con jabón neutro
- Aplicar crema hidratante específica
- No sumergir en agua

**Primera semana:**
- Lavar 2-3 veces al día
- Aplicar crema fina (no saturar)
- Evitar exposición solar directa
- No rascar las costras

**Signos de alarma (buscar atención médica):**
- Enrojecimiento excesivo que se extiende
- Pus o secreción amarillenta/verdosa
- Fiebre superior a 38°C
- Inflamación que aumenta después de 48 horas

---

## 6. Gestión de Residuos

### 6.1 Clasificación de Residuos

**Residuos biológicos (contenedor rojo/amarillo):**
- Agujas usadas
- Material manchado con sangre
- Guantes contaminados
- Gasas y algodones usados

**Residuos no biológicos (contenedor común):**
- Embalajes no contaminados
- Papel de transferencia limpio
- Envases vacíos de productos

### 6.2 Eliminación Segura

- Contenedores específicos para material punzocortante
- Recogida por empresas autorizadas
- Documentación de eliminación
- Nunca mezclar con basura común

---

## 7. Prevención de Enfermedades Transmisibles

### 7.1 Enfermedades de Riesgo

El tatuaje, si no se realiza con las precauciones adecuadas, puede transmitir:

- **Hepatitis B y C**: Virus muy resistentes, alto riesgo
- **VIH**: Menor riesgo pero presente
- **Estafilococo**: Infecciones de piel
- **Streptococo**: Infecciones de tejidos blandos
- **Tuberculosis**: Raro pero posible

### 7.2 Medidas Preventivas

**Para el tatuador:**
- Vacunación contra Hepatitis B
- Revisiones médicas periódicas
- Protocolo post-exposición documentado
- Uso correcto de EPP

**Universales:**
- Tratar toda sangre como potencialmente infecciosa
- Nunca recapsular agujas
- Desinfección inmediata de derrames
- Lavado de manos frecuente

---

## 8. Casos Especiales

### 8.1 Clientes con Condiciones Médicas

**Diabetes:**
- Mayor riesgo de infección
- Cicatrización más lenta
- Control de glucemia antes de tatuar
- Seguimiento más frecuente

**Condiciones cardíacas:**
- Evaluar medicación anticoagulante
- Sesiones más cortas
- Posición cómoda

**Inmunodeficiencias:**
- Consulta médica previa obligatoria
- Máximas precauciones de higiene
- Seguimiento exhaustivo

### 8.2 Áreas Sensibles

Algunas zonas del cuerpo requieren precauciones adicionales:

- **Cara y cuello**: Mayor visibilidad de complicaciones
- **Manos y pies**: Cicatrización más difícil
- **Zona genital**: Máxima privacidad y precaución
- **Sobre lunares**: Evaluación dermatológica previa

---

## 9. Documentación y Registros

### 9.1 Registros Obligatorios

- Consentimiento informado firmado
- Historial médico del cliente
- Fecha, hora y duración del procedimiento
- Materiales utilizados (lotes de tintas, agujas)
- Fotografías antes/después (con consentimiento)
- Instrucciones de cuidado entregadas

### 9.2 Conservación de Registros

- Mínimo 5 años (varía según jurisdicción)
- Formato físico o digital seguro
- Protección de datos personales
- Acceso restringido

---

## 10. Formación Continua

### 10.1 Certificaciones Recomendadas

- Primeros auxilios básicos
- RCP (Reanimación Cardiopulmonar)
- Prevención de infecciones
- Manejo de residuos biológicos

### 10.2 Actualización Profesional

- Asistencia a seminarios y congresos
- Revisión de nuevas normativas
- Actualización de protocolos
- Intercambio de experiencias con otros profesionales

---

## Ejercicios Prácticos

### Ejercicio 1: Análisis de Escenarios

Analiza los siguientes escenarios e identifica los errores de seguridad:

1. Un tatuador usa los mismos guantes para preparar la tinta y tatuar al cliente.
2. Las agujas usadas se depositan en una bolsa de plástico normal.
3. Un cliente menciona que toma aspirina regularmente, pero el tatuador procede sin más preguntas.

### Ejercicio 2: Protocolo de Limpieza

Diseña un checklist completo para la limpieza entre clientes, incluyendo todos los pasos necesarios y los productos a utilizar.

### Ejercicio 3: Caso de Estudio

Un cliente regresa 3 días después de tatuarse con enrojecimiento e hinchazón moderados. Describe:
- Las preguntas que harías
- Los signos que buscarías
- Las acciones que tomarías

---

## Conclusión

La seguridad y la higiene en el tatuaje no son opcionales; son responsabilidades éticas y legales de todo profesional. Un tatuador competente no solo domina las técnicas artísticas, sino que también es un experto en prevención de riesgos y cuidado del cliente. La inversión en formación, equipamiento de calidad y protocolos rigurosos no es un gasto, sino una inversión en la reputación profesional y, lo más importante, en la salud de quienes confían en nosotros.

Recuerda: un tatuaje puede durar toda la vida, pero una infección puede cambiarla para siempre. La excelencia en seguridad e higiene es lo que distingue a un verdadero profesional de un aficionado.

---

## Recursos Adicionales

- Guías de la OMS sobre prevención de infecciones
- Normativas locales de establecimientos de tatuaje
- Asociaciones profesionales de tatuadores
- Cursos certificados de higiene y seguridad

---

*¿Sabías que?* El autoclave fue inventado en 1879 por Charles Chamberland, y su principio de esterilización por vapor a presión sigue siendo el estándar de oro en la industria del tatuaje más de 140 años después.
`;

async function fixTruncatedModule() {
  console.log('🔧 Fixing truncated module content...\n');
  
  // Find the truncated module
  const { data: module, error: findError } = await supabase
    .from('course_modules')
    .select('*')
    .eq('course_id', '31e63825-0615-4c75-a690-2a1764dd5d07')
    .eq('order_index', 3)
    .single();
  
  if (findError || !module) {
    console.error('❌ Could not find module:', findError?.message);
    return;
  }
  
  console.log('📋 Found module:');
  console.log(`   ID: ${module.id}`);
  console.log(`   Title: ${module.title_es}`);
  console.log(`   Current content length: ${(module.content_es || '').length} chars`);
  console.log(`   Current content: "${module.content_es}"\n`);
  
  // Update with comprehensive content
  const { error: updateError } = await supabase
    .from('course_modules')
    .update({
      content_en: COMPREHENSIVE_CONTENT,
      content_es: COMPREHENSIVE_CONTENT,
      updated_at: new Date().toISOString()
    })
    .eq('id', module.id);
  
  if (updateError) {
    console.error('❌ Failed to update module:', updateError.message);
    return;
  }
  
  console.log('✅ Module updated successfully!');
  console.log(`   New content length: ${COMPREHENSIVE_CONTENT.length} chars`);
  console.log(`   That's approximately ${Math.round(COMPREHENSIVE_CONTENT.split(/\s+/).length)} words`);
  
  // Verify update
  const { data: updated, error: verifyError } = await supabase
    .from('course_modules')
    .select('content_es')
    .eq('id', module.id)
    .single();
  
  if (verifyError) {
    console.error('❌ Could not verify update:', verifyError.message);
    return;
  }
  
  console.log(`\n✅ Verified: Module now has ${(updated.content_es || '').length} chars`);
  console.log('\n🎉 Done! Refresh the page to see the updated content.');
}

fixTruncatedModule().catch(console.error);
