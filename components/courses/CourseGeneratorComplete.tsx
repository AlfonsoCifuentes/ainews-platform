/**
 * Complete Course Generator Component
 * UI for generating full, followable courses
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface GeneratedCourse {
  course_id: string;
  title: string;
  description: string;
  objectives: string[];
  modules_count: number;
  estimated_total_minutes: number;
  content: {
    modules: Array<{
      title: string;
      description: string;
      estimatedMinutes: number;
    }>;
  };
}

type Difficulty = 'beginner' | 'intermediate' | 'advanced';
type Duration = 'short' | 'medium' | 'long';

export function CourseGeneratorComplete() {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [duration, setDuration] = useState<Duration>('medium');
  const [locale, setLocale] = useState<'en' | 'es'>('en');
  const [loading, setLoading] = useState(false);
  const [generatedCourse, setGeneratedCourse] = useState<GeneratedCourse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');

  const isSpanish = locale === 'es';

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!topic.trim()) {
      setError(isSpanish ? 'Por favor ingresa un tema' : 'Please enter a topic');
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedCourse(null);
    setProgress(isSpanish ? '⏳ Generando estructura...' : '⏳ Generating structure...');

    try {
      // Call our new endpoint
      const response = await fetch('/api/courses/generate-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          difficulty,
          duration,
          locale
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const data = await response.json();

      if (data.success && data.data) {
        setProgress(isSpanish ? '✅ ¡Curso generado!' : '✅ Course generated!');
        setGeneratedCourse(data.data);
        
        // Success message
        setTimeout(() => {
          setProgress(isSpanish 
            ? `✅ Curso "${data.data.title}" guardado en la base de datos` 
            : `✅ Course "${data.data.title}" saved to database`);
        }, 500);
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      setProgress(isSpanish ? '❌ Error en generación' : '❌ Generation error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
          {isSpanish ? '🚀 Generador de Cursos IA' : '🚀 AI Course Generator'}
        </h1>
        <p className="text-muted-foreground">
          {isSpanish 
            ? 'Genera cursos completos y seguibles sobre cualquier tema de IA' 
            : 'Generate complete, followable courses on any AI topic'}
        </p>
      </div>

      {/* Language Toggle */}
      <div className="flex justify-center gap-2">
        <button
          onClick={() => setLocale('en')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            locale === 'en'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary hover:bg-secondary/80'
          }`}
        >
          English
        </button>
        <button
          onClick={() => setLocale('es')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            locale === 'es'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary hover:bg-secondary/80'
          }`}
        >
          Español
        </button>
      </div>

      {/* Generation Form */}
      <motion.form
        onSubmit={handleGenerate}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 space-y-6"
      >
        {/* Topic Input */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold">
            {isSpanish ? '📚 Tema del Curso' : '📚 Course Topic'}
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={isSpanish 
              ? 'Ej: Transformers en NLP, Fine-tuning de modelos...' 
              : 'E.g: Transformers in NLP, Model fine-tuning...'}
            className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
        </div>

        {/* Difficulty */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold">
            {isSpanish ? '🎯 Nivel' : '🎯 Difficulty'}
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setDifficulty(level)}
                disabled={loading}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  difficulty === level
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white/5 border border-white/20 hover:bg-white/10'
                }`}
              >
                {isSpanish 
                  ? level === 'beginner' ? 'Principiante' : level === 'intermediate' ? 'Intermedio' : 'Avanzado'
                  : level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold">
            {isSpanish ? '⏱️ Duración Total' : '⏱️ Total Duration'}
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['short', 'medium', 'long'] as const).map((dur) => (
              <button
                key={dur}
                type="button"
                onClick={() => setDuration(dur)}
                disabled={loading}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  duration === dur
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white/5 border border-white/20 hover:bg-white/10'
                }`}
              >
                {isSpanish 
                  ? dur === 'short' ? 'Corto' : dur === 'medium' ? 'Medio' : 'Largo'
                  : dur.charAt(0).toUpperCase() + dur.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !topic.trim()}
          className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {isSpanish ? 'Generando...' : 'Generating...'}
            </>
          ) : (
            <>
              ⚡ {isSpanish ? 'Generar Curso Completo' : 'Generate Full Course'}
            </>
          )}
        </button>
      </motion.form>

      {/* Progress */}
      {progress && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-lg font-semibold text-primary"
        >
          {progress}
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 flex gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-400">{isSpanish ? 'Error' : 'Error'}</p>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Generated Course */}
      {generatedCourse && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="backdrop-blur-xl bg-gradient-to-br from-green-500/20 to-blue-500/20 border border-green-500/50 rounded-3xl p-8 space-y-6"
        >
          {/* Success Icon */}
          <div className="flex justify-center">
            <CheckCircle2 className="w-16 h-16 text-green-400" />
          </div>

          {/* Course Title */}
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">{generatedCourse.title}</h2>
            <p className="text-muted-foreground text-lg">{generatedCourse.description}</p>
          </div>

          {/* Course Metadata */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-primary">{generatedCourse.modules_count}</div>
              <div className="text-sm text-muted-foreground">
                {isSpanish ? 'Módulos' : 'Modules'}
              </div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-primary">{generatedCourse.estimated_total_minutes}</div>
              <div className="text-sm text-muted-foreground">
                {isSpanish ? 'Minutos' : 'Minutes'}
              </div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-primary">{difficulty}</div>
              <div className="text-sm text-muted-foreground">
                {isSpanish ? 'Nivel' : 'Level'}
              </div>
            </div>
          </div>

          {/* Learning Objectives */}
          <div className="space-y-3">
            <h3 className="font-bold text-lg">
              {isSpanish ? '🎯 Objetivos de Aprendizaje' : '🎯 Learning Objectives'}
            </h3>
            <ul className="space-y-2">
              {generatedCourse.objectives.map((obj, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-primary font-bold">✓</span>
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Modules Preview */}
          <div className="space-y-3">
            <h3 className="font-bold text-lg">
              {isSpanish ? '📚 Estructura del Curso' : '📚 Course Structure'}
            </h3>
            <div className="space-y-2">
              {generatedCourse.content.modules.map((module, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="flex gap-3">
                    <div className="bg-primary text-primary-foreground font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{module.title}</h4>
                      <p className="text-sm text-muted-foreground">{module.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ⏱️ {module.estimatedMinutes} {isSpanish ? 'minutos' : 'minutes'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <a
              href={`/en/courses/${generatedCourse.course_id}`}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl text-center transition-all"
            >
              {isSpanish ? '🚀 Empezar a Estudiar' : '🚀 Start Learning'}
            </a>
            <button
              onClick={() => {
                setGeneratedCourse(null);
                setTopic('');
                setProgress('');
              }}
              className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 font-bold py-3 rounded-xl transition-all"
            >
              {isSpanish ? '➕ Generar Otro' : '➕ Generate Another'}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
