create table if not exists public.calendar_event_groups (
  id uuid primary key default gen_random_uuid(),
  calendar_event_id uuid not null references public.calendar_events(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_event_group_members (
  id uuid primary key default gen_random_uuid(),
  calendar_event_group_id uuid not null references public.calendar_event_groups(id) on delete cascade,
  calendar_event_player_id uuid not null references public.calendar_event_players(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  player_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists calendar_event_groups_event_id_idx
  on public.calendar_event_groups(calendar_event_id);

create index if not exists calendar_event_groups_event_id_sort_order_idx
  on public.calendar_event_groups(calendar_event_id, sort_order);

create index if not exists calendar_event_group_members_group_id_idx
  on public.calendar_event_group_members(calendar_event_group_id);

create index if not exists calendar_event_group_members_event_player_id_idx
  on public.calendar_event_group_members(calendar_event_player_id);

create index if not exists calendar_event_group_members_player_id_idx
  on public.calendar_event_group_members(player_id);

create unique index if not exists calendar_event_group_members_unique_event_player_idx
  on public.calendar_event_group_members(calendar_event_player_id);

drop trigger if exists calendar_event_groups_set_updated_at on public.calendar_event_groups;
create trigger calendar_event_groups_set_updated_at
before update on public.calendar_event_groups
for each row
execute function public.set_calendar_updated_at();

alter table public.calendar_event_groups enable row level security;
alter table public.calendar_event_group_members enable row level security;

drop policy if exists "Users can read calendar event groups" on public.calendar_event_groups;
create policy "Users can read calendar event groups"
  on public.calendar_event_groups
  for select
  to authenticated
  using (
    public.is_head_admin()
    or public.can_current_user_manage_calendar_event(calendar_event_groups.calendar_event_id)
    or public.is_current_user_assigned_to_calendar_event(calendar_event_groups.calendar_event_id)
  );

drop policy if exists "Coach can manage calendar event groups" on public.calendar_event_groups;
create policy "Coach can manage calendar event groups"
  on public.calendar_event_groups
  for all
  to authenticated
  using (
    public.is_head_admin()
    or public.can_current_user_manage_calendar_event(calendar_event_groups.calendar_event_id)
  )
  with check (
    public.is_head_admin()
    or public.can_current_user_manage_calendar_event(calendar_event_groups.calendar_event_id)
  );

drop policy if exists "Users can read calendar event group members" on public.calendar_event_group_members;
create policy "Users can read calendar event group members"
  on public.calendar_event_group_members
  for select
  to authenticated
  using (
    public.is_head_admin()
    or exists (
      select 1
      from public.calendar_event_groups ceg
      where ceg.id = calendar_event_group_members.calendar_event_group_id
        and (
          public.can_current_user_manage_calendar_event(ceg.calendar_event_id)
          or public.is_current_user_assigned_to_calendar_event(ceg.calendar_event_id)
        )
    )
  );

drop policy if exists "Coach can manage calendar event group members" on public.calendar_event_group_members;
create policy "Coach can manage calendar event group members"
  on public.calendar_event_group_members
  for all
  to authenticated
  using (
    public.is_head_admin()
    or exists (
      select 1
      from public.calendar_event_groups ceg
      where ceg.id = calendar_event_group_members.calendar_event_group_id
        and public.can_current_user_manage_calendar_event(ceg.calendar_event_id)
    )
  )
  with check (
    public.is_head_admin()
    or exists (
      select 1
      from public.calendar_event_groups ceg
      where ceg.id = calendar_event_group_members.calendar_event_group_id
        and public.can_current_user_manage_calendar_event(ceg.calendar_event_id)
    )
  );
