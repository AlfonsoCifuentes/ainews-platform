import { createClient } from '@supabase/supabase-js';
import { planCourseIllustrations } from './image-plan';
import { generateIllustrationWithCascade, type ImageProviderName } from './image-cascade';
import { persistModuleIllustration } from '@/lib/db/module-illustrations';
import { copyCourseCoverLocale, courseCoverExists, persistCourseCoverShared } from '@/lib/db/course-covers';
import { COURSE_COVER_NEGATIVE_PROMPT, enforceNoTextCoverPrompt } from './course-cover-no-text';

const GENERAL_ORDER: ImageProviderName[] = ['runware', 'huggingface', 'qwen'];

type Locale = 'en' | 'es';

type CourseWithModules = {
  id: string;
  title_en: string;
  title_es: string;
  description_en: string | null;
  description_es: string | null;
  course_modules: Array<{
    id: string;
    course_id: string;
    order_index: number;
    title_en: string;
    title_es: string;
    content_en: string | null;
    content_es: string | null;
  }>;
};

function getSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

function pickLocale(course: CourseWithModules): Locale {
  return course.title_en ? 'en' : 'es';
}

function moduleContent(raw: string | null | undefined) {
  return (raw ?? '').slice(0, 6000);
}

async function generateModuleImage(moduleId: string, prompt: string, locale: Locale) {
  const order = GENERAL_ORDER;
  const cascade = await generateIllustrationWithCascade({
    moduleContent: prompt,
    locale,
    style: 'textbook',
    visualStyle: 'photorealistic',
    providerOrder: order,
    promptOverride: prompt,
  });

  if (!cascade.success || !cascade.images.length) {
    throw new Error(cascade.error || 'Image generation failed');
  }

  const image = cascade.images[0];
  return persistModuleIllustration({
    moduleId,
    locale,
    style: 'textbook',
    visualStyle: 'photorealistic',
    model: cascade.model,
    provider: cascade.provider,
    prompt: cascade.prompt.slice(0, 2000),
    base64Data: image.base64Data,
    mimeType: image.mimeType,
    source: 'script',
    metadata: { attempts: cascade.attempts, thoughtProcess: cascade.thoughtProcess },
  });
}

async function generateCourseCover(courseId: string, prompt: string, locale: Locale) {
  const hasEn = await courseCoverExists(courseId, 'en');
  const hasEs = await courseCoverExists(courseId, 'es');

  if (hasEn && !hasEs) {
    await copyCourseCoverLocale({ courseId, fromLocale: 'en', toLocale: 'es', source: 'script' });
    return;
  }
  if (!hasEn && hasEs) {
    await copyCourseCoverLocale({ courseId, fromLocale: 'es', toLocale: 'en', source: 'script' });
    return;
  }
  if (hasEn && hasEs) {
    return;
  }

  const coverPrompt = enforceNoTextCoverPrompt(prompt);
  const cascade = await generateIllustrationWithCascade({
    moduleContent: coverPrompt,
    locale,
    style: 'header',
    visualStyle: 'photorealistic',
    providerOrder: GENERAL_ORDER,
    promptOverride: coverPrompt,
    negativePromptOverride: COURSE_COVER_NEGATIVE_PROMPT,
  });

  if (!cascade.success || !cascade.images.length) {
    throw new Error(cascade.error || 'Cover generation failed');
  }

  const image = cascade.images[0];
  await persistCourseCoverShared({
    courseId,
    locales: ['en', 'es'],
    prompt: cascade.prompt.slice(0, 2000),
    model: cascade.model,
    provider: cascade.provider,
    base64Data: image.base64Data,
    mimeType: image.mimeType,
    source: 'script',
  });
}

export async function generateIllustrationsForCourse(courseId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('courses')
    .select('id,title_en,title_es,description_en,description_es,course_modules(*)')
    .eq('id', courseId)
    .single();

  if (error || !data) throw error || new Error('Course not found');
  const course = data as CourseWithModules;
  const locale = pickLocale(course);
  const modules = [...(course.course_modules ?? [])].sort((a, b) => a.order_index - b.order_index);
  if (!modules.length) return;

  const plan = await planCourseIllustrations({
    courseId: course.id,
    title: locale === 'en' ? course.title_en : course.title_es,
    description: locale === 'en' ? course.description_en ?? undefined : course.description_es ?? undefined,
    locale,
    modules: modules.map((m) => ({
      id: m.id,
      title: locale === 'en' ? m.title_en : m.title_es,
      content: moduleContent(locale === 'en' ? m.content_en : m.content_es),
    })),
  });

  if (plan.courseCover?.prompt) {
    await generateCourseCover(course.id, plan.courseCover.prompt, locale);
  }

  for (const modulePlan of plan.modules) {
    const moduleEntry = modules.find((m) => m.id === modulePlan.moduleId) ?? modules.find((m) => m.title_en === modulePlan.moduleTitle || m.title_es === modulePlan.moduleTitle);
    if (!moduleEntry) continue;

    if (modulePlan.images?.length) {
      await generateModuleImage(moduleEntry.id, modulePlan.images[0].prompt, locale);
    }
  }
}
