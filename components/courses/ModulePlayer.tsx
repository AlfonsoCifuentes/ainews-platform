'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { loggers } from '@/lib/utils/logger';

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
  course_id?: string;
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
  courseId,
  enrollmentId,
  currentProgress,
}: ModulePlayerProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isCompleting, setIsCompleting] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);

  const t = useMemo(() => locale === 'en' ? {
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
    generatingContent: 'Generating module content...',
    contentGenerated: 'Module content generated successfully!',
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
    generatingContent: 'Generando contenido del módulo...',
    contentGenerated: '¡Contenido del módulo generado exitosamente!',
  }, [locale]);

  const title = locale === 'en' ? module.title_en : module.title_es;
  const description = locale === 'en' ? module.description_en : module.description_es;
  const content = locale === 'en' ? module.content_en : module.content_es;
  const displayContent = generatedContent || content;

  // Log component mount
  useEffect(() => {
    loggers.success('ModulePlayer', 'Component mounted', {
      moduleId: module.id,
      enrollmentId,
      currentProgress: currentProgress?.completed ? 'Completed' : 'Not completed',
      contentType: module.content_type,
      hasContent: !!(displayContent?.trim())
    });
  }, [module.id, enrollmentId, currentProgress?.completed, module.content_type, displayContent]);

  // Auto-generate content if missing
  useEffect(() => {
    const shouldGenerateContent = !displayContent || !displayContent.trim();
    
    if (!shouldGenerateContent || isGeneratingContent) {
      return;
    }

    const generateContent = async () => {
      setIsGeneratingContent(true);
      loggers.course('Auto-generating module content', {
        moduleId: module.id,
        locale,
        contentType: module.content_type
      });

      try {
        const response = await fetch('/api/courses/modules/generate-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            moduleId: module.id,
            courseId: courseId,
            locale
          })
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        if (data.success && data.data.content) {
          loggers.success('ModulePlayer', 'Content generated from API', {
            moduleId: module.id,
            contentLength: data.data.content.length,
            locale
          });
          setGeneratedContent(data.data.content);
          showToast(t.contentGenerated, 'success');
          // Refresh to get the updated module from database
          router.refresh();
        }
      } catch (error) {
        loggers.error('ModulePlayer', 'Content generation failed', {
          error: error instanceof Error ? error.message : String(error),
          moduleId: module.id
        });
        // Don't show error toast - just log it silently
        // User will see the "coming soon" message if it fails
      } finally {
        setIsGeneratingContent(false);
      }
    };

    generateContent();
  }, [module.id, module.content_type, courseId, displayContent, isGeneratingContent, locale, router, showToast, t]);


  const handleComplete = async () => {
    loggers.course('handleComplete called', {
      moduleId: module.id,
      enrollmentId,
      alreadyCompleted: currentProgress?.completed
    });

    setIsCompleting(true);

    try {
      const supabase = getSupabaseClient();
      loggers.course('Supabase client obtained', {});

      if (currentProgress?.completed) {
        loggers.warn('ModulePlayer', 'Module already completed', { moduleId: module.id });
        showToast(t.success, 'success');
        setIsCompleting(false);
        return;
      }

      loggers.course('Updating course_progress table', {
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
        loggers.error('ModulePlayer', 'course_progress update failed', {
          message: progressError?.message || String(progressError),
          code: (progressError as unknown as Record<string, unknown>)?.code
        });
        throw progressError;
      }

      loggers.success('ModulePlayer', 'course_progress updated', {
        data: progressData,
        enrollmentId,
        moduleId: module.id
      });

      // Award XP
      const { data: authData } = await supabase.auth.getUser();
      loggers.course('Got user from auth', {
        userId: authData?.user?.id ? 'Present' : 'Missing'
      });

      if (authData?.user?.id) {
        loggers.course('Awarding XP to user', {
          userId: authData.user.id,
          amount: 100
        });

        const { data: xpData, error: xpError } = await supabase.rpc('award_xp', {
          p_user_id: authData.user.id,
          p_amount: 100,
          p_source: 'module_completion',
        });

        if (xpError) {
          loggers.warn('ModulePlayer', 'XP award failed (non-blocking)', {
            message: xpError?.message || String(xpError),
            code: (xpError as unknown as Record<string, unknown>)?.code
          });
        } else {
          loggers.success('ModulePlayer', 'XP awarded successfully', {
            xpData,
            userId: authData.user.id
          });
        }
        
        // Trigger course complete event for badge checking
        loggers.event('Dispatching course-complete event', {
          moduleId: module.id,
          enrollmentId
        });

        window.dispatchEvent(new CustomEvent('course-complete', {
          detail: { moduleId: module.id, enrollmentId }
        }));
      }

      loggers.success('ModulePlayer', 'Module completion successful', {
        moduleId: module.id,
        enrollmentId
      });

      showToast(t.success, 'success');
      
      loggers.course('Calling router.refresh()', {});
      router.refresh();
    } catch (error) {
      loggers.error('ModulePlayer', 'handleComplete error', {
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
      {module.content_type === 'video' && (
        module.video_url ? (
          <div className="aspect-video rounded-2xl overflow-hidden bg-black">
            <iframe
              src={module.video_url}
              className="w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        ) : (
          <div className="aspect-video rounded-2xl overflow-hidden bg-secondary flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              {isGeneratingContent ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                  <p className="text-lg">{t.generatingContent}</p>
                </div>
              ) : (
                <>
                  <PlayCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">
                    {locale === 'en'
                      ? 'Video content is being prepared. Please check back soon.'
                      : 'El contenido de video se está preparando. Por favor, vuelve pronto.'}
                  </p>
                </>
              )}
            </div>
          </div>
        )
      )}

      {/* Article Content */}
      {(module.content_type === 'article' || module.content_type === 'interactive') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="prose prose-lg dark:prose-invert max-w-none p-8 rounded-2xl bg-card border"
        >
          {isGeneratingContent ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="inline-flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                <p className="text-lg">{t.generatingContent}</p>
              </div>
            </div>
          ) : displayContent && displayContent.trim() ? (
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
              {displayContent}
            </ReactMarkdown>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">
                {locale === 'en'
                  ? 'Module content is being prepared. Please check back soon.'
                  : 'El contenido del módulo se está preparando. Por favor, vuelve pronto.'}
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Quiz */}
      {module.content_type === 'quiz' && (
        module.quiz_questions && module.quiz_questions.length > 0 ? (
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
        ) : (
          <div className="p-8 rounded-2xl bg-card border text-center text-muted-foreground">
            <FileQuestion className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">
              {locale === 'en'
                ? 'Quiz questions are being prepared. Please check back soon.'
                : 'Las preguntas del cuestionario se están preparando. Por favor, vuelve pronto.'}
            </p>
          </div>
        )
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
