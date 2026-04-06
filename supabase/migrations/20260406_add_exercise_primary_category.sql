alter table public.exercises
add column if not exists primary_category text;

update public.exercises
set primary_category = case
  when array_position(coalesce(muscle_groups, '{}'), 'Bål') is not null then 'bal'
  when exists (
    select 1
    from unnest(coalesce(muscle_groups, '{}')) as group_name
    where group_name in ('Balans', 'Rotation', 'Rörlighet')
  ) then 'rorlighet_kontroll'
  when exercise_type = 'seconds_only'
    or array_position(coalesce(muscle_groups, '{}'), 'Kondition') is not null then 'kondition_tid'
  when exists (
    select 1
    from unnest(coalesce(muscle_groups, '{}')) as group_name
    where group_name in ('Ben', 'Säte', 'Baksida lår')
  ) then 'underkropp'
  when exists (
    select 1
    from unnest(coalesce(muscle_groups, '{}')) as group_name
    where group_name in ('Bröst', 'Rygg', 'Lats', 'Axlar', 'Armar', 'Biceps', 'Triceps')
  ) then 'overkropp'
  when exercise_type = 'weight_reps' then 'styrka'
  else 'styrka'
end
where primary_category is null;

alter table public.exercises
drop constraint if exists exercises_primary_category_check;

alter table public.exercises
add constraint exercises_primary_category_check
check (
  primary_category in (
    'styrka',
    'bal',
    'overkropp',
    'underkropp',
    'rorlighet_kontroll',
    'kondition_tid'
  )
);
