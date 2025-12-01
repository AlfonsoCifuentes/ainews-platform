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
import { useToast } from '@/components/shared/ToastProvider';
import { useUser } from '@/lib/hooks/useUser';
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
  enrollment_id?: string | null;
  module_id: string;
  completed: boolean;
  completed_at?: string | null;
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
      className={`${className} complete-module-button`}
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
  const { refetch: refetchUser } = useUser();
  const [isCompleting, setIsCompleting] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [exerciseAnswer, setExerciseAnswer] = useState('');
  const [gradingResult, setGradingResult] = useState<{ score: number; feedback: string; debug?: { usedModel?: string; timing?: number; [key: string]: unknown } } | null>(null);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  interface DebugInfo {
    clientRequestId: string;
    requestBody: Record<string, unknown> | null;
    fetchDuration: number;
    responseStatus: number;
    responseText: string;
    parsed?: Record<string, unknown> | null;
    serverDebug?: Record<string, unknown> | null;
  }
  interface ApiResult {
    progress?: { id?: string; completed?: boolean; completed_at?: string };
    debug?: { requestId?: string } | Record<string, unknown>;
    error?: string;
    [key: string]: unknown;
  }
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

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
  }, [module.id, enrollmentId, currentProgress?.completed, currentProgress?.completed_at, currentProgress?.id, module.order_index, module.title_en, module.title_es, module.content_type, displayContent]);

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
    const clientRequestId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('\n' + '🟦'.repeat(40));
    console.group(`✅ [ModulePlayer] [${clientRequestId}] Handle Complete Started`);
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('📋 Request Context:', {
      clientRequestId,
      moduleId: module.id,
      moduleTitle: module.title_en?.substring(0, 30) || 'N/A',
      courseId,
      enrollmentId,
      currentProgressId: currentProgress?.id || 'N/A',
      alreadyCompleted: currentProgress?.completed || false,
      locale
    });
    
    loggers.course('handleComplete called', {
      moduleId: module.id,
      courseId,
      alreadyCompleted: currentProgress?.completed
    });

    if (currentProgress?.completed) {
      console.warn('⚠️ Module already completed - skipping API call');
      loggers.warn('ModulePlayer', 'Module already completed', { moduleId: module.id });
      showToast(t.success, 'success');
      console.groupEnd();
      return;
    }

    setIsCompleting(true);
    console.log('🔄 isCompleting set to TRUE');

    try {
      // Step 1: Prepare request
      const requestBody = {
        courseId,
        moduleId: module.id,
        completed: true,
        timeSpent: 0
      };
      
      console.log('📤 Step 1: Preparing API request...');
      console.log('📦 Request body:', JSON.stringify(requestBody, null, 2));
      console.log('🌐 Endpoint: POST /api/courses/progress');
      
      // Step 2: Send request
      console.log('📡 Step 2: Sending fetch request...');
      const fetchStartTime = Date.now();
      
      const response = await fetch('/api/courses/progress', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Client-Request-Id': clientRequestId
        },
        body: JSON.stringify(requestBody),
        credentials: 'include' // Ensure cookies are sent
      });

      const fetchDuration = Date.now() - fetchStartTime;
      console.log(`⏱️ Fetch completed in ${fetchDuration}ms`);
      console.log('📥 Response status:', response.status, response.statusText);
      console.log('📥 Response headers:', {
        contentType: response.headers.get('content-type'),
        setCookie: response.headers.get('set-cookie') ? 'present' : 'none'
      });

      // Step 3: Parse response
      console.log('📄 Step 3: Parsing response body...');
      const responseText = await response.text();
      console.log('📄 Raw response text:', responseText.substring(0, 500));
      // Save debug info for rendering
      try {
        setDebugInfo({
          clientRequestId,
          requestBody,
          fetchDuration,
          responseStatus: response.status,
          responseText,
          parsed: null,
          serverDebug: null,
        });
      } catch (err) {
        console.warn('[ModulePlayer] Failed to set debug info:', err);
      }
      
          let result: ApiResult | undefined;
      try {
        result = JSON.parse(responseText) as ApiResult;
        console.log('✅ JSON parsed successfully:', result);
        // Update debug info with parsed result
        setDebugInfo((prev: DebugInfo | null) => ({ ...(prev || {} as DebugInfo), parsed: result as Record<string, unknown>, serverDebug: (result as Record<string, unknown>)['debug'] as Record<string, unknown> || null } as DebugInfo));
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        console.error('📄 Response was not valid JSON');
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
      }

      // Step 4: Check response status
      console.log('🔍 Step 4: Checking response status...');
      if (!response.ok) {
        console.error('❌ API returned error status:', response.status);
        console.error('❌ Error details:', result);
        console.error('❌ Debug info:', (result as Record<string, unknown>)?.['debug'] || 'N/A');
        // Update debug info with server debug if available
        setDebugInfo((prev: DebugInfo | null) => ({ ...(prev || {} as DebugInfo), parsed: (result as Record<string, unknown>) ?? null, serverDebug: ((result as Record<string, unknown>)?.['debug'] as Record<string, unknown>) || null } as DebugInfo));
        // Also emit server-debug event for global debugging
        try {
          window.dispatchEvent(new CustomEvent('server-debug', {
            detail: {
              route: '/api/courses/progress',
              status: response.status,
              statusText: response.statusText,
              body: result,
              clientRequestId,
            }
          }));
        } catch (err) {
          // Intentionally ignore but log for diagnostics
          loggers.warn('ModulePlayer', 'Failed to dispatch server-debug event', err as Error);
        }

        throw new Error(((result as Record<string, unknown>)?.['error'] as string) || `API error: ${response.status}`);
      }

      // Step 5: Success!
      console.log('✅ Step 5: Progress saved successfully!');
      console.log('📊 Saved progress:', {
        progressId: result?.progress?.id,
        completed: result?.progress?.completed,
        completedAt: result?.progress?.completed_at,
        serverRequestId: result?.debug?.requestId
      });
      
      loggers.success('ModulePlayer', 'Progress saved via API', {
        moduleId: module.id,
        courseId,
        progressId: result.progress?.id
      });

      // Step 6: Dispatch event
      console.log('🎊 Step 6: Dispatching course-complete event...');
      window.dispatchEvent(new CustomEvent('course-complete', {
        detail: { moduleId: module.id, courseId, clientRequestId }
      }));
      console.log('🎊 Checking for awarded XP...');
      // If server awarded XP, dispatch xp-awarded with that amount and origin coordinates for animation
      try {
        const xpAmount = Number((result as ApiResult)?.['awardedXP'] ?? 0);
        if (xpAmount && xpAmount > 0) {
          console.log('🎊 Dispatching xp-awarded event from server award', xpAmount);
          const btn = document.querySelector('.complete-module-button');
          const rect = btn?.getBoundingClientRect();
          window.dispatchEvent(new CustomEvent('xp-awarded', {
            detail: {
              amount: xpAmount,
              moduleId: module.id,
              courseId,
              from: rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null,
            }
          }));
          try { await refetchUser?.(); } catch (err) { console.warn('Failed refetchUser after xp-award', err); };
        }
      } catch (e) {
        console.warn('Failed to dispatch xp-awarded based on server response', e); 
      }
      // Only show xp-awarded event when the server confirmed awarding XP (server-side award)
      console.log('✅ Event dispatching complete (server-side award only)');

      // Step 7: Show toast and refresh
      console.log('🎉 Step 7: Showing success toast...');
      showToast(t.success, 'success');
      
      console.log('🔄 Step 8: Refreshing page to update UI...');
      router.refresh();
      
      console.log('✅✅✅ MODULE COMPLETION FLOW SUCCESSFUL ✅✅✅');
      console.groupEnd();
    } catch (error) {
      console.error('\n' + '❌'.repeat(40));
      console.error(`❌ [${clientRequestId}] handleComplete FAILED`);
      console.error('❌ Error Type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('❌ Error Message:', error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.stack) {
        console.error('❌ Stack Trace:', error.stack);
      }
      console.error('❌ Context:', {
        moduleId: module.id,
        courseId,
        enrollmentId,
        clientRequestId
      });
      console.groupEnd();
      
      loggers.error('ModulePlayer', 'handleComplete error', {
        error: error instanceof Error ? error.message : String(error),
        moduleId: module.id,
        courseId,
        clientRequestId
      });
      showToast(t.error, 'error');
      setDebugOpen(true);
    } finally {
      console.log(`🏁 [${clientRequestId}] handleComplete finished - isCompleting set to false`);
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

  const handleExerciseSubmit = async () => {
    if (!exerciseAnswer.trim()) return;
    try {
      const res = await fetch('/api/courses/modules/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ moduleId: module.id, answers: { a1: exerciseAnswer } }),
      });
      if (!res.ok) {
        showToast('Failed to grade', 'error');
        setGradingResult(null);
        return;
      }
      const data = await res.json();
      setGradingResult({ score: data.score ?? 0, feedback: data.feedback ?? '', debug: data.debug ?? undefined });
      // Award XP if passed
      if (data.score >= 70) {
        window.dispatchEvent(new CustomEvent('xp-awarded', { detail: { amount: 25, moduleId: module.id } }));
        try { await refetchUser?.(); } catch (err) { console.warn('Failed refetchUser after exercise award', err); }
        showToast('Great! Exercise passed +25 XP', 'success');
      } else {
        showToast('Keep trying! Review the module and try again', 'info');
      }
    } catch (error) {
      loggers.error('ModulePlayer', 'Failed to grade exercise', error as Error);
      showToast('Error grading exercise', 'error');
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
          className={`shrink-0 selection-class`} // Added class for selection
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

      {/* Simple Exercise Short Answer */}
      <div className="p-6 rounded-2xl bg-card border mt-6">
        <h3 className="font-bold text-lg mb-2">Practice Exercise</h3>
        <p className="text-sm text-muted-foreground mb-3">Try a short answer and submit for automatic grading.</p>
        <textarea
          value={exerciseAnswer}
          onChange={(e) => setExerciseAnswer(e.target.value)}
          className="w-full rounded-md p-3 bg-secondary text-sm text-foreground mb-3 min-h-[120px]"
          placeholder={locale === 'en' ? 'Write your short answer here...' : 'Escribe tu respuesta corta aquí...'}
        />
        <div className="flex gap-2 items-center">
          <Button onClick={() => handleExerciseSubmit()} disabled={!exerciseAnswer.trim()}>
            {locale === 'en' ? 'Submit Answer' : 'Enviar Respuesta'}
          </Button>
          {gradingResult && (
            <div className="text-sm">
              <div>Score: {gradingResult.score}%</div>
              <div className="text-xs text-muted-foreground">{gradingResult.feedback}</div>
              {gradingResult.debug?.usedModel && (
                <div className="text-xs text-muted-foreground mt-1">Graded by: {String(gradingResult.debug.usedModel)}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Botón de completar al final del contenido */}
      <div className="flex justify-center mt-8 pt-8 border-t-2 border-border">
        <CompleteModuleButton
          locale={locale}
          currentProgress={currentProgress}
          isCompleting={isCompleting}
          onClick={handleComplete}
          className={`w-full sm:w-auto min-w-[250px] selection-class`} // Added class for selection
        />
      </div>
      {/* Debug toggle button */}
      <div className="fixed bottom-6 right-6 z-[9999]">
        <button
          onClick={() => setDebugOpen(!debugOpen)}
          className="bg-primary text-primary-foreground p-2 rounded-full shadow-lg hover:ring-2 focus:outline-none"
          title="Toggle debug overlay"
        >
          🐞
        </button>
      </div>

      {/* Debug overlay panel */}
      {debugOpen && (
        <div className="fixed bottom-20 right-6 z-[9999] w-[520px] max-h-[72vh] overflow-auto bg-card border p-4 rounded-lg shadow-2xl text-xs">
          <div className="flex items-center justify-between mb-2">
            <strong>Progress API Debug</strong>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  try { navigator.clipboard.writeText(JSON.stringify(debugInfo || {}, null, 2)); } catch {};
                }}
                className="px-2 py-1 bg-secondary rounded"
              >Copy</button>
              <button
                onClick={() => setDebugOpen(false)}
                className="px-2 py-1 bg-secondary rounded"
              >Close</button>
            </div>
          </div>
          <div className="mb-3">
            <div className="font-semibold">Last request</div>
            <pre className="whitespace-pre-wrap break-words bg-muted p-2 rounded mt-1">{JSON.stringify(debugInfo?.requestBody, null, 2)}</pre>
          </div>
          <div className="mb-3">
            <div className="font-semibold">Response status</div>
            <div className="mt-1">{debugInfo?.responseStatus ?? 'N/A'} ({debugInfo?.fetchDuration ?? 0}ms)</div>
          </div>
          <div className="mb-3">
            <div className="font-semibold">Raw response</div>
            <pre className="whitespace-pre-wrap break-words bg-muted p-2 rounded mt-1">{debugInfo?.responseText ?? 'N/A'}</pre>
          </div>
          <div className="mb-3">
            <div className="font-semibold">Server debug</div>
            <pre className="whitespace-pre-wrap break-words bg-muted p-2 rounded mt-1">{JSON.stringify(debugInfo?.serverDebug ?? debugInfo?.parsed?.debug ?? {}, null, 2)}</pre>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="ghost"
              onClick={() => handleComplete()}
            >Retry</Button>
            <Button
              variant="ghost"
              onClick={() => {
                setDebugInfo(null);
                setDebugOpen(false);
              }}
            >Clear</Button>
          </div>
        </div>
      )}
    </div>
  );
}
