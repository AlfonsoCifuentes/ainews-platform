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

// Componente de botón de completar reutilizable
export function CompleteModuleButton({
  locale,
  currentProgress,
  isCompleting,
  onClick,
  className = '',
}: {
  locale: 'en' | 'es';
  currentProgress?: CurrentProgress;
  isCompleting: boolean;
  onClick: () => void;
  className?: string;
}) {
  const t = locale === 'en' ? {
    markComplete: 'Mark as Complete',
    completed: 'Completed',
    completing: 'Saving...',
  } : {
    markComplete: 'Marcar como Completado',
    completed: 'Completado',
    completing: 'Guardando...',
  };

  return (
    <Button
      onClick={onClick}
      disabled={isCompleting || currentProgress?.completed}
      variant={currentProgress?.completed ? 'outline' : 'default'}
      className={className}
      size="lg"
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
  );
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

  // Log component mount with detailed diagnostics
  useEffect(() => {
    console.group('🎬 [ModulePlayer] Component Mounted');
    console.log('📦 Module Info:', {
      id: module.id,
      title_en: module.title_en,
      title_es: module.title_es,
      contentType: module.content_type,
      order: module.order_index
    });
    console.log('👤 Enrollment ID:', enrollmentId);
    console.log('📊 Progress Status:', {
      completed: currentProgress?.completed || false,
      completedAt: currentProgress?.completed_at || 'N/A',
      progressId: currentProgress?.id || 'N/A'
    });
    console.log('📝 Content Status:', {
      hasContent: !!(displayContent?.trim()),
      contentLength: displayContent?.length || 0,
      contentPreview: displayContent?.substring(0, 100) || 'NO CONTENT'
    });
    console.groupEnd();
    
    loggers.success('ModulePlayer', 'Component mounted', {
      moduleId: module.id,
      enrollmentId,
      currentProgress: currentProgress?.completed ? 'Completed' : 'Not completed',
      contentType: module.content_type,
      hasContent: !!(displayContent?.trim())
    });
  }, [module.id, enrollmentId, currentProgress?.completed, module.content_type, displayContent]);

  // Auto-generate content if missing or if content is only a placeholder
  useEffect(() => {
    const placeholderRegex = /(coming soon|próximamente|en preparación|contenido en desarrollo|content coming soon|coming-soon)/i;
    const isPlaceholder = (text?: string | null) => {
      if (!text) return true;
      const trimmed = text.trim();
      if (!trimmed) return true;
      if (trimmed.length < 60 && placeholderRegex.test(trimmed)) return true;
      return false;
    };

    const shouldGenerateContent = isPlaceholder(displayContent);
    
    if (!shouldGenerateContent || isGeneratingContent) {
      return;
    }

    const generateContent = async () => {
      console.group('🤖 [ModulePlayer] Auto-Generating Content');
      console.log('📋 Request Details:', {
        moduleId: module.id,
        courseId: courseId,
        locale,
        contentType: module.content_type
      });
      
      setIsGeneratingContent(true);
      loggers.course('Auto-generating module content', {
        moduleId: module.id,
        locale,
        contentType: module.content_type
      });

      try {
        console.log('🌐 Calling API: /api/courses/modules/generate-content');
        const requestBody = {
          moduleId: module.id,
          courseId: courseId,
          locale
        };
        console.log('📤 Request Body:', requestBody);
        
        const response = await fetch('/api/courses/modules/generate-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        console.log('📡 Response Status:', response.status, response.statusText);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ API Error Response:', errorText);
          throw new Error(`API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('✅ API Response Data:', {
          success: data.success,
          hasContent: !!data.data?.content,
          contentLength: data.data?.content?.length || 0
        });
        
        if (data.success && data.data.content) {
          console.log('✨ Content generated successfully!');
          loggers.success('ModulePlayer', 'Content generated from API', {
            moduleId: module.id,
            contentLength: data.data.content.length,
            locale
          });
          setGeneratedContent(data.data.content);
          showToast(t.contentGenerated, 'success');
          console.log('🎉 State updated with generated content');
        } else {
          console.warn('⚠️ API returned success but no content:', data);
        }
        console.groupEnd();
      } catch (error) {
        console.error('❌ Content Generation Error:', error);
        console.error('📋 Error Details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : 'N/A',
          moduleId: module.id
        });
        console.groupEnd();
        
        loggers.error('ModulePlayer', 'Content generation failed', {
          error: error instanceof Error ? error.message : String(error),
          moduleId: module.id
        });
      } finally {
        setIsGeneratingContent(false);
        console.log('🏁 Content generation process finished');
      }
    };

    generateContent();
  }, [module.id, module.content_type, courseId, displayContent, isGeneratingContent, locale, router, showToast, t]);

  // Removed automatic polling that caused infinite refresh loops


  const handleComplete = async () => {
    console.group('✅ [ModulePlayer] Handle Complete Started');
    console.log('📋 Completion Request:', {
      moduleId: module.id,
      enrollmentId,
      alreadyCompleted: currentProgress?.completed,
      timestamp: new Date().toISOString()
    });
    
    loggers.course('handleComplete called', {
      moduleId: module.id,
      enrollmentId,
      alreadyCompleted: currentProgress?.completed
    });

    setIsCompleting(true);

    try {
      const supabase = getSupabaseClient();
      console.log('🔌 Supabase client obtained');
      loggers.course('Supabase client obtained', {});

      if (currentProgress?.completed) {
        console.warn('⚠️ Module already completed - skipping');
        loggers.warn('ModulePlayer', 'Module already completed', { moduleId: module.id });
        showToast(t.success, 'success');
        setIsCompleting(false);
        console.groupEnd();
        return;
      }

      console.log('💾 Updating user_progress table...');
      loggers.course('Updating user_progress table', {
        enrollmentId,
        moduleId: module.id,
        timestamp: new Date().toISOString()
      });

      // Get user ID first
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user?.id) {
        throw new Error('User not authenticated');
      }

      const userId = authData.user.id;
      const now = new Date().toISOString();
      console.log('📤 Progress Update:', { userId, courseId, moduleId: module.id });

      // Check if progress record already exists
      const { data: existingProgress, error: selectError } = await supabase
        .from('user_progress')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .eq('module_id', module.id)
        .maybeSingle(); // Use maybeSingle to allow null when no record exists

      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError;
      }

      let progressData, progressError;

      if (existingProgress) {
        // Update existing record
        console.log('📝 Updating existing progress record:', existingProgress.id);
        const result = await supabase
          .from('user_progress')
          .update({
            completed: true,
            completed_at: now,
            updated_at: now,
          })
          .eq('id', existingProgress.id);
        progressData = result.data;
        progressError = result.error;
      } else {
        // Insert new record
        console.log('➕ Creating new progress record');
        const result = await supabase
          .from('user_progress')
          .insert({
            user_id: userId,
            course_id: courseId,
            module_id: module.id,
            completed: true,
            completed_at: now,
          });
        progressData = result.data;
        progressError = result.error;
      }

      if (progressError) {
        console.error('❌ user_progress update failed:', progressError);
        loggers.error('ModulePlayer', 'user_progress update failed', {
          message: progressError?.message || String(progressError),
          code: (progressError as unknown as Record<string, unknown>)?.code
        });
        throw progressError;
      }

      console.log('✅ user_progress updated successfully:', progressData);
      loggers.success('ModulePlayer', 'user_progress updated', {
        data: progressData,
        userId,
        moduleId: module.id
      });

      // Award XP (userId already obtained above)
      console.log('🎁 Awarding XP...');
      console.log('👤 User ID:', userId);
      loggers.course('Got user from auth', {
        userId: userId ? 'Present' : 'Missing'
      });

      if (userId) {
        console.log('📞 Calling award_xp RPC:', {
          userId,
          amount: 100,
          source: 'module_completion'
        });
        loggers.course('Awarding XP to user', {
          userId,
          amount: 100
        });

        const { data: xpData, error: xpError } = await supabase.rpc('award_xp', {
          p_user_id: userId,
          p_amount: 100,
          p_source: 'module_completion',
        });

        if (xpError) {
          console.warn('⚠️ XP award failed (non-blocking):', xpError);
          loggers.warn('ModulePlayer', 'XP award failed (non-blocking)', {
            message: xpError?.message || String(xpError),
            code: (xpError as unknown as Record<string, unknown>)?.code
          });
        } else {
          console.log('✅ XP awarded successfully:', xpData);
          loggers.success('ModulePlayer', 'XP awarded successfully', {
            xpData,
            userId
          });
        }
        
        // Trigger course complete event for badge checking
        console.log('🎊 Dispatching course-complete event');
        loggers.event('Dispatching course-complete event', {
          moduleId: module.id,
          enrollmentId
        });

        window.dispatchEvent(new CustomEvent('course-complete', {
          detail: { moduleId: module.id, enrollmentId }
        }));
        console.log('✅ Event dispatched successfully');
      }

      console.log('🎉 Module completion successful!');
      loggers.success('ModulePlayer', 'Module completion successful', {
        moduleId: module.id,
        enrollmentId
      });

      showToast(t.success, 'success');
      
      // Don't call router.refresh() - it causes unwanted page reload
      // The UI will update automatically via state management
      console.log('ℹ️ No page refresh - UI updates via state');
      loggers.course('Module completion flow finished - no refresh needed', {});
      console.groupEnd();
    } catch (error) {
      console.error('❌ handleComplete Error:', error);
      console.error('📋 Error Context:', {
        moduleId: module.id,
        enrollmentId,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'N/A'
      });
      console.groupEnd();
      
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
      console.log('🏁 handleComplete finished - isCompleting set to false');
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
          <div className="flex items-center gap-3 mb-2">
            <Icon className="w-5 h-5 text-primary" />
            <h1 className="text-xl md:text-2xl font-bold">{title}</h1>
          </div>
          <p className="text-sm md:text-base text-muted-foreground">{description}</p>
        </div>

        <CompleteModuleButton
          locale={locale}
          currentProgress={currentProgress}
          isCompleting={isCompleting}
          onClick={handleComplete}
          className="shrink-0"
        />
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
          className="prose prose-base dark:prose-invert max-w-none p-6 md:p-8 rounded-3xl bg-card border shadow-lg"
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
                // Headings más prominentes con gradientes y bordes
                h1: ({ ...props }) => (
                  <h1 
                    className="text-2xl md:text-3xl font-bold mb-6 mt-8 first:mt-0 bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent" 
                    {...props} 
                  />
                ),
                h2: ({ ...props }) => (
                  <h2 
                    className="text-xl md:text-2xl font-semibold mb-4 mt-8 text-primary border-l-4 border-primary pl-4" 
                    {...props} 
                  />
                ),
                h3: ({ ...props }) => (
                  <h3 
                    className="text-lg md:text-xl font-medium mb-3 mt-6 text-foreground" 
                    {...props} 
                  />
                ),
                // Párrafos con más espacio y mejor legibilidad
                p: ({ ...props }) => (
                  <p 
                    className="text-sm md:text-base leading-relaxed mb-4 text-muted-foreground" 
                    {...props} 
                  />
                ),
                // Listas con más espacio entre items
                ul: ({ ...props }) => (
                  <ul 
                    className="space-y-2 my-4 pl-5" 
                    {...props} 
                  />
                ),
                ol: ({ ...props }) => (
                  <ol 
                    className="space-y-2 my-4 pl-5" 
                    {...props} 
                  />
                ),
                li: ({ ...props }) => (
                  <li 
                    className="text-sm md:text-base leading-relaxed" 
                    {...props} 
                  />
                ),
                // Blockquotes más destacados
                blockquote: ({ ...props }) => (
                  <blockquote 
                    className="border-l-4 border-primary bg-primary/10 p-4 rounded-r-xl my-4 italic text-sm md:text-base" 
                    {...props} 
                  />
                ),
                // Enlaces destacados
                a: ({ ...props }) => (
                  <a 
                    className="text-primary font-semibold hover:underline hover:text-blue-400 transition-colors" 
                    {...props} 
                  />
                ),
                // Code blocks y inline code
                code(props) {
                  const { inline, className, children, ...rest } = props as {
                    inline?: boolean;
                    className?: string;
                    children?: React.ReactNode;
                  };
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <div className="my-6 rounded-xl overflow-hidden border border-border">
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        {...rest}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <code 
                      className="bg-primary/20 text-primary px-2 py-1 rounded text-base font-mono" 
                      {...rest}
                    >
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

      {/* Botón de completar al final del contenido */}
      <div className="flex justify-center mt-8 pt-8 border-t-2 border-border">
        <CompleteModuleButton
          locale={locale}
          currentProgress={currentProgress}
          isCompleting={isCompleting}
          onClick={handleComplete}
          className="w-full sm:w-auto min-w-[250px]"
        />
      </div>
    </div>
  );
}
