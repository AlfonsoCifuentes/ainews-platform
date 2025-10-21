-- Phase 5: Citations and Fact-Checking System
-- Track sources, quotes, and evidence for entities and relations

create table if not exists citations (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references entities(id) on delete cascade,
  relation_id uuid references entity_relations(id) on delete cascade,
  article_id text,
  quote text not null,
  source_url text not null,
  source_title text,
  published_at timestamp with time zone,
  confidence_score numeric(3,2) check (confidence_score >= 0 and confidence_score <= 1),
  verified boolean default false,
  created_at timestamp with time zone not null default now(),
  
  -- At least one of entity_id, relation_id, or article_id must be set
  constraint citations_target_check check (
    entity_id is not null or 
    relation_id is not null or 
    article_id is not null
  )
);

-- Indexes
create index if not exists citations_entity_id_idx on citations(entity_id);
create index if not exists citations_relation_id_idx on citations(relation_id);
create index if not exists citations_article_id_idx on citations(article_id);
create index if not exists citations_confidence_score_idx on citations(confidence_score desc);

-- RLS policies (public read, service role write)
alter table citations enable row level security;

create policy "Anyone can view citations"
  on citations for select
  using (true);

create policy "Service role can manage citations"
  on citations for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- Fact-checking metadata table
create table if not exists fact_checks (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references entities(id) on delete cascade,
  relation_id uuid references entity_relations(id) on delete cascade,
  claim text not null,
  verdict text check (verdict in ('true', 'false', 'misleading', 'unverified', 'needs-context')),
  confidence numeric(3,2) check (confidence >= 0 and confidence <= 1),
  evidence jsonb, -- Array of citation IDs and notes
  checked_by text, -- AI agent or human reviewer
  checked_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  
  constraint fact_checks_target_check check (
    entity_id is not null or relation_id is not null
  )
);

-- Indexes
create index if not exists fact_checks_entity_id_idx on fact_checks(entity_id);
create index if not exists fact_checks_relation_id_idx on fact_checks(relation_id);
create index if not exists fact_checks_verdict_idx on fact_checks(verdict);
create index if not exists fact_checks_confidence_idx on fact_checks(confidence desc);

-- RLS policies
alter table fact_checks enable row level security;

create policy "Anyone can view fact checks"
  on fact_checks for select
  using (true);

create policy "Service role can manage fact checks"
  on fact_checks for all
  using (auth.jwt() ->> 'role' = 'service_role');
