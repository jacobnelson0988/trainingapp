alter table public.profiles
add column if not exists is_archived boolean not null default false,
add column if not exists archived_at timestamptz,
add column if not exists archived_by uuid references public.profiles(id) on delete set null;

update public.profiles
set is_archived = false
where is_archived is null;

create index if not exists profiles_is_archived_idx
on public.profiles (is_archived);

create index if not exists profiles_player_archive_lookup_idx
on public.profiles (role, is_archived, full_name);
