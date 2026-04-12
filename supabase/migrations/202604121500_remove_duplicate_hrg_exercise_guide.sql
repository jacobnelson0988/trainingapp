update public.exercises as e
set guide = null
where exists (
  select 1
  from unnest(coalesce(e.aliases, '{}'::text[])) as alias
  where alias ~ '^(Axelkontroll|Knäkontroll) [1-6][A-E]$'
)
and nullif(trim(coalesce(e.guide, '')), '') is not null
and nullif(trim(coalesce(e.description, '')), '') is not null
and regexp_replace(trim(e.guide), '\s+', ' ', 'g') = regexp_replace(trim(e.description), '\s+', ' ', 'g');
