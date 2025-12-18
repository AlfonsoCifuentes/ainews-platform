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
import { ModuleIllustration } from '@/components/courses/ModuleIllustration';
import { useToast } from '@/components/shared/ToastProvider';
import { useUser } from '@/lib/hooks/useUser';
import { useModuleVisualSlots } from '@/hooks/use-module-visual-slots';
import { getIllustrationStyleForSlot } from '@/lib/utils/visual-slots';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { NormalizedModule } from '@/lib/courses/normalize';
import { loggers } from '@/lib/utils/logger';
import { normalizeEditorialMarkdown } from '@/lib/courses/editorial-style';

// Brutalist design tokens
const BRUTALIST = {
  bg: '#020309',
  bgCard: '#0A0A0A',
  text: '#EAEAEA',
  textMuted: '#888888',
  border: '#1F1F1F',
  accent: '#EAEAEA',
};

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
    <button
      onClick={onClick}
      disabled={isCompleting || currentProgress?.completed}
      className={`${className} complete-module-button flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
      style={{
        backgroundColor: currentProgress?.completed ? 'transparent' : BRUTALIST.text,
        color: currentProgress?.completed ? BRUTALIST.textMuted : BRUTALIST.bg,
        border: `1px solid ${currentProgress?.completed ? BRUTALIST.border : BRUTALIST.text}`,
      }}
    >
      {currentProgress?.completed ? (
        <>
          <CheckCircle2 className="w-4 h-4" />
          {t.completed}
        </>
      ) : isCompleting ? (
        t.completing
      ) : (
        t.markComplete
      )}
    </button>
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
    visualHighlights: 'Visual highlights',
    visualGalleryNote: 'AI illustrations anchored to this section',
    practiceExerciseTitle: 'Practice Exercise',
    practiceExerciseDescription: 'Try a short answer and submit for automatic grading.',
    practiceExercisePlaceholder: 'Write your short answer here...',
    practiceExerciseSubmit: 'Submit Answer',
    gradedBy: 'Graded by',
    score: 'Score',
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
    visualHighlights: 'Destellos visuales',
    visualGalleryNote: 'Ilustraciones IA ancladas a esta sección',
    practiceExerciseTitle: 'Ejercicio de práctica',
    practiceExerciseDescription: 'Responde brevemente y envíalo para corrección automática.',
    practiceExercisePlaceholder: 'Escribe tu respuesta corta aquí...',
    practiceExerciseSubmit: 'Enviar respuesta',
    gradedBy: 'Corregido por',
    score: 'Puntuación',
  }, [locale]);

  const title = locale === 'en' ? module.title_en : module.title_es;
  const description = locale === 'en' ? module.description_en : module.description_es;
  const content = locale === 'en' ? module.content_en : module.content_es;
  const displayContent = generatedContent || content;

  const normalizedContent = useMemo(() => {
    return normalizeEditorialMarkdown(displayContent || '', {
      title,
      standfirst: description,
      locale,
    });
  }, [displayContent, title, description, locale]);
  const { slots: visualSlots } = useModuleVisualSlots(module.id, locale);
  const supportingSlots = useMemo(
    () => visualSlots.filter((slot) => slot.slotType !== 'header'),
    [visualSlots]
  );

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
      hasContent: !!(normalizedContent?.trim()),
      contentLength: normalizedContent?.length || 0,
      contentPreview: normalizedContent?.substring(0, 100) || 'NO CONTENT'
    });
    console.groupEnd();
    
    loggers.success('ModulePlayer', 'Component mounted', {
      moduleId: module.id,
      enrollmentId,
      currentProgress: currentProgress?.completed ? 'Completed' : 'Not completed',
      contentType: module.content_type,
      hasContent: !!(normalizedContent?.trim())
    });
  }, [module.id, enrollmentId, currentProgress?.completed, currentProgress?.completed_at, currentProgress?.id, module.order_index, module.title_en, module.title_es, module.content_type, normalizedContent]);

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
            <Icon className="w-5 h-5" style={{ color: BRUTALIST.text }} />
            <h1 className="font-sans text-xl md:text-2xl font-black tracking-tight" style={{ color: BRUTALIST.text }}>{title}</h1>
          </div>
          <p className="font-sans text-sm md:text-base leading-relaxed" style={{ color: BRUTALIST.textMuted }}>{description}</p>
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
          <div className="aspect-video overflow-hidden border" style={{ backgroundColor: BRUTALIST.bg, borderColor: BRUTALIST.border }}>
            <iframe
              src={module.video_url}
              className="w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        ) : (
          <div className="aspect-video overflow-hidden border flex items-center justify-center" style={{ backgroundColor: BRUTALIST.bgCard, borderColor: BRUTALIST.border }}>
            <div className="text-center" style={{ color: BRUTALIST.textMuted }}>
              {isGeneratingContent ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin h-8 w-8 border-2 border-t-transparent" style={{ borderColor: BRUTALIST.text, borderTopColor: 'transparent' }}></div>
                  <p className="font-mono text-lg">{t.generatingContent}</p>
                </div>
              ) : (
                <>
                  <PlayCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="font-mono text-lg">
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
          className="max-w-none p-6 md:p-8 border"
          style={{ backgroundColor: BRUTALIST.bgCard, borderColor: BRUTALIST.border }}
        >
          {isGeneratingContent ? (
            <div className="text-center py-12" style={{ color: BRUTALIST.textMuted }}>
              <div className="inline-flex flex-col items-center gap-3">
                <div className="animate-spin h-8 w-8 border-2 border-t-transparent" style={{ borderColor: BRUTALIST.text, borderTopColor: 'transparent' }}></div>
                <p className="font-mono text-lg">{t.generatingContent}</p>
              </div>
            </div>
          ) : normalizedContent && normalizedContent.trim() ? (
            <>
              <div className="mx-auto max-w-[72ch]">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ ...props }) => (
                      <h1
                        className="font-sans text-2xl md:text-3xl font-black mb-6 mt-10 first:mt-0 tracking-tight"
                        style={{ color: BRUTALIST.text }}
                        {...props}
                      />
                    ),
                    h2: ({ ...props }) => (
                      <h2
                        className="font-sans text-xl md:text-2xl font-bold mb-4 mt-10 border-l-4 pl-4"
                        style={{ color: BRUTALIST.text, borderColor: BRUTALIST.text }}
                        {...props}
                      />
                    ),
                    h3: ({ ...props }) => (
                      <h3
                        className="font-sans text-lg md:text-xl font-semibold mb-3 mt-8"
                        style={{ color: BRUTALIST.text }}
                        {...props}
                      />
                    ),
                    p: ({ ...props }) => (
                      <p
                        className="font-sans text-base md:text-lg leading-relaxed mb-5"
                        style={{ color: BRUTALIST.text }}
                        {...props}
                      />
                    ),
                    ul: ({ ...props }) => (
                      <ul className="space-y-2 my-5 pl-6 list-disc" {...props} />
                    ),
                    ol: ({ ...props }) => (
                      <ol className="space-y-2 my-5 pl-6 list-decimal" {...props} />
                    ),
                    li: ({ ...props }) => (
                      <li
                        className="font-sans text-base md:text-lg leading-relaxed"
                        style={{ color: BRUTALIST.text }}
                        {...props}
                      />
                    ),
                    blockquote: ({ ...props }) => (
                      <blockquote
                        className="border-l-4 p-5 my-6 rounded-xl"
                        style={{
                          borderColor: BRUTALIST.text,
                          backgroundColor: BRUTALIST.bg,
                          color: BRUTALIST.text,
                        }}
                        {...props}
                      />
                    ),
                    a: ({ ...props }) => (
                      <a
                        className="font-sans underline underline-offset-4 transition-colors hover:opacity-80"
                        style={{ color: BRUTALIST.text }}
                        target="_blank"
                        rel="noopener noreferrer"
                        {...props}
                      />
                    ),
                    table: ({ ...props }) => (
                      <div className="my-7 overflow-x-auto border rounded-xl" style={{ borderColor: BRUTALIST.border }}>
                        <table
                          className="w-full border-collapse text-sm md:text-base"
                          style={{ color: BRUTALIST.text }}
                          {...props}
                        />
                      </div>
                    ),
                    thead: ({ ...props }) => <thead style={{ backgroundColor: BRUTALIST.bg }} {...props} />,
                    th: ({ ...props }) => (
                      <th
                        className="p-3 text-left text-xs font-mono font-semibold uppercase tracking-[0.2em] align-top"
                        style={{ color: BRUTALIST.text, borderBottom: `1px solid ${BRUTALIST.border}` }}
                        {...props}
                      />
                    ),
                    td: ({ ...props }) => (
                      <td
                        className="p-3 align-top font-sans"
                        style={{ borderBottom: `1px solid ${BRUTALIST.border}` }}
                        {...props}
                      />
                    ),
                    // Code blocks and inline code
                    code(props) {
                      const { inline, className, children, ...rest } = props as {
                        inline?: boolean;
                        className?: string;
                        children?: React.ReactNode;
                      };
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <div className="my-7 overflow-hidden border" style={{ borderColor: BRUTALIST.border }}>
                          <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" {...rest}>
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        </div>
                      ) : (
                        <code
                          className="px-2 py-1 font-mono text-[0.95em]"
                          style={{ backgroundColor: BRUTALIST.bg, color: BRUTALIST.text }}
                          {...rest}
                        >
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {normalizedContent}
                </ReactMarkdown>
              </div>
              {supportingSlots.length > 0 && (
                <div className="mt-10 space-y-4 border p-6" style={{ backgroundColor: BRUTALIST.bg, borderColor: BRUTALIST.border }}>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: BRUTALIST.textMuted }}>
                      {t.visualHighlights}
                    </p>
                    <p className="font-mono text-sm" style={{ color: BRUTALIST.textMuted }}>{t.visualGalleryNote}</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {supportingSlots.slice(0, 6).map((slot, index) => (
                      <ModuleIllustration
                        key={slot.id}
                        moduleId={module.id}
                        content={normalizedContent || ''}
                        locale={locale}
                        style={getIllustrationStyleForSlot(slot)}
                        visualStyle={slot.suggestedVisualStyle}
                        slot={slot}
                        autoGenerate={index < 2}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12" style={{ color: BRUTALIST.textMuted }}>
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-mono text-lg">
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
        <div className="space-y-6 p-8 border" style={{ backgroundColor: BRUTALIST.bgCard, borderColor: BRUTALIST.border }}>
          {module.quiz_questions.map((question, qIndex) => (
            <div key={qIndex} className="space-y-3">
              <h3 className="font-mono text-lg font-bold" style={{ color: BRUTALIST.text }}>
                {qIndex + 1}. {question.question}
              </h3>
              <div className="space-y-2">
                {question.options.map((option: string, oIndex: number) => (
                  <button
                    key={oIndex}
                    onClick={() => setQuizAnswers({ ...quizAnswers, [qIndex]: oIndex })}
                    className="w-full p-4 text-left font-mono text-sm transition-colors border"
                    style={{
                      backgroundColor: quizAnswers[qIndex] === oIndex ? BRUTALIST.text : BRUTALIST.bg,
                      color: quizAnswers[qIndex] === oIndex ? BRUTALIST.bg : BRUTALIST.text,
                      borderColor: quizAnswers[qIndex] === oIndex ? BRUTALIST.text : BRUTALIST.border,
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button
            onClick={handleQuizSubmit}
            disabled={Object.keys(quizAnswers).length !== module.quiz_questions.length}
            className="w-full py-3 font-mono text-sm uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: BRUTALIST.text,
              color: BRUTALIST.bg,
              border: `1px solid ${BRUTALIST.text}`,
            }}
          >
            {t.submitQuiz}
          </button>
        </div>
        ) : (
          <div className="p-8 border text-center" style={{ backgroundColor: BRUTALIST.bgCard, borderColor: BRUTALIST.border, color: BRUTALIST.textMuted }}>
            <FileQuestion className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-mono text-lg">
              {locale === 'en'
                ? 'Quiz questions are being prepared. Please check back soon.'
                : 'Las preguntas del cuestionario se están preparando. Por favor, vuelve pronto.'}
            </p>
          </div>
        )
      )}

      {/* Resources */}
      {module.resources && module.resources.length > 0 && (
        <div className="p-6 border" style={{ backgroundColor: BRUTALIST.bgCard, borderColor: BRUTALIST.border }}>
          <h3 className="font-mono text-lg font-bold mb-4 flex items-center gap-2" style={{ color: BRUTALIST.text }}>
            <Code className="w-5 h-5" style={{ color: BRUTALIST.text }} />
            {t.resources}
          </h3>
          <ul className="space-y-2">
            {module.resources.map((resource, i) => (
              <li key={i}>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 font-mono text-sm underline transition-colors hover:opacity-70"
                  style={{ color: BRUTALIST.text }}
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
      <div className="p-6 border mt-6" style={{ backgroundColor: BRUTALIST.bgCard, borderColor: BRUTALIST.border }}>
        <h3 className="font-sans text-lg font-bold mb-2" style={{ color: BRUTALIST.text }}>{t.practiceExerciseTitle}</h3>
        <p className="font-sans text-sm mb-3" style={{ color: BRUTALIST.textMuted }}>{t.practiceExerciseDescription}</p>
        <textarea
          value={exerciseAnswer}
          onChange={(e) => setExerciseAnswer(e.target.value)}
          className="w-full p-3 font-mono text-sm mb-3 min-h-[120px] border"
          style={{ backgroundColor: BRUTALIST.bg, color: BRUTALIST.text, borderColor: BRUTALIST.border }}
          placeholder={t.practiceExercisePlaceholder}
        />
        <div className="flex gap-4 items-center">
          <button 
            onClick={() => handleExerciseSubmit()} 
            disabled={!exerciseAnswer.trim()}
            className="px-4 py-2 font-mono text-sm uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: BRUTALIST.text,
              color: BRUTALIST.bg,
              border: `1px solid ${BRUTALIST.text}`,
            }}
          >
            {t.practiceExerciseSubmit}
          </button>
          {gradingResult && (
            <div className="font-mono text-sm" style={{ color: BRUTALIST.text }}>
              <div>{t.score}: {gradingResult.score}%</div>
              <div className="text-xs" style={{ color: BRUTALIST.textMuted }}>{gradingResult.feedback}</div>
              {gradingResult.debug?.usedModel && (
                <div className="text-xs mt-1" style={{ color: BRUTALIST.textMuted }}>{t.gradedBy}: {String(gradingResult.debug.usedModel)}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Botón de completar al final del contenido */}
      <div className="flex justify-center mt-8 pt-8" style={{ borderTop: `2px solid ${BRUTALIST.border}` }}>
        <CompleteModuleButton
          locale={locale}
          currentProgress={currentProgress}
          isCompleting={isCompleting}
          onClick={handleComplete}
          className="w-full sm:w-auto min-w-[250px]"
        />
      </div>
      {/* Debug toggle button */}
      <div className="fixed bottom-6 right-6 z-[9999]">
        <button
          onClick={() => setDebugOpen(!debugOpen)}
          className="p-2 shadow-lg transition-colors"
          style={{ backgroundColor: BRUTALIST.text, color: BRUTALIST.bg }}
          title="Toggle debug overlay"
        >
          🐞
        </button>
      </div>

      {/* Debug overlay panel */}
      {debugOpen && (
        <div 
          className="fixed bottom-20 right-6 z-[9999] w-[520px] max-h-[72vh] overflow-auto border p-4 shadow-2xl font-mono text-xs"
          style={{ backgroundColor: BRUTALIST.bgCard, borderColor: BRUTALIST.border, color: BRUTALIST.text }}
        >
          <div className="flex items-center justify-between mb-2">
            <strong>Progress API Debug</strong>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  try { navigator.clipboard.writeText(JSON.stringify(debugInfo || {}, null, 2)); } catch {};
                }}
                className="px-2 py-1 border"
                style={{ backgroundColor: BRUTALIST.bg, borderColor: BRUTALIST.border, color: BRUTALIST.text }}
              >Copy</button>
              <button
                onClick={() => setDebugOpen(false)}
                className="px-2 py-1 border"
                style={{ backgroundColor: BRUTALIST.bg, borderColor: BRUTALIST.border, color: BRUTALIST.text }}
              >Close</button>
            </div>
          </div>
          <div className="mb-3">
            <div className="font-bold">Last request</div>
            <pre className="whitespace-pre-wrap break-words p-2 mt-1" style={{ backgroundColor: BRUTALIST.bg, color: BRUTALIST.textMuted }}>{JSON.stringify(debugInfo?.requestBody, null, 2)}</pre>
          </div>
          <div className="mb-3">
            <div className="font-bold">Response status</div>
            <div className="mt-1" style={{ color: BRUTALIST.textMuted }}>{debugInfo?.responseStatus ?? 'N/A'} ({debugInfo?.fetchDuration ?? 0}ms)</div>
          </div>
          <div className="mb-3">
            <div className="font-bold">Raw response</div>
            <pre className="whitespace-pre-wrap break-words p-2 mt-1" style={{ backgroundColor: BRUTALIST.bg, color: BRUTALIST.textMuted }}>{debugInfo?.responseText ?? 'N/A'}</pre>
          </div>
          <div className="mb-3">
            <div className="font-bold">Server debug</div>
            <pre className="whitespace-pre-wrap break-words p-2 mt-1" style={{ backgroundColor: BRUTALIST.bg, color: BRUTALIST.textMuted }}>{JSON.stringify(debugInfo?.serverDebug ?? debugInfo?.parsed?.debug ?? {}, null, 2)}</pre>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => handleComplete()}
              className="px-3 py-1 border"
              style={{ backgroundColor: BRUTALIST.bg, borderColor: BRUTALIST.border, color: BRUTALIST.text }}
            >Retry</button>
            <button
              onClick={() => {
                setDebugInfo(null);
                setDebugOpen(false);
              }}
              className="px-3 py-1 border"
              style={{ backgroundColor: BRUTALIST.bg, borderColor: BRUTALIST.border, color: BRUTALIST.text }}
            >Clear</button>
          </div>
        </div>
      )}
    </div>
  );
}
