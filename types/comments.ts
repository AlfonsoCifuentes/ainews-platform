/**
 * Comment and User Profile Types
 */

export interface UserProfile {
  username: string;
  display_name?: string;
  avatar_url: string | null;
}

export interface CommentReaction {
  id: string;
  user_id: string;
  comment_id: string;
  reaction_type: string;
  created_at: string;
}

export interface Comment {
  id: string;
  content: string;
  user_id: string;
  article_id?: string | null;
  course_id?: string | null;
  parent_comment_id?: string | null;
  created_at: string;
  updated_at: string;
  is_edited?: boolean;
  reactions_count: number;
  user_profiles: UserProfile;
  comment_reactions?: CommentReaction[];
  replies?: Comment[];
}
