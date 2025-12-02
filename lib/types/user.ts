import type { VisualStyle, VisualDensity } from './illustrations';

/**
 * User Profile and Gamification Types
 * Aligned with database schema from migration 20250101000002 and 20250103
 */

export interface UserProfile {
  id: string;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  preferred_locale: 'en' | 'es';
  theme: 'dark' | 'light' | 'system';
  preferred_visual_style: VisualStyle;
  preferred_visual_density: VisualDensity;
  auto_diagramming: boolean;
  
  // Gamification
  total_xp: number;
  level: number;
  streak_days: number;
  last_activity_at: string;
  
  // Preferences
  email_notifications: boolean;
  weekly_digest: boolean;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface UserCourse {
  id: string;
  user_id: string;
  course_id: string;
  relationship_type: 'created' | 'enrolled';
  enrolled_at: string;
  completed_at: string | null;
  last_accessed_at: string;
  progress_percentage: number;
}

export interface UserProgress {
  id: string;
  user_id: string;
  course_id: string;
  module_id: string;
  completed: boolean;
  score: number | null;
  time_spent: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserXPLog {
  id: string;
  user_id: string;
  xp_amount: number;
  action_type: 'module_complete' | 'course_create' | 'article_read' | 'course_complete' | 'daily_login';
  reference_id: string | null;
  earned_at: string;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

export interface Badge {
  id: string;
  user_id: string;
  badge_type: 
    | 'first_course'
    | 'course_master'
    | 'speed_learner'
    | 'perfect_score'
    | 'week_streak'
    | 'month_streak'
    | 'year_streak'
    | 'early_adopter'
    | 'contributor'
    | 'helpful'
    | 'news_reader'
    | 'course_creator';
  badge_name: string;
  badge_icon: string;
  earned_at: string;
  metadata: Record<string, unknown>;
}

export interface UserStats {
  profile: UserProfile;
  enrolledCount: number;
  createdCount: number;
  completedCount: number;
  badges: Badge[];
  recentXP: UserXPLog[];
}

export type UpdateProfileData = Partial<Pick<
  UserProfile,
  'display_name' | 'full_name' | 'bio' | 'preferred_locale' | 'theme' | 'preferred_visual_style' | 'preferred_visual_density' | 'auto_diagramming'
>>;
