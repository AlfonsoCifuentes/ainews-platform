import { LLMClient } from './llm-client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const LearningPathModuleSchema = z.object({
  id: z.string(),
  title_en: z.string(),
  title_es: z.string(),
  description_en: z.string(),
  description_es: z.string(),
  order: z.number(),
  estimated_hours: z.number(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  prerequisites: z.array(z.string()),
  resources: z.array(
    z.object({
      type: z.enum(['article', 'course', 'video', 'book', 'practice']),
      title: z.string(),
      url: z.string().optional(),
      content_id: z.string().optional()
    })
  ),
  skills: z.array(z.string()),
  quiz_id: z.string().optional()
});

export const LearningPathSchema = z.object({
  id: z.string(),
  title_en: z.string(),
  title_es: z.string(),
  description_en: z.string(),
  description_es: z.string(),
  target_role: z.string(),
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced', 'mixed']),
  estimated_total_hours: z.number(),
  modules: z.array(LearningPathModuleSchema),
  skills_covered: z.array(z.string()),
  prerequisites: z.array(z.string()),
  learning_outcomes_en: z.array(z.string()),
  learning_outcomes_es: z.array(z.string()),
  created_at: z.string(),
  user_id: z.string().optional()
});

export type LearningPath = z.infer<typeof LearningPathSchema>;
export type LearningPathModule = z.infer<typeof LearningPathModuleSchema>;

export interface UserSkillProfile {
  current_skills: string[];
  target_skills: string[];
  experience_level: 'beginner' | 'intermediate' | 'advanced';
  learning_pace: 'slow' | 'moderate' | 'fast';
  available_hours_per_week: number;
  preferred_learning_styles: ('reading' | 'video' | 'practice' | 'interactive')[];
}

export class LearningPathGenerator {
  private llm: LLMClient;
  private db: SupabaseClient;

  constructor(llmClient: LLMClient, supabaseClient: SupabaseClient) {
    this.llm = llmClient;
    this.db = supabaseClient;
  }

  /**
   * Generate personalized learning path based on user profile and goals
   */
  async generateLearningPath(
    userId: string,
    targetRole: string,
    userProfile: UserSkillProfile
  ): Promise<LearningPath> {
    // 1. Analyze skill gap
    const skillGap = await this.analyzeSkillGap(targetRole, userProfile);

    // 2. Fetch relevant content from database
    const availableContent = await this.fetchRelevantContent(skillGap.required_skills);

    // 3. Generate curriculum with LLM
    const curriculum = await this.generateCurriculum(
      targetRole,
      skillGap,
      userProfile,
      availableContent
    );

    // 4. Structure into modules
    const modules = await this.structureModules(curriculum, userProfile);

    // 5. Estimate timeline
    const timeline = this.calculateTimeline(modules, userProfile.available_hours_per_week);

    // 6. Create learning path object
    const learningPath: LearningPath = {
      id: crypto.randomUUID(),
      title_en: `Path to ${targetRole}`,
      title_es: `Ruta hacia ${targetRole}`,
      description_en: curriculum.description_en,
      description_es: curriculum.description_es,
      target_role: targetRole,
      difficulty_level: this.determineDifficultyLevel(modules),
      estimated_total_hours: timeline.total_hours,
      modules,
      skills_covered: skillGap.required_skills,
      prerequisites: skillGap.prerequisites,
      learning_outcomes_en: curriculum.learning_outcomes_en,
      learning_outcomes_es: curriculum.learning_outcomes_es,
      created_at: new Date().toISOString(),
      user_id: userId
    };

    // 7. Save to database
    await this.saveLearningPath(learningPath);

    return learningPath;
  }

  /**
   * Analyze gap between current skills and target role requirements
   */
  private async analyzeSkillGap(
    targetRole: string,
    userProfile: UserSkillProfile
  ): Promise<{
    required_skills: string[];
    missing_skills: string[];
    prerequisites: string[];
  }> {
    const prompt = `Analyze the skill requirements for the role: "${targetRole}".
    
User's current skills: ${userProfile.current_skills.join(', ')}
User's experience level: ${userProfile.experience_level}

Return a JSON object with:
{
  "required_skills": ["skill1", "skill2", ...],
  "missing_skills": ["skill_user_needs", ...],
  "prerequisites": ["foundational_skill1", ...]
}`;

    const response = await this.llm.generate(prompt, {
      temperature: 0.3,
      maxTokens: 1000
    });

    try {
      const parsed = JSON.parse(response.content);
      return {
        required_skills: parsed.required_skills || [],
        missing_skills: parsed.missing_skills || [],
        prerequisites: parsed.prerequisites || []
      };
    } catch {
      // Fallback to default skills
      return {
        required_skills: userProfile.target_skills,
        missing_skills: userProfile.target_skills.filter(
          (skill) => !userProfile.current_skills.includes(skill)
        ),
        prerequisites: []
      };
    }
  }

  /**
   * Fetch relevant articles, courses, and resources from database
   */
  private async fetchRelevantContent(skills: string[]): Promise<{
    articles: Record<string, unknown>[];
    courses: Record<string, unknown>[];
  }> {
    const { data: articles } = await this.db
      .from('news_articles')
      .select('*')
      .contains('tags', skills)
      .order('quality_score', { ascending: false })
      .limit(50);

    const { data: courses } = await this.db
      .from('courses')
      .select('*')
      .contains('topics', skills)
      .order('created_at', { ascending: false })
      .limit(20);

    return {
      articles: articles || [],
      courses: courses || []
    };
  }

  /**
   * Generate structured curriculum with LLM
   */
  private async generateCurriculum(
    targetRole: string,
    skillGap: { required_skills: string[]; missing_skills: string[]; prerequisites: string[] },
    userProfile: UserSkillProfile,
    availableContent: { articles: Record<string, unknown>[]; courses: Record<string, unknown>[] }
  ): Promise<{
    description_en: string;
    description_es: string;
    learning_outcomes_en: string[];
    learning_outcomes_es: string[];
    modules: Array<{
      title: string;
      skills: string[];
      resources: string[];
    }>;
  }> {
    const prompt = `Create a comprehensive learning curriculum for someone who wants to become a ${targetRole}.

Current skills: ${userProfile.current_skills.join(', ')}
Missing skills: ${skillGap.missing_skills.join(', ')}
Experience level: ${userProfile.experience_level}
Learning pace: ${userProfile.learning_pace}
Available hours per week: ${userProfile.available_hours_per_week}

Available resources:
- ${availableContent.articles.length} articles on related topics
- ${availableContent.courses.length} courses available

Generate a JSON curriculum with:
{
  "description_en": "English description of the path",
  "description_es": "Spanish description of the path",
  "learning_outcomes_en": ["outcome1", "outcome2", ...],
  "learning_outcomes_es": ["resultado1", "resultado2", ...],
  "modules": [
    {
      "title": "Module name",
      "skills": ["skill1", "skill2"],
      "resources": ["resource_type: description", ...]
    }
  ]
}`;

    const response = await this.llm.generate(prompt, {
      temperature: 0.5,
      maxTokens: 2000
    });

    try {
      return JSON.parse(response.content);
    } catch {
      // Fallback curriculum
      return {
        description_en: `Comprehensive learning path to master ${targetRole}`,
        description_es: `Ruta de aprendizaje completa para dominar ${targetRole}`,
        learning_outcomes_en: skillGap.required_skills.map((skill) => `Master ${skill}`),
        learning_outcomes_es: skillGap.required_skills.map((skill) => `Dominar ${skill}`),
        modules: skillGap.required_skills.map((skill, index) => ({
          title: `Module ${index + 1}: ${skill}`,
          skills: [skill],
          resources: ['article: Introduction', 'practice: Hands-on exercise']
        }))
      };
    }
  }

  /**
   * Structure modules with specific resources and metadata
   */
  private async structureModules(
    curriculum: {
      modules: Array<{ title: string; skills: string[]; resources: string[] }>;
    },
    userProfile: UserSkillProfile
  ): Promise<LearningPathModule[]> {
    return curriculum.modules.map((module, index) => {
      const difficulty = this.determineDifficulty(index, curriculum.modules.length);

      return {
        id: `module-${index + 1}`,
        title_en: module.title,
        title_es: module.title, // Would translate in production
        description_en: `Learn ${module.skills.join(', ')}`,
        description_es: `Aprende ${module.skills.join(', ')}`,
        order: index + 1,
        estimated_hours: this.estimateModuleHours(module.skills.length, userProfile.learning_pace),
        difficulty,
        prerequisites: index === 0 ? [] : [`module-${index}`],
        resources: module.resources.map((resource) => {
          const [type, title] = resource.split(': ');
          return {
            type: (type as 'article' | 'course' | 'video' | 'book' | 'practice') || 'article',
            title: title || resource,
            url: undefined,
            content_id: undefined
          };
        }),
        skills: module.skills,
        quiz_id: undefined
      };
    });
  }

  /**
   * Calculate timeline based on modules and user availability
   */
  private calculateTimeline(
    modules: LearningPathModule[],
    hoursPerWeek: number
  ): {
    total_hours: number;
    estimated_weeks: number;
  } {
    const total_hours = modules.reduce((sum, module) => sum + module.estimated_hours, 0);
    const estimated_weeks = Math.ceil(total_hours / hoursPerWeek);

    return { total_hours, estimated_weeks };
  }

  /**
   * Determine overall difficulty level
   */
  private determineDifficultyLevel(
    modules: LearningPathModule[]
  ): 'beginner' | 'intermediate' | 'advanced' | 'mixed' {
    const difficulties = modules.map((m) => m.difficulty);
    const uniqueDifficulties = [...new Set(difficulties)];

    if (uniqueDifficulties.length === 1) {
      return uniqueDifficulties[0];
    }

    return 'mixed';
  }

  /**
   * Determine module difficulty based on position
   */
  private determineDifficulty(
    index: number,
    total: number
  ): 'beginner' | 'intermediate' | 'advanced' {
    const progress = index / total;

    if (progress < 0.33) return 'beginner';
    if (progress < 0.66) return 'intermediate';
    return 'advanced';
  }

  /**
   * Estimate hours needed for module
   */
  private estimateModuleHours(skillCount: number, pace: 'slow' | 'moderate' | 'fast'): number {
    const baseHours = skillCount * 8; // 8 hours per skill

    const paceMultiplier = {
      slow: 1.5,
      moderate: 1.0,
      fast: 0.75
    };

    return Math.round(baseHours * paceMultiplier[pace]);
  }

  /**
   * Save learning path to database
   */
  private async saveLearningPath(path: LearningPath): Promise<void> {
    const { error } = await this.db.from('learning_paths').insert({
      id: path.id,
      user_id: path.user_id,
      title_en: path.title_en,
      title_es: path.title_es,
      description_en: path.description_en,
      description_es: path.description_es,
      target_role: path.target_role,
      difficulty_level: path.difficulty_level,
      estimated_total_hours: path.estimated_total_hours,
      modules: path.modules,
      skills_covered: path.skills_covered,
      prerequisites: path.prerequisites,
      learning_outcomes_en: path.learning_outcomes_en,
      learning_outcomes_es: path.learning_outcomes_es,
      created_at: path.created_at
    });

    if (error) {
      console.error('Failed to save learning path:', error);
      throw new Error('Failed to save learning path');
    }
  }

  /**
   * Get user's learning paths
   */
  async getUserLearningPaths(userId: string): Promise<LearningPath[]> {
    const { data, error } = await this.db
      .from('learning_paths')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch learning paths:', error);
      return [];
    }

    return (data as LearningPath[]) || [];
  }

  /**
   * Update user progress on a module
   */
  async updateModuleProgress(
    userId: string,
    pathId: string,
    moduleId: string,
    progress: number
  ): Promise<void> {
    const { error } = await this.db.from('learning_path_progress').upsert({
      user_id: userId,
      path_id: pathId,
      module_id: moduleId,
      progress,
      updated_at: new Date().toISOString()
    });

    if (error) {
      console.error('Failed to update module progress:', error);
      throw new Error('Failed to update progress');
    }
  }

  /**
   * Get user's progress on a learning path
   */
  async getPathProgress(
    userId: string,
    pathId: string
  ): Promise<Record<string, { progress: number; completed: boolean }>> {
    const { data, error } = await this.db
      .from('learning_path_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('path_id', pathId);

    if (error || !data) {
      return {};
    }

    const progress: Record<string, { progress: number; completed: boolean }> = {};

    for (const item of data) {
      progress[item.module_id] = {
        progress: item.progress,
        completed: item.progress >= 100
      };
    }

    return progress;
  }
}
