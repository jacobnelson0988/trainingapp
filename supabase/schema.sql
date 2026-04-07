-- ================================================================
-- KOMPLETT GRUNDSCHEMA – traningapp
-- Klistra in detta i Supabase SQL Editor på ditt STAGING-projekt.
-- Kör HELA skriptet på en gång (klicka Run).
-- ================================================================

-- ----------------------------------------------------------------
-- 1. TEAMS
-- ----------------------------------------------------------------
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

insert into public.teams (name)
values ('Standardlag')
on conflict (name) do nothing;

-- ----------------------------------------------------------------
-- 2. PROFILES  (kopplad till Supabase Auth)
-- ----------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  full_name text not null,
  role text not null,
  comment text,
  team_id uuid references public.teams(id),
  is_archived boolean not null default false,
  archived_at timestamptz,
  archived_by uuid references public.profiles(id) on delete set null,
  individual_goals_enabled boolean not null default true
);

create index if not exists profiles_is_archived_idx
  on public.profiles (is_archived);

create index if not exists profiles_player_archive_lookup_idx
  on public.profiles (role, is_archived, full_name);

-- Sätt dig själv som head_admin (byt till ditt användarnamn om det skiljer sig)
update public.profiles
set role = 'head_admin'
where lower(username) = 'jac.nel1';

-- ----------------------------------------------------------------
-- 3. EXERCISES
-- ----------------------------------------------------------------
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  exercise_type text not null,
  guide text,
  description text,
  media_url text,
  default_reps_mode text,
  muscle_groups text[] not null default '{}',
  is_active boolean default true,
  aliases text[] not null default '{}',
  display_name text,
  navigation_category text,
  primary_category text,
  constraint exercises_primary_category_check
    check (primary_category in (
      'styrka', 'bal', 'overkropp', 'underkropp', 'rorlighet_kontroll', 'kondition_tid'
    ))
);

-- ----------------------------------------------------------------
-- 4. WORKOUT TEMPLATES
-- ----------------------------------------------------------------
create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  name text,
  label text not null,
  code text not null,
  info text,
  team_id uuid references public.teams(id),
  warmup_cardio text,
  warmup_technique text,
  workout_kind text not null default 'gym',
  running_type text,
  running_interval_time text,
  running_intervals_count integer,
  running_distance numeric,
  running_time text
);

create index if not exists workout_templates_team_id_idx
  on public.workout_templates (team_id);

create index if not exists workout_templates_team_id_workout_kind_idx
  on public.workout_templates (team_id, workout_kind);

-- ----------------------------------------------------------------
-- 5. WORKOUT TEMPLATE EXERCISES
-- ----------------------------------------------------------------
create table if not exists public.workout_template_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_template_id uuid not null references public.workout_templates(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  sort_order integer,
  target_sets integer,
  target_reps integer,
  target_reps_mode text,
  target_weight numeric,
  custom_guide text,
  target_reps_min integer,
  target_reps_max integer,
  target_reps_text text,
  target_duration_text text
);

-- ----------------------------------------------------------------
-- 6. WORKOUT TEMPLATE EXERCISE ALTERNATIVES
-- ----------------------------------------------------------------
create table if not exists public.workout_template_exercise_alternatives (
  id uuid primary key default gen_random_uuid(),
  workout_template_exercise_id uuid not null references public.workout_template_exercises(id) on delete cascade,
  alternative_exercise_id uuid not null references public.exercises(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (workout_template_exercise_id, alternative_exercise_id)
);

-- ----------------------------------------------------------------
-- 7. WORKOUT LOGS
-- ----------------------------------------------------------------
create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workout_session_id text,
  pass_name text,
  exercise text,
  exercise_name text,
  is_completed boolean,
  created_at timestamptz not null default now(),
  exercise_comment text,
  pass_comment text,
  weight numeric,
  set_number integer,
  workout_kind text default 'gym',
  running_type text,
  interval_time text,
  intervals_count integer,
  running_distance numeric,
  running_time text,
  average_pulse integer,
  running_origin text
);

create index if not exists workout_logs_user_id_created_at_idx
  on public.workout_logs (user_id, created_at desc);

create index if not exists workout_logs_workout_session_id_idx
  on public.workout_logs (workout_session_id);

-- ----------------------------------------------------------------
-- 8. WARMUP TEMPLATES
-- ----------------------------------------------------------------
create table if not exists public.warmup_templates (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  cardio text,
  technique text,
  created_at timestamptz not null default now(),
  unique (team_id, name)
);

-- ----------------------------------------------------------------
-- 9. MESSAGES
-- ----------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  body text not null,
  subject text not null default 'Meddelande',
  created_at timestamptz not null default now()
);

create index if not exists messages_sender_id_idx on public.messages (sender_id);
create index if not exists messages_team_id_idx on public.messages (team_id);

create table if not exists public.message_recipients (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (message_id, recipient_id)
);

create index if not exists message_recipients_message_id_idx on public.message_recipients (message_id);
create index if not exists message_recipients_recipient_id_idx on public.message_recipients (recipient_id);

-- ----------------------------------------------------------------
-- 10. BETA FEEDBACK
-- ----------------------------------------------------------------
create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  body text not null,
  status text not null default 'open',
  status_updated_at timestamptz,
  created_at timestamptz not null default now(),
  constraint beta_feedback_status_check
    check (status in ('open', 'done', 'future', 'wont_do'))
);

create index if not exists beta_feedback_user_id_idx on public.beta_feedback (user_id);
create index if not exists beta_feedback_team_id_idx on public.beta_feedback (team_id);
create index if not exists beta_feedback_status_idx on public.beta_feedback (status);

-- ----------------------------------------------------------------
-- 11. EXERCISE REQUESTS
-- ----------------------------------------------------------------
create table if not exists public.exercise_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  name text not null,
  exercise_type text not null,
  reps_mode text not null default 'fixed',
  muscle_groups text[] not null default '{}',
  description text not null,
  equipment text,
  reference_url text,
  status text not null default 'open',
  status_updated_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists exercise_requests_created_at_idx
  on public.exercise_requests (created_at desc);

create index if not exists exercise_requests_status_idx
  on public.exercise_requests (status);

-- ----------------------------------------------------------------
-- 12. PLAYER EXERCISE GOALS
-- ----------------------------------------------------------------
create table if not exists public.player_exercise_goals (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  target_sets integer,
  target_reps integer,
  target_weight numeric,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_id, exercise_id)
);

create index if not exists player_exercise_goals_player_id_idx
  on public.player_exercise_goals (player_id);

create index if not exists player_exercise_goals_exercise_id_idx
  on public.player_exercise_goals (exercise_id);

alter table public.player_exercise_goals enable row level security;

create or replace function public.set_player_exercise_goals_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists player_exercise_goals_set_updated_at
  on public.player_exercise_goals;

create trigger player_exercise_goals_set_updated_at
before update on public.player_exercise_goals
for each row execute function public.set_player_exercise_goals_updated_at();

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'player_exercise_goals'
    and policyname = 'Coach and admin can manage exercise goals'
  ) then
    create policy "Coach and admin can manage exercise goals"
      on public.player_exercise_goals for all to authenticated
      using (exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
          and profiles.role in ('coach', 'head_admin')
      ))
      with check (exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
          and profiles.role in ('coach', 'head_admin')
      ));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'player_exercise_goals'
    and policyname = 'Player can read own exercise goals'
  ) then
    create policy "Player can read own exercise goals"
      on public.player_exercise_goals for select to authenticated
      using (player_id = auth.uid());
  end if;
end $$;

-- ----------------------------------------------------------------
-- 13. PLAYER EXERCISE TARGETS
-- ----------------------------------------------------------------
create table if not exists public.player_exercise_targets (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  pass_name text not null,
  exercise_name text not null,
  target_sets integer,
  target_reps integer,
  target_reps_mode text default 'fixed',
  target_weight numeric,
  target_comment text,
  unique (player_id, pass_name, exercise_name)
);

-- ----------------------------------------------------------------
-- 14. SEED-DATA: övningar (samma som i migrationerna)
-- ----------------------------------------------------------------
insert into public.exercises (name, exercise_type, default_reps_mode, muscle_groups, is_active)
select source.name, source.exercise_type, source.default_reps_mode, source.muscle_groups, true
from (values
  ('Armhävningar', 'reps_only', 'max', array['Bröst','Triceps']::text[]),
  ('Stående rodd', 'weight_reps', 'fixed', array['Rygg','Armar','Bål']::text[]),
  ('Stående axelpress med hantel', 'weight_reps', 'fixed', array['Axlar','Armar','Bål']::text[]),
  ('Assisterade chins', 'reps_only', 'max', array['Rygg','Lats','Armar']::text[]),
  ('Excentriska chins', 'reps_only', 'fixed', array['Rygg','Lats','Armar']::text[]),
  ('Scapula pull-ups', 'reps_only', 'fixed', array['Rygg','Axlar']::text[]),
  ('Assisterade dips', 'reps_only', 'max', array['Bröst','Armar','Axlar']::text[]),
  ('Bänk-dips', 'reps_only', 'fixed', array['Armar','Axlar']::text[]),
  ('Draken', 'reps_only', 'fixed', array['Ben','Säte','Balans','Bål']::text[]),
  ('Sidoplanka', 'seconds_only', 'fixed', array['Bål']::text[]),
  ('Planka med rotation', 'seconds_only', 'fixed', array['Bål','Rotation']::text[]),
  ('Bålkontroll diagonal rotation', 'reps_only', 'fixed', array['Bål','Rotation']::text[]),
  ('Klättrande planka', 'seconds_only', 'fixed', array['Bål']::text[])
) as source(name, exercise_type, default_reps_mode, muscle_groups)
where not exists (
  select 1 from public.exercises existing
  where lower(existing.name) = lower(source.name)
);

-- Sätt navigation_category och primary_category på övningarna
update public.exercises
set navigation_category = case muscle_groups[1]
  when 'Bål' then 'Mage'
  when 'Axlar' then 'Axlar'
  when 'Ben' then 'Ben'
  when 'Bröst' then 'Bröst'
  when 'Rygg' then 'Rygg'
  when 'Armar' then 'Armar'
  when 'Lats' then 'Lats'
  when 'Säte' then 'Säte'
  else 'Övrigt'
end
where navigation_category is null;

update public.exercises
set primary_category = case
  when array_position(coalesce(muscle_groups,'{}'), 'Bål') is not null then 'bal'
  when exists (select 1 from unnest(coalesce(muscle_groups,'{}')) g where g in ('Balans','Rotation','Rörlighet')) then 'rorlighet_kontroll'
  when exercise_type = 'seconds_only' then 'kondition_tid'
  when exists (select 1 from unnest(coalesce(muscle_groups,'{}')) g where g in ('Ben','Säte','Baksida lår')) then 'underkropp'
  when exists (select 1 from unnest(coalesce(muscle_groups,'{}')) g where g in ('Bröst','Rygg','Lats','Axlar','Armar','Biceps','Triceps')) then 'overkropp'
  else 'styrka'
end
where primary_category is null;

-- ================================================================
-- KLART! Alla tabeller, index och grunddata är skapade.
-- ================================================================
