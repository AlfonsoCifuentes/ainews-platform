export interface IEntity {
  id: string;
  type: string;
  name: string;
  aliases?: string[];
  description?: string | null;
  metadata?: Record<string, unknown>;
  embedding?: number[] | null;
  created_at?: string;
}

export interface IRelation {
  id: string;
  source_id: string;
  target_id: string;
  rel_type: string;
  weight?: number;
  evidence?: Array<Record<string, unknown>>;
  first_seen?: string;
  last_seen?: string;
}

export interface ICitation {
  id: string;
  entity_id?: string | null;
  relation_id?: string | null;
  article_id?: string | null;
  quote?: string | null;
  source_url?: string | null;
  published_at?: string | null;
  created_at?: string;
}

export type KGSearchResult = {
  entity: IEntity;
  score?: number;
};
