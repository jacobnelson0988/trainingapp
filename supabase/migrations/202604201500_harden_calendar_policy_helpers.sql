create or replace function public.is_current_user_assigned_to_calendar_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
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
set row_security = off
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
set row_security = off
as $$
  select exists (
    select 1
    from public.calendar_events ce
    join public.calendar_event_players cep on cep.calendar_event_id = ce.id
    where ce.series_id = target_series_id
      and cep.player_id = (select auth.uid())
  )
$$;
