-- Copy a complete selection atomically, using the caller's existing RLS rights.
create or replace function public.copy_team_workout_templates(
  source_team_id uuid,
  target_team_id uuid,
  template_ids uuid[]
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  source_template public.workout_templates%rowtype;
  source_exercise public.workout_template_exercises%rowtype;
  new_template_id uuid;
  new_exercise_id uuid;
  selected_count integer;
begin
  if not coalesce(public.is_head_admin(), false) then
    raise exception 'Endast huvudadministratören kan kopiera pass mellan lag.' using errcode = '42501';
  end if;
  if source_team_id is null or target_team_id is null or source_team_id = target_team_id then
    raise exception 'Välj två olika lag.';
  end if;
  if not exists (select 1 from public.teams where id = source_team_id)
    or not exists (select 1 from public.teams where id = target_team_id) then
    raise exception 'Kunde inte hitta båda lagen.';
  end if;
  selected_count := cardinality(template_ids);
  if selected_count is null or selected_count = 0 then
    raise exception 'Välj minst ett pass.';
  end if;

  -- Serialize exports to the same destination, including duplicate checks.
  perform 1 from public.teams where id = target_team_id for update;
  if (select count(*) from public.workout_templates
      where team_id = source_team_id and id = any(template_ids)) <> selected_count then
    raise exception 'Alla valda pass måste tillhöra källaget och får bara väljas en gång.';
  end if;
  if exists (
    select 1 from public.workout_templates source
    join public.workout_templates target
      on lower(btrim(target.label)) = lower(btrim(source.label))
    where source.id = any(template_ids) and target.team_id = target_team_id
  ) or exists (
    select 1 from public.workout_templates where id = any(template_ids)
    group by lower(btrim(label)) having count(*) > 1
  ) then
    raise exception 'Det finns redan pass med samma namn i urvalet eller mållaget. Byt namn eller avmarkera dessa pass och försök igen. Inga pass kopierades.';
  end if;

  for source_template in
    select * from public.workout_templates
    where team_id = source_team_id and id = any(template_ids)
    order by id for share
  loop
    insert into public.workout_templates (
      code, label, team_id, info, warmup_cardio, warmup_technique,
      workout_kind, gym_pass_type, running_type, running_interval_time,
      running_intervals_count, running_distance, running_time
    ) values (
      'COPY_' || replace(gen_random_uuid()::text, '-', ''), source_template.label,
      target_team_id, source_template.info, source_template.warmup_cardio,
      source_template.warmup_technique, source_template.workout_kind,
      source_template.gym_pass_type, source_template.running_type,
      source_template.running_interval_time, source_template.running_intervals_count,
      source_template.running_distance, source_template.running_time
    ) returning id into new_template_id;

    for source_exercise in
      select * from public.workout_template_exercises
      where workout_template_id = source_template.id order by sort_order for share
    loop
      insert into public.workout_template_exercises (
        workout_template_id, exercise_id, sort_order, custom_guide, target_sets,
        target_reps, target_reps_min, target_reps_max, target_reps_mode,
        target_reps_text, target_duration_text
      ) values (
        new_template_id, source_exercise.exercise_id, source_exercise.sort_order,
        source_exercise.custom_guide, source_exercise.target_sets,
        source_exercise.target_reps, source_exercise.target_reps_min,
        source_exercise.target_reps_max, source_exercise.target_reps_mode,
        source_exercise.target_reps_text, source_exercise.target_duration_text
      ) returning id into new_exercise_id;

      insert into public.workout_template_exercise_alternatives (
        workout_template_exercise_id, alternative_exercise_id
      ) select new_exercise_id, alternative_exercise_id
        from public.workout_template_exercise_alternatives
        where workout_template_exercise_id = source_exercise.id;
    end loop;
  end loop;
  return selected_count;
end;
$$;

revoke all on function public.copy_team_workout_templates(uuid, uuid, uuid[]) from public;
revoke all on function public.copy_team_workout_templates(uuid, uuid, uuid[]) from anon;
grant execute on function public.copy_team_workout_templates(uuid, uuid, uuid[]) to authenticated;
