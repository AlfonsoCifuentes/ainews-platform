-- Add match_entities function for semantic search
create or replace function public.match_entities(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 10
)
returns table (
  id uuid,
  similarity float,
  entity jsonb
)
language plpgsql
as $$
begin
  return query
  select
    e.id,
    1 - (e.embedding <=> query_embedding) as similarity,
    jsonb_build_object(
      'id', e.id,
      'name', e.name,
      'type', e.type,
      'description', e.description
    ) as entity
  from public.entities e
  where e.embedding is not null
    and 1 - (e.embedding <=> query_embedding) > match_threshold
  order by e.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Add function to auto-generate embeddings (placeholder)
-- In production, this would call an external API or trigger a background job
create or replace function public.update_entity_embedding()
returns trigger
language plpgsql
as $$
begin
  -- Placeholder: In production, trigger background job to generate embedding
  -- For now, just ensure the field exists
  if new.embedding is null then
    new.embedding := null; -- Will be updated by background process
  end if;
  return new;
end;
$$;

-- Add trigger for new entities
drop trigger if exists update_entity_embedding_trigger on public.entities;
create trigger update_entity_embedding_trigger
  before insert or update on public.entities
  for each row
  execute function public.update_entity_embedding();
