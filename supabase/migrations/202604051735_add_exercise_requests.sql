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
