'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  PlayCircle, 
  CheckCircle2, 
  FileText, 
  FileQuestion,
  Lightbulb,
  Code,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSupabaseClient } from '@/lib/db/supabase';
import { useToast } from '@/components/shared/ToastProvider';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: number;
}

interface Resource {
  title: string;
  url: string;
}

interface CurrentProgress {
  id: string;
  enrollment_id: string;
  module_id: string;
  completed: boolean;
  completed_at?: string;
}

interface Module {
  id: string;
  title_en: string;
  title_es: string;
  description_en: string;
  description_es: string;
  content_en: string;
  content_es: string;
  content_type: 'video' | 'article' | 'quiz' | 'interactive';
  video_url?: string;
  quiz_questions?: QuizQuestion[];
  resources?: Resource[];
  duration_minutes: number;
}

interface ModulePlayerProps {
  locale: 'en' | 'es';
  module: Module;
  courseId: string;
  enrollmentId: string;
  currentProgress?: CurrentProgress;
}

export function ModulePlayer({
  locale,
  module,
  enrollmentId,
  currentProgress,
}: ModulePlayerProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isCompleting, setIsCompleting] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});

  const t = locale === 'en' ? {
    markComplete: 'Mark as Complete',
    completed: 'Completed',
    completing: 'Saving...',
    success: 'Module completed! +100 XP earned',
    error: 'Failed to save progress',
    resources: 'Resources',
    quiz: 'Quiz',
    submitQuiz: 'Submit Quiz',
    yourScore: 'Your Score',
    correct: 'Correct',
    incorrect: 'Incorrect',
    tryAgain: 'Try Again',
  } : {
    markComplete: 'Marcar como Completado',
    completed: 'Completado',
    completing: 'Guardando...',
    success: '¡Módulo completado! +100 XP ganados',
    error: 'Error al guardar progreso',
    resources: 'Recursos',
    quiz: 'Cuestionario',
    submitQuiz: 'Enviar Cuestionario',
    yourScore: 'Tu Puntuación',
    correct: 'Correcto',
    incorrect: 'Incorrecto',
    tryAgain: 'Intentar de Nuevo',
  };

  const title = locale === 'en' ? module.title_en : module.title_es;
  const description = locale === 'en' ? module.description_en : module.description_es;
  const content = locale === 'en' ? module.content_en : module.content_es;

  const handleComplete = async () => {
    setIsCompleting(true);

    try {
      const supabase = getSupabaseClient();

      if (currentProgress?.completed) {
        // Already completed, just show toast
        showToast(t.success, 'success');
        setIsCompleting(false);
        return;
      }

      // Create or update progress
      const { error } = await supabase
        .from('course_progress')
        .upsert({
          enrollment_id: enrollmentId,
          module_id: module.id,
          completed: true,
          completed_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Award XP
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.rpc('award_xp', {
          p_user_id: user.id,
          p_amount: 100,
          p_source: 'module_completion',
        });
        
        // Trigger course complete event for badge checking
        window.dispatchEvent(new CustomEvent('course-complete', {
          detail: { moduleId: module.id, enrollmentId }
        }));
      }

      showToast(t.success, 'success');
      router.refresh();
    } catch (error) {
      console.error('Complete error:', error);
      showToast(t.error, 'error');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleQuizSubmit = () => {
    if (!module.quiz_questions) return;

    const questions = module.quiz_questions;
    let correct = 0;

    questions.forEach((q, i) => {
      if (quizAnswers[i] === q.correct_answer) {
        correct++;
      }
    });

    const score = (correct / questions.length) * 100;
    
    if (score >= 70) {
      handleComplete();
    } else {
      showToast(`${t.yourScore}: ${score.toFixed(0)}% - ${t.tryAgain}`, 'error');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'video':
        return PlayCircle;
      case 'article':
        return FileText;
      case 'quiz':
        return FileQuestion;
      default:
        return Lightbulb;
    }
  };

  const Icon = getIcon(module.content_type);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <Icon className="w-6 h-6 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold">{title}</h1>
          </div>
          <p className="text-lg text-muted-foreground">{description}</p>
        </div>

        <Button
          onClick={handleComplete}
          disabled={isCompleting || currentProgress?.completed}
          variant={currentProgress?.completed ? 'outline' : 'default'}
          className="shrink-0"
        >
          {currentProgress?.completed ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {t.completed}
            </>
          ) : isCompleting ? (
            t.completing
          ) : (
            t.markComplete
          )}
        </Button>
      </div>

      {/* Video Player */}
      {module.content_type === 'video' && module.video_url && (
        <div className="aspect-video rounded-2xl overflow-hidden bg-black">
          <iframe
            src={module.video_url}
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      )}

      {/* Article Content */}
      {(module.content_type === 'article' || module.content_type === 'interactive') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="prose prose-lg dark:prose-invert max-w-none p-8 rounded-2xl bg-card border"
        >
          <ReactMarkdown
            components={{
              code(props) {
                const { inline, className, children, ...rest } = props as {
                  inline?: boolean;
                  className?: string;
                  children?: React.ReactNode;
                };
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag="div"
                    {...rest}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...rest}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {content}
          </ReactMarkdown>
        </motion.div>
      )}

      {/* Quiz */}
      {module.content_type === 'quiz' && module.quiz_questions && (
        <div className="space-y-6 p-8 rounded-2xl bg-card border">
          {module.quiz_questions.map((question, qIndex) => (
            <div key={qIndex} className="space-y-3">
              <h3 className="font-semibold text-lg">
                {qIndex + 1}. {question.question}
              </h3>
              <div className="space-y-2">
                {question.options.map((option: string, oIndex: number) => (
                  <button
                    key={oIndex}
                    onClick={() => setQuizAnswers({ ...quizAnswers, [qIndex]: oIndex })}
                    className={`w-full p-4 rounded-xl text-left transition-colors ${
                      quizAnswers[qIndex] === oIndex
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <Button
            onClick={handleQuizSubmit}
            disabled={Object.keys(quizAnswers).length !== module.quiz_questions.length}
            className="w-full"
          >
            {t.submitQuiz}
          </Button>
        </div>
      )}

      {/* Resources */}
      {module.resources && module.resources.length > 0 && (
        <div className="p-6 rounded-2xl bg-card border">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Code className="w-5 h-5 text-primary" />
            {t.resources}
          </h3>
          <ul className="space-y-2">
            {module.resources.map((resource, i) => (
              <li key={i}>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  {resource.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
