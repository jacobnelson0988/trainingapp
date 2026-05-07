create table if not exists public.external_calendar_sources (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  feed_url text not null,
  is_enabled boolean not null default true,
  last_synced_at timestamptz,
  last_sync_status text not null default 'idle',
  last_sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.external_calendar_sources
  drop constraint if exists external_calendar_sources_provider_check;

alter table public.external_calendar_sources
  add constraint external_calendar_sources_provider_check
  check (provider in ('laget_se'));

alter table public.external_calendar_sources
  drop constraint if exists external_calendar_sources_status_check;

alter table public.external_calendar_sources
  add constraint external_calendar_sources_status_check
  check (last_sync_status in ('idle', 'running', 'success', 'error'));

create unique index if not exists external_calendar_sources_team_provider_idx
  on public.external_calendar_sources(team_id, provider);

create index if not exists external_calendar_sources_team_id_idx
  on public.external_calendar_sources(team_id);

alter table public.external_calendar_sources enable row level security;

drop trigger if exists external_calendar_sources_set_updated_at on public.external_calendar_sources;
create trigger external_calendar_sources_set_updated_at
before update on public.external_calendar_sources
for each row
execute function public.set_calendar_updated_at();

drop policy if exists "Coach can read external calendar sources" on public.external_calendar_sources;
create policy "Coach can read external calendar sources"
  on public.external_calendar_sources
  for select
  to authenticated
  using (
    public.is_head_admin()
    or (
      public.is_coach()
      and team_id is not distinct from public.current_user_team_id()
    )
  );

drop policy if exists "Coach can create external calendar sources" on public.external_calendar_sources;
create policy "Coach can create external calendar sources"
  on public.external_calendar_sources
  for insert
  to authenticated
  with check (
    public.is_head_admin()
    or (
      public.is_coach()
      and team_id is not distinct from public.current_user_team_id()
      and created_by = (select auth.uid())
    )
  );

drop policy if exists "Coach can update external calendar sources" on public.external_calendar_sources;
create policy "Coach can update external calendar sources"
  on public.external_calendar_sources
  for update
  to authenticated
  using (
    public.is_head_admin()
    or (
      public.is_coach()
      and team_id is not distinct from public.current_user_team_id()
    )
  )
  with check (
    public.is_head_admin()
    or (
      public.is_coach()
      and team_id is not distinct from public.current_user_team_id()
    )
  );

drop policy if exists "Coach can delete external calendar sources" on public.external_calendar_sources;
create policy "Coach can delete external calendar sources"
  on public.external_calendar_sources
  for delete
  to authenticated
  using (
    public.is_head_admin()
    or (
      public.is_coach()
      and team_id is not distinct from public.current_user_team_id()
    )
  );

alter table public.calendar_series
  add column if not exists is_external boolean not null default false;

alter table public.calendar_series
  add column if not exists external_provider text;

alter table public.calendar_series
  add column if not exists external_source_id uuid references public.external_calendar_sources(id) on delete set null;

alter table public.calendar_series
  add column if not exists external_event_uid text;

alter table public.calendar_series
  drop constraint if exists calendar_series_external_provider_check;

alter table public.calendar_series
  add constraint calendar_series_external_provider_check
  check (external_provider is null or external_provider in ('laget_se'));

create index if not exists calendar_series_external_source_id_idx
  on public.calendar_series(external_source_id);

create unique index if not exists calendar_series_external_uid_idx
  on public.calendar_series(external_source_id, external_event_uid)
  where external_event_uid is not null;

alter table public.calendar_events
  add column if not exists is_external boolean not null default false;

alter table public.calendar_events
  add column if not exists external_provider text;

alter table public.calendar_events
  add column if not exists external_source_id uuid references public.external_calendar_sources(id) on delete set null;

alter table public.calendar_events
  add column if not exists external_event_uid text;

alter table public.calendar_events
  drop constraint if exists calendar_events_external_provider_check;

alter table public.calendar_events
  add constraint calendar_events_external_provider_check
  check (external_provider is null or external_provider in ('laget_se'));

create index if not exists calendar_events_external_source_id_idx
  on public.calendar_events(external_source_id);

create unique index if not exists calendar_events_external_uid_idx
  on public.calendar_events(external_source_id, external_event_uid)
  where external_event_uid is not null;

drop policy if exists "Coach and owners can update calendar series" on public.calendar_series;
create policy "Coach and owners can update calendar series"
  on public.calendar_series
  for update
  to authenticated
  using (
    public.is_head_admin()
    or (
      is_external is not true
      and public.is_coach()
      and team_id is not distinct from public.current_user_team_id()
    )
    or (
      is_external is not true
      and public.current_user_role() = 'player'
      and created_by = (select auth.uid())
      and team_id is not distinct from public.current_user_team_id()
    )
  )
  with check (
    public.is_head_admin()
    or (
      is_external is not true
      and public.is_coach()
      and team_id is not distinct from public.current_user_team_id()
    )
    or (
      is_external is not true
      and public.current_user_role() = 'player'
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
      is_external is not true
      and public.is_coach()
      and team_id is not distinct from public.current_user_team_id()
    )
    or (
      is_external is not true
      and public.current_user_role() = 'player'
      and created_by = (select auth.uid())
      and team_id is not distinct from public.current_user_team_id()
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
      is_external is not true
      and public.is_coach()
      and team_id is not distinct from public.current_user_team_id()
    )
    or (
      is_external is not true
      and public.current_user_role() = 'player'
      and created_by = (select auth.uid())
      and team_id is not distinct from public.current_user_team_id()
    )
  )
  with check (
    public.is_head_admin()
    or (
      is_external is not true
      and public.is_coach()
      and team_id is not distinct from public.current_user_team_id()
    )
    or (
      is_external is not true
      and public.current_user_role() = 'player'
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
      is_external is not true
      and public.is_coach()
      and team_id is not distinct from public.current_user_team_id()
    )
    or (
      is_external is not true
      and public.current_user_role() = 'player'
      and created_by = (select auth.uid())
      and team_id is not distinct from public.current_user_team_id()
    )
  );
