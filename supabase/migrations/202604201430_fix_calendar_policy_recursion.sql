create or replace function public.is_current_user_assigned_to_calendar_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.calendar_event_players cep
    where cep.calendar_event_id = target_event_id
      and cep.player_id = (select auth.uid())
  )
$$;

create or replace function public.can_current_user_manage_calendar_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.calendar_events ce
    where ce.id = target_event_id
      and (
        public.is_head_admin()
        or (
          public.is_coach()
          and ce.team_id is not distinct from public.current_user_team_id()
        )
      )
  )
$$;

create or replace function public.is_current_user_assigned_to_calendar_series(target_series_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.calendar_events ce
    join public.calendar_event_players cep on cep.calendar_event_id = ce.id
    where ce.series_id = target_series_id
      and cep.player_id = (select auth.uid())
  )
$$;

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
    or public.is_current_user_assigned_to_calendar_series(calendar_series.id)
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
    or public.is_current_user_assigned_to_calendar_event(calendar_events.id)
  );

drop policy if exists "Users can read calendar event players" on public.calendar_event_players;
create policy "Users can read calendar event players"
  on public.calendar_event_players
  for select
  to authenticated
  using (
    public.is_head_admin()
    or player_id = (select auth.uid())
    or public.can_current_user_manage_calendar_event(calendar_event_players.calendar_event_id)
  );

drop policy if exists "Coach and self can create calendar event players" on public.calendar_event_players;
create policy "Coach and self can create calendar event players"
  on public.calendar_event_players
  for insert
  to authenticated
  with check (
    public.is_head_admin()
    or public.can_current_user_manage_calendar_event(calendar_event_players.calendar_event_id)
    or exists (
      select 1
      from public.calendar_events ce
      where ce.id = calendar_event_players.calendar_event_id
        and public.current_user_role() = 'player'
        and player_id = (select auth.uid())
        and assignment_source = 'self'
        and ce.created_by = (select auth.uid())
        and ce.team_id is not distinct from public.current_user_team_id()
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
    or public.can_current_user_manage_calendar_event(calendar_event_players.calendar_event_id)
  )
  with check (
    public.is_head_admin()
    or player_id = (select auth.uid())
    or public.can_current_user_manage_calendar_event(calendar_event_players.calendar_event_id)
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
    or public.can_current_user_manage_calendar_event(calendar_event_players.calendar_event_id)
  );
