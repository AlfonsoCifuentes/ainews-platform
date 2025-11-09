import type { PostgrestSingleResponse } from '@supabase/supabase-js';

const DEFAULT_DURATION_MINUTES = 15;
const MAX_DURATION_MINUTES = 120;
const MIN_DURATION_MINUTES = 5;

export type CourseDifficulty = 'beginner' | 'intermediate' | 'advanced';

type ModuleResource = {
  title: string;
  url: string;
  type?: string | null;
};

type RawModuleRecord = {
  id: string;
  title_en: string | null;
  title_es: string | null;
  content_en: string | null;
  content_es: string | null;
  order_index: number | null;
  duration_minutes?: number | null;
  estimated_time?: number | null;
  content_type?: string | null;
  type?: string | null;
  is_free?: boolean | null;
  resources?: unknown;
};

type RawCourseRecord = {
  id: string;
  title_en: string;
  title_es: string;
  description_en: string | null;
  description_es: string | null;
  category: string | null;
  difficulty?: string | null;
  difficulty_level?: string | null;
  duration_minutes?: number | null;
  total_duration_minutes?: number | null;
  topics?: unknown;
  enrollment_count?: number | null;
  enrolled_count?: number | null;
  rating_avg?: number | null;
  view_count?: number | null;
  thumbnail_url?: string | null;
  prerequisites_en?: string | null;
  prerequisites_es?: string | null;
  learning_objectives_en?: unknown;
  learning_objectives_es?: unknown;
  course_modules?: RawModuleRecord[] | null;
};

export type NormalizedModule = {
  id: string;
  title_en: string;
  title_es: string;
  content_en: string;
  content_es: string;
  description_en: string;
  description_es: string;
  order_index: number;
  duration_minutes: number;
  content_type: 'video' | 'article' | 'quiz' | 'interactive';
  is_free: boolean;
  resources: ModuleResource[];
};

type OverriddenKeys =
  | 'duration_minutes'
  | 'total_duration_minutes'
  | 'enrollment_count'
  | 'enrolled_count'
  | 'rating_avg'
  | 'view_count'
  | 'topics'
  | 'difficulty'
  | 'difficulty_level'
  | 'learning_objectives_en'
  | 'learning_objectives_es'
  | 'course_modules';

export type NormalizedCourse = Omit<RawCourseRecord, OverriddenKeys> & {
  duration_minutes: number;
  enrollment_count: number;
  rating_avg: number;
  view_count: number;
  topics: string[];
  difficulty: CourseDifficulty;
  learning_objectives_en: string[];
  learning_objectives_es: string[];
  course_modules: NormalizedModule[];
};

export function normalizeCourseResponse(
  response: PostgrestSingleResponse<RawCourseRecord>
): NormalizedCourse | null {
  if (!response.data) {
    return null;
  }

  return normalizeCourseRecord(response.data);
}

export function normalizeCourseRecord(course: RawCourseRecord): NormalizedCourse {
  const modules = normalizeModules(course.course_modules ?? []);
  const durationFromModules = modules.reduce(
    (total, module) => total + module.duration_minutes,
    0
  );

  const difficulty = normalizeDifficulty(course.difficulty ?? course.difficulty_level);

  const topics = Array.isArray(course.topics)
    ? course.topics.filter(isNonEmptyString)
    : [];

  const learningObjectivesEn = normalizeObjectives(
    course.learning_objectives_en,
    modules,
    'en'
  );
  const learningObjectivesEs = normalizeObjectives(
    course.learning_objectives_es,
    modules,
    'es'
  );

  return {
    ...course,
    difficulty,
    topics,
    duration_minutes:
      course.duration_minutes ?? course.total_duration_minutes ?? durationFromModules,
    enrollment_count: course.enrollment_count ?? course.enrolled_count ?? 0,
    rating_avg: course.rating_avg ?? 0,
    view_count: course.view_count ?? 0,
    learning_objectives_en: learningObjectivesEn,
    learning_objectives_es: learningObjectivesEs,
    course_modules: modules,
  };
}

function normalizeModules(modules: RawModuleRecord[]): NormalizedModule[] {
  return modules
    .filter((module): module is RawModuleRecord => Boolean(module?.id))
    .map((module) => {
      const order = typeof module.order_index === 'number' ? module.order_index : 0;
      const contentEn = module.content_en ?? '';
      const contentEs = module.content_es ?? '';
      return {
        id: module.id,
        title_en: module.title_en ?? module.title_es ?? 'Module',
  title_es: module.title_es ?? module.title_en ?? 'Modulo',
        content_en: contentEn,
        content_es: contentEs,
        description_en: summarizeContent(contentEn),
        description_es: summarizeContent(contentEs),
        order_index: order,
        duration_minutes: normalizeDuration(
          module.duration_minutes ?? module.estimated_time ?? estimateDuration(contentEn)
        ),
        content_type: normalizeContentType(module.content_type ?? module.type),
        is_free: Boolean(module.is_free ?? order === 0),
        resources: normalizeResources(module.resources),
      };
    })
    .sort((a, b) => a.order_index - b.order_index);
}

function normalizeResources(input: unknown): ModuleResource[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((resource) => {
      if (!resource || typeof resource !== 'object') {
        return null;
      }

      const title = 'title' in resource && typeof resource.title === 'string'
        ? resource.title.trim()
        : '';
      const url = 'url' in resource && typeof resource.url === 'string'
        ? resource.url.trim()
        : '';

      if (!title || !url) {
        return null;
      }

      const type = 'type' in resource && typeof resource.type === 'string'
        ? resource.type
        : null;

      return { title, url, type } satisfies ModuleResource;
    })
    .filter(Boolean) as ModuleResource[];
}

function normalizeDuration(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_DURATION_MINUTES;
  }

  return Math.max(
    MIN_DURATION_MINUTES,
    Math.min(MAX_DURATION_MINUTES, Math.round(value))
  );
}

function normalizeContentType(value?: string | null): NormalizedModule['content_type'] {
  switch (value) {
    case 'video':
    case 'quiz':
    case 'interactive':
    case 'article':
      return value;
    default:
      return 'article';
  }
}

function normalizeDifficulty(value?: string | null): CourseDifficulty {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase() as CourseDifficulty;
    if (normalized === 'beginner' || normalized === 'intermediate' || normalized === 'advanced') {
      return normalized;
    }
  }

  return 'beginner';
}

function summarizeContent(content: string): string {
  if (!content) {
    return '';
  }

  const withoutCodeBlocks = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ');

  const plainText = withoutCodeBlocks
    .replace(/\[(.*?)]\((.*?)\)/g, '$1')
    .replace(/[>*#_\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!plainText) {
    return '';
  }

  const sentences = plainText
    .split(/[.!?]/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const summary = sentences.slice(0, 2).join('. ');
  return summary.length > 280 ? `${summary.slice(0, 277)}...` : summary;
}

function estimateDuration(content: string): number {
  if (!content) {
    return DEFAULT_DURATION_MINUTES;
  }

  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const estimatedMinutes = wordCount / 200 * 60; // ~200 words/minute reading speed
  return normalizeDuration(estimatedMinutes);
}

function normalizeObjectives(
  input: unknown,
  modules: NormalizedModule[],
  locale: 'en' | 'es'
): string[] {
  if (Array.isArray(input) && input.every((item) => typeof item === 'string')) {
    return (input as string[]).filter(isNonEmptyString);
  }

  const fallback = modules
    .map((module) => (locale === 'en' ? module.title_en : module.title_es))
    .filter(isNonEmptyString)
    .slice(0, 6);

  return fallback;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
