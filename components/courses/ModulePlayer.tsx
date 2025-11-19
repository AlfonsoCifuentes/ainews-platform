'use client';

import { useState, useEffect } from 'react';
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
import type { NormalizedModule } from '@/lib/courses/normalize';
import courseLogger from '@/lib/logging/course-logger';

interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: number;
}

interface CurrentProgress {
  id: string;
  enrollment_id: string;
  module_id: string;
  completed: boolean;
  completed_at?: string;
}

type Module = NormalizedModule & {
  video_url?: string | null;
  quiz_questions?: QuizQuestion[];
};

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

  // Log component mount
  useEffect(() => {
    courseLogger.info('ModulePlayer', 'Component mounted', {
      moduleId: module.id,
      enrollmentId,
      currentProgress: currentProgress?.completed ? 'Completed' : 'Not completed',
      contentType: module.content_type
    });
  }, [module.id, enrollmentId, currentProgress?.completed, module.content_type]);

  const handleComplete = async () => {
    courseLogger.info('ModulePlayer', 'handleComplete called', {
      moduleId: module.id,
      enrollmentId,
      alreadyCompleted: currentProgress?.completed
    });

    setIsCompleting(true);

    try {
      const supabase = getSupabaseClient();
      courseLogger.info('ModulePlayer', 'Supabase client obtained', {});

      if (currentProgress?.completed) {
        courseLogger.warn('ModulePlayer', 'Module already completed', { moduleId: module.id });
        showToast(t.success, 'success');
        setIsCompleting(false);
        return;
      }

      courseLogger.info('ModulePlayer', 'Updating course_progress table', {
        enrollmentId,
        moduleId: module.id,
        timestamp: new Date().toISOString()
      });

      // Create or update progress
      const { data: progressData, error: progressError } = await supabase
        .from('course_progress')
        .upsert({
          enrollment_id: enrollmentId,
          module_id: module.id,
          completed: true,
          completed_at: new Date().toISOString(),
        });

      if (progressError) {
        courseLogger.error('ModulePlayer', 'course_progress update failed', {
          message: progressError?.message || String(progressError),
          code: (progressError as unknown as Record<string, unknown>)?.code
        });
        throw progressError;
      }

      courseLogger.success('ModulePlayer', 'course_progress updated', {
        data: progressData,
        enrollmentId,
        moduleId: module.id
      });

      // Award XP
      const { data: authData } = await supabase.auth.getUser();
      courseLogger.info('ModulePlayer', 'Got user from auth', {
        userId: authData?.user?.id ? 'Present' : 'Missing'
      });

      if (authData?.user?.id) {
        courseLogger.info('ModulePlayer', 'Awarding XP to user', {
          userId: authData.user.id,
          amount: 100
        });

        const { data: xpData, error: xpError } = await supabase.rpc('award_xp', {
          p_user_id: authData.user.id,
          p_amount: 100,
          p_source: 'module_completion',
        });

        if (xpError) {
          courseLogger.warn('ModulePlayer', 'XP award failed (non-blocking)', {
            message: xpError?.message || String(xpError),
            code: (xpError as unknown as Record<string, unknown>)?.code
          });
        } else {
          courseLogger.success('ModulePlayer', 'XP awarded successfully', {
            xpData,
            userId: authData.user.id
          });
        }
        
        // Trigger course complete event for badge checking
        courseLogger.info('ModulePlayer', 'Dispatching course-complete event', {
          moduleId: module.id,
          enrollmentId
        });

        window.dispatchEvent(new CustomEvent('course-complete', {
          detail: { moduleId: module.id, enrollmentId }
        }));
      }

      courseLogger.success('ModulePlayer', 'Module completion successful', {
        moduleId: module.id,
        enrollmentId
      });

      showToast(t.success, 'success');
      
      courseLogger.info('ModulePlayer', 'Calling router.refresh()', {});
      router.refresh();
    } catch (error) {
      courseLogger.error('ModulePlayer', 'handleComplete error', {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : String(error),
        moduleId: module.id,
        enrollmentId
      });
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
