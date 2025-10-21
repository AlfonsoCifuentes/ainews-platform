-- Phase 5: Knowledge Graph schema (entities, relations, citations)
-- Requires: pgvector extension already enabled

create table if not exists public.entities (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  name text not null,
  aliases text[] default '{}',
  description text,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create unique index if not exists entities_unique_type_name_idx
  on public.entities (type, name);

-- Optional semantic search index (requires pgvector IVFFlat)
do $$ begin
  perform 1 from pg_indexes where schemaname='public' and indexname='entities_embedding_idx';
  if not found then
    execute 'create index entities_embedding_idx on public.entities using ivfflat (embedding vector_l2_ops) with (lists = 100)';
  end if;
exception when others then
  -- ignore if ivfflat not available in current plan
  null;
end $$;

create table if not exists public.entity_relations (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.entities(id) on delete cascade,
  target_id uuid not null references public.entities(id) on delete cascade,
  rel_type text not null,
  weight numeric not null default 1.0,
  evidence jsonb not null default '[]'::jsonb,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

create index if not exists entity_relations_pair_idx
  on public.entity_relations (source_id, target_id, rel_type);

create table if not exists public.citations (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references public.entities(id) on delete cascade,
  relation_id uuid references public.entity_relations(id) on delete cascade,
  article_id uuid references public.news_articles(id) on delete set null,
  quote text,
  source_url text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

-- RLS: public read; service role writes (service role bypasses RLS in Supabase)
alter table public.entities enable row level security;
alter table public.entity_relations enable row level security;
alter table public.citations enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='entities' and policyname='Entities public read'
  ) then
    execute 'create policy "Entities public read" on public.entities for select using (true)';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='entity_relations' and policyname='Relations public read'
  ) then
    execute 'create policy "Relations public read" on public.entity_relations for select using (true)';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='citations' and policyname='Citations public read'
  ) then
    execute 'create policy "Citations public read" on public.citations for select using (true)';
  end if;
end $$;
