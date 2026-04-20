create table if not exists public.calendar_series (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  activity_kind text not null,
  workout_template_id uuid references public.workout_templates(id) on delete set null,
  free_activity_type text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'Europe/Stockholm',
  is_recurring boolean not null default false,
  recurrence_freq text,
  recurrence_interval integer,
  recurrence_weekdays integer[],
  recurrence_until date,
  is_cancelled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.calendar_series
  drop constraint if exists calendar_series_activity_kind_check;

alter table public.calendar_series
  add constraint calendar_series_activity_kind_check
  check (activity_kind in ('template_workout', 'free_activity', 'handball', 'custom'));

alter table public.calendar_series
  drop constraint if exists calendar_series_recurrence_freq_check;

alter table public.calendar_series
  add constraint calendar_series_recurrence_freq_check
  check (recurrence_freq is null or recurrence_freq in ('weekly'));

alter table public.calendar_series
  drop constraint if exists calendar_series_recurrence_interval_check;

alter table public.calendar_series
  add constraint calendar_series_recurrence_interval_check
  check (recurrence_interval is null or recurrence_interval >= 1);

alter table public.calendar_series
  drop constraint if exists calendar_series_valid_time_range_check;

alter table public.calendar_series
  add constraint calendar_series_valid_time_range_check
  check (ends_at > starts_at);

create index if not exists calendar_series_team_id_idx
  on public.calendar_series(team_id);

create index if not exists calendar_series_created_by_idx
  on public.calendar_series(created_by);

create index if not exists calendar_series_starts_at_idx
  on public.calendar_series(starts_at);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.calendar_series(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  activity_kind text not null,
  workout_template_id uuid references public.workout_templates(id) on delete set null,
  free_activity_type text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'Europe/Stockholm',
  source_date date,
  is_cancelled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.calendar_events
  drop constraint if exists calendar_events_activity_kind_check;

alter table public.calendar_events
  add constraint calendar_events_activity_kind_check
  check (activity_kind in ('template_workout', 'free_activity', 'handball', 'custom'));

alter table public.calendar_events
  drop constraint if exists calendar_events_valid_time_range_check;

alter table public.calendar_events
  add constraint calendar_events_valid_time_range_check
  check (ends_at > starts_at);

create index if not exists calendar_events_series_id_idx
  on public.calendar_events(series_id);

create index if not exists calendar_events_team_id_starts_at_idx
  on public.calendar_events(team_id, starts_at);

create index if not exists calendar_events_created_by_idx
  on public.calendar_events(created_by);

create table if not exists public.calendar_event_players (
  id uuid primary key default gen_random_uuid(),
  calendar_event_id uuid not null references public.calendar_events(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  assignment_source text not null,
  completion_status text not null default 'planned',
  linked_workout_session_id text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (calendar_event_id, player_id)
);

alter table public.calendar_event_players
  drop constraint if exists calendar_event_players_assignment_source_check;

alter table public.calendar_event_players
  add constraint calendar_event_players_assignment_source_check
  check (assignment_source in ('team', 'direct', 'self'));

alter table public.calendar_event_players
  drop constraint if exists calendar_event_players_completion_status_check;

alter table public.calendar_event_players
  add constraint calendar_event_players_completion_status_check
  check (completion_status in ('planned', 'completed', 'skipped', 'cancelled'));

create index if not exists calendar_event_players_event_id_idx
  on public.calendar_event_players(calendar_event_id);

create index if not exists calendar_event_players_player_id_idx
  on public.calendar_event_players(player_id);

create index if not exists calendar_event_players_status_idx
  on public.calendar_event_players(player_id, completion_status);

alter table public.workout_logs
  add column if not exists calendar_event_player_id uuid references public.calendar_event_players(id) on delete set null;

create index if not exists workout_logs_calendar_event_player_id_idx
  on public.workout_logs(calendar_event_player_id);

create index if not exists workout_logs_user_id_calendar_event_player_id_created_at_idx
  on public.workout_logs(user_id, calendar_event_player_id, created_at desc);

alter table public.workout_logs
  drop constraint if exists workout_logs_free_activity_type_check;

alter table public.workout_logs
  add constraint workout_logs_free_activity_type_check
  check (
    free_activity_type is null
    or free_activity_type in (
      'running',
      'football',
      'orienteering',
      'swimming',
      'racket_sport',
      'handball',
      'custom'
    )
  );

create or replace function public.set_calendar_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists calendar_series_set_updated_at on public.calendar_series;
create trigger calendar_series_set_updated_at
before update on public.calendar_series
for each row
execute function public.set_calendar_updated_at();

drop trigger if exists calendar_events_set_updated_at on public.calendar_events;
create trigger calendar_events_set_updated_at
before update on public.calendar_events
for each row
execute function public.set_calendar_updated_at();

drop trigger if exists calendar_event_players_set_updated_at on public.calendar_event_players;
create trigger calendar_event_players_set_updated_at
before update on public.calendar_event_players
for each row
execute function public.set_calendar_updated_at();

alter table public.calendar_series enable row level security;
alter table public.calendar_events enable row level security;
alter table public.calendar_event_players enable row level security;

drop policy if exists "Users can read calendar series" on public.calendar_series;
create policy "Users can read calendar series"
  on public.calendar_series
  for select
  to authenticated
  using (
    public.is_head_admin()
    or (
      public.is_coach()
      and team_id is not distinct from public.current_user_team_id()
    )
    or created_by = (select auth.uid())
    or exists (
      select 1
      from public.calendar_events ce
      join public.calendar_event_players cep on cep.calendar_event_id = ce.id
      where ce.series_id = calendar_series.id
        and cep.player_id = (select auth.uid())
    )
  );

drop policy if exists "Coach and players can create calendar series" on public.calendar_series;
create policy "Coach and players can create calendar series"
  on public.calendar_series
  for insert
  to authenticated
  with check (
    (
      public.is_coach()
      and team_id is not distinct from public.current_user_team_id()
      and created_by = (select auth.uid())
    )
    or (
      public.current_user_role() = 'player'
      and team_id is not distinct from public.current_user_team_id()
      and created_by = (select auth.uid())
    )
    or public.is_head_admin()
  );

drop policy if exists "Coach and owners can update calendar series" on public.calendar_series;
create policy "Coach and owners can update calendar series"
  on public.calendar_series
  for update
  to authenticated
  using (
    public.is_head_admin()
    or (
      public.is_coach()
      and team_id is not distinct from public.current_user_team_id()
    )
    or (
      public.current_user_role() = 'player'
      and created_by = (select auth.uid())
      and team_id is not distinct from public.current_user_team_id()
    )
  )
  with check (
    public.is_head_admin()
    or (
      public.is_coach()
      and team_id is not distinct from public.current_user_team_id()
    )
    or (
      public.current_user_role() = 'player'
      and created_by = (select auth.uid())
      and team_id is not distinct from public.current_user_team_id()
    )
  );

drop policy if exists "Coach and owners can delete calendar series" on public.calendar_series;
create policy "Coach and owners can delete calendar series"
  on public.calendar_series
  for delete
  to authenticated
  using (
    public.is_head_admin()
    or (
      public.is_coach()
      and team_id is not distinct from public.current_user_team_id()
    )
    or (
      public.current_user_role() = 'player'
      and created_by = (select auth.uid())
      and team_id is not distinct from public.current_user_team_id()
    )
  );

drop policy if exists "Users can read calendar events" on public.calendar_events;
create policy "Users can read calendar events"
  on public.calendar_events
  for select
  to authenticated
  using (
    public.is_head_admin()
    or (
      public.is_coach()
      and team_id is not distinct from public.current_user_team_id()
    )
    or created_by = (select auth.uid())
    or exists (
      select 1
      from public.calendar_event_players cep
      where cep.calendar_event_id = calendar_events.id
        and cep.player_id = (select auth.uid())
    )
  );

drop policy if exists "Coach and players can create calendar events" on public.calendar_events;
create policy "Coach and players can create calendar events"
  on public.calendar_events
  for insert
  to authenticated
  with check (
    public.is_head_admin()
    or (
      public.is_coach()
      and team_id is not distinct from public.current_user_team_id()
      and created_by = (select auth.uid())
    )
    or (
      public.current_user_role() = 'player'
      and team_id is not distinct from public.current_user_team_id()
      and created_by = (select auth.uid())
    )
  );

drop policy if exists "Coach and owners can update calendar events" on public.calendar_events;
create policy "Coach and owners can update calendar events"
  on public.calendar_events
  for update
  to authenticated
  using (
    public.is_head_admin()
    or (
      public.is_coach()
      and team_id is not distinct from public.current_user_team_id()
    )
    or (
      public.current_user_role() = 'player'
      and created_by = (select auth.uid())
      and team_id is not distinct from public.current_user_team_id()
    )
  )
  with check (
    public.is_head_admin()
    or (
      public.is_coach()
      and team_id is not distinct from public.current_user_team_id()
    )
    or (
      public.current_user_role() = 'player'
      and created_by = (select auth.uid())
      and team_id is not distinct from public.current_user_team_id()
    )
  );

drop policy if exists "Coach and owners can delete calendar events" on public.calendar_events;
create policy "Coach and owners can delete calendar events"
  on public.calendar_events
  for delete
  to authenticated
  using (
    public.is_head_admin()
    or (
      public.is_coach()
      and team_id is not distinct from public.current_user_team_id()
    )
    or (
      public.current_user_role() = 'player'
      and created_by = (select auth.uid())
      and team_id is not distinct from public.current_user_team_id()
    )
  );

drop policy if exists "Users can read calendar event players" on public.calendar_event_players;
create policy "Users can read calendar event players"
  on public.calendar_event_players
  for select
  to authenticated
  using (
    public.is_head_admin()
    or player_id = (select auth.uid())
    or exists (
      select 1
      from public.calendar_events ce
      where ce.id = calendar_event_players.calendar_event_id
        and public.is_coach()
        and ce.team_id is not distinct from public.current_user_team_id()
    )
  );

drop policy if exists "Coach and self can create calendar event players" on public.calendar_event_players;
create policy "Coach and self can create calendar event players"
  on public.calendar_event_players
  for insert
  to authenticated
  with check (
    public.is_head_admin()
    or exists (
      select 1
      from public.calendar_events ce
      where ce.id = calendar_event_players.calendar_event_id
        and (
          (
            public.is_coach()
            and ce.team_id is not distinct from public.current_user_team_id()
          )
          or (
            public.current_user_role() = 'player'
            and player_id = (select auth.uid())
            and assignment_source = 'self'
            and ce.created_by = (select auth.uid())
            and ce.team_id is not distinct from public.current_user_team_id()
          )
        )
    )
  );

drop policy if exists "Coach and player can update calendar event players" on public.calendar_event_players;
create policy "Coach and player can update calendar event players"
  on public.calendar_event_players
  for update
  to authenticated
  using (
    public.is_head_admin()
    or player_id = (select auth.uid())
    or exists (
      select 1
      from public.calendar_events ce
      where ce.id = calendar_event_players.calendar_event_id
        and public.is_coach()
        and ce.team_id is not distinct from public.current_user_team_id()
    )
  )
  with check (
    public.is_head_admin()
    or player_id = (select auth.uid())
    or exists (
      select 1
      from public.calendar_events ce
      where ce.id = calendar_event_players.calendar_event_id
        and public.is_coach()
        and ce.team_id is not distinct from public.current_user_team_id()
    )
  );

drop policy if exists "Coach and self can delete calendar event players" on public.calendar_event_players;
create policy "Coach and self can delete calendar event players"
  on public.calendar_event_players
  for delete
  to authenticated
  using (
    public.is_head_admin()
    or (
      player_id = (select auth.uid())
      and assignment_source = 'self'
    )
    or exists (
      select 1
      from public.calendar_events ce
      where ce.id = calendar_event_players.calendar_event_id
        and public.is_coach()
        and ce.team_id is not distinct from public.current_user_team_id()
    )
  );
