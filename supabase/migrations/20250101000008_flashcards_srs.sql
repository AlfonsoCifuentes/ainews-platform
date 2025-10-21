-- Phase 5: SRS Flashcards System
-- Spaced Repetition System for learning and retention

create table if not exists flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id text not null,
  front text not null,
  back text not null,
  ease_factor numeric(3,2) not null default 2.5,
  interval_days integer not null default 0,
  repetitions integer not null default 0,
  due_at timestamp with time zone not null default now(),
  last_reviewed_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Indexes for efficient queries
create index if not exists flashcards_user_id_idx on flashcards(user_id);
create index if not exists flashcards_due_at_idx on flashcards(due_at);
create index if not exists flashcards_content_id_idx on flashcards(content_id);

-- RLS policies
alter table flashcards enable row level security;

create policy "Users can view own flashcards"
  on flashcards for select
  using (auth.uid() = user_id);

create policy "Users can create own flashcards"
  on flashcards for insert
  with check (auth.uid() = user_id);

create policy "Users can update own flashcards"
  on flashcards for update
  using (auth.uid() = user_id);

create policy "Users can delete own flashcards"
  on flashcards for delete
  using (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
create or replace function update_flashcards_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger flashcards_updated_at
  before update on flashcards
  for each row
  execute function update_flashcards_updated_at();
