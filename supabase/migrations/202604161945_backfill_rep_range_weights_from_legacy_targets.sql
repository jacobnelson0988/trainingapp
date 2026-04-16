with goal_source as (
  select
    peg.player_id,
    peg.exercise_id,
    peg.target_weight,
    peg.target_reps as representative_reps,
    'manual_override'::text as source
  from public.player_exercise_goals peg
  where peg.target_weight is not null
    and peg.target_reps is not null
),
pass_target_source as (
  select
    pet.player_id,
    exercises.id as exercise_id,
    pet.target_weight,
    coalesce(
      pet.target_reps_max,
      pet.target_reps,
      case
        when coalesce(pet.target_reps_text, '') ~ '^\s*\d+\s*-\s*\d+\s*$'
          then ((regexp_match(pet.target_reps_text, '^\s*(\d+)\s*-\s*(\d+)\s*$'))[2])::integer
        when coalesce(pet.target_reps_text, '') ~ '^\s*\d+\s*$'
          then trim(pet.target_reps_text)::integer
        else null
      end
    ) as representative_reps,
    'manual_override'::text as source
  from public.player_exercise_targets pet
  join public.exercises
    on lower(trim(exercises.name)) = lower(trim(pet.exercise_name))
  where pet.target_weight is not null
    and pet.exercise_name is not null
    and pet.exercise_name <> '__pass_assignment__'
),
combined_source as (
  select * from goal_source
  union all
  select * from pass_target_source
),
normalized_source as (
  select
    player_id,
    exercise_id,
    target_weight,
    source,
    case
      when representative_reps between 1 and 3 then '1_3'
      when representative_reps between 4 and 5 then '4_5'
      when representative_reps between 6 and 10 then '6_10'
      when representative_reps between 11 and 15 then '11_15'
      when representative_reps >= 16 then '16_20'
      else null
    end as rep_range_key
  from combined_source
  where representative_reps is not null
),
deduplicated_source as (
  select distinct on (player_id, exercise_id, rep_range_key)
    player_id,
    exercise_id,
    rep_range_key,
    target_weight,
    source
  from normalized_source
  where rep_range_key is not null
  order by player_id, exercise_id, rep_range_key, target_weight desc
)
insert into public.player_exercise_rep_targets (
  player_id,
  exercise_id,
  rep_range_key,
  target_weight,
  source,
  updated_by
)
select
  player_id,
  exercise_id,
  rep_range_key,
  target_weight,
  source,
  null
from deduplicated_source
on conflict (player_id, exercise_id, rep_range_key) do nothing;
