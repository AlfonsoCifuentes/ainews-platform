-- User bookmarks for articles and entities
create table if not exists public.user_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  content_type text not null check (content_type in ('article', 'course', 'entity')),
  content_id uuid not null,
  notes text,
  tags text[] default '{}',
  created_at timestamptz not null default now()
);

create index if not exists user_bookmarks_user_idx on public.user_bookmarks (user_id, created_at desc);
create index if not exists user_bookmarks_content_idx on public.user_bookmarks (content_type, content_id);

-- Reading history
create table if not exists public.reading_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  article_id uuid references public.news_articles(id) on delete cascade,
  read_percentage int default 0 check (read_percentage >= 0 and read_percentage <= 100),
  time_spent_seconds int default 0,
  last_read_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists reading_history_user_idx on public.reading_history (user_id, last_read_at desc);
create unique index if not exists reading_history_unique on public.reading_history (user_id, article_id);

-- Trending topics cache
create table if not exists public.trending_topics (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  count int not null default 0,
  momentum float not null default 0,
  article_ids text[] default '{}',
  entity_ids text[] default '{}',
  detected_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index if not exists trending_topics_momentum_idx on public.trending_topics (momentum desc, detected_at desc);
create index if not exists trending_topics_expires_idx on public.trending_topics (expires_at);

-- Auto-cleanup expired trending topics
create or replace function public.cleanup_expired_trends()
returns void
language plpgsql
as $$
begin
  delete from public.trending_topics where expires_at < now();
end;
$$;

-- RLS policies
alter table public.user_bookmarks enable row level security;
alter table public.reading_history enable row level security;
alter table public.trending_topics enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_bookmarks' and policyname='Users manage own bookmarks'
  ) then
    execute 'create policy "Users manage own bookmarks" on public.user_bookmarks for all using (auth.uid() = user_id)';
  end if;
  
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='reading_history' and policyname='Users manage own history'
  ) then
    execute 'create policy "Users manage own history" on public.reading_history for all using (auth.uid() = user_id)';
  end if;
  
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='trending_topics' and policyname='Trending public read'
  ) then
    execute 'create policy "Trending public read" on public.trending_topics for select using (true)';
  end if;
end $$;
