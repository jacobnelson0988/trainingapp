create table if not exists public.player_target_change_requests (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  player_name text not null,
  team_id uuid references public.teams(id) on delete set null,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  exercise_name text not null,
  rep_range_key text not null,
  request_type text not null default 'review',
  current_target_weight numeric,
  latest_logged_weight numeric,
  latest_logged_reps_text text,
  comment text,
  status text not null default 'open',
  resolved_target_weight numeric,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.player_target_change_requests
drop constraint if exists player_target_change_requests_rep_range_key_check;

alter table public.player_target_change_requests
add constraint player_target_change_requests_rep_range_key_check
check (rep_range_key in ('1_3', '4_5', '6_10', '11_15', '16_20'));

alter table public.player_target_change_requests
drop constraint if exists player_target_change_requests_request_type_check;

alter table public.player_target_change_requests
add constraint player_target_change_requests_request_type_check
check (request_type in ('increase', 'decrease', 'review'));

alter table public.player_target_change_requests
drop constraint if exists player_target_change_requests_status_check;

alter table public.player_target_change_requests
add constraint player_target_change_requests_status_check
check (status in ('open', 'approved', 'rejected'));

create index if not exists player_target_change_requests_player_id_idx
on public.player_target_change_requests(player_id);

create index if not exists player_target_change_requests_team_id_idx
on public.player_target_change_requests(team_id);

create index if not exists player_target_change_requests_status_idx
on public.player_target_change_requests(status, created_at desc);

create unique index if not exists player_target_change_requests_open_unique_idx
on public.player_target_change_requests(player_id, exercise_id, rep_range_key)
where status = 'open';

alter table public.player_target_change_requests enable row level security;

drop policy if exists "Players can create own target change requests" on public.player_target_change_requests;
create policy "Players can create own target change requests"
  on public.player_target_change_requests
  for insert
  to authenticated
  with check (auth.uid() = player_id);

drop policy if exists "Players can read own target change requests" on public.player_target_change_requests;
create policy "Players can read own target change requests"
  on public.player_target_change_requests
  for select
  to authenticated
  using (auth.uid() = player_id);

drop policy if exists "Coach and admin can read team target change requests" on public.player_target_change_requests;
create policy "Coach and admin can read team target change requests"
  on public.player_target_change_requests
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles profile
      where profile.id = auth.uid()
        and (
          profile.role = 'head_admin'
          or (
            profile.role = 'coach'
            and profile.team_id is not distinct from player_target_change_requests.team_id
          )
        )
    )
  );

drop policy if exists "Coach and admin can update team target change requests" on public.player_target_change_requests;
create policy "Coach and admin can update team target change requests"
  on public.player_target_change_requests
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles profile
      where profile.id = auth.uid()
        and (
          profile.role = 'head_admin'
          or (
            profile.role = 'coach'
            and profile.team_id is not distinct from player_target_change_requests.team_id
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from public.profiles profile
      where profile.id = auth.uid()
        and (
          profile.role = 'head_admin'
          or (
            profile.role = 'coach'
            and profile.team_id is not distinct from player_target_change_requests.team_id
          )
        )
    )
  );

