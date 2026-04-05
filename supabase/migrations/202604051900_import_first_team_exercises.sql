insert into public.exercises (
  name,
  exercise_type,
  default_reps_mode,
  muscle_groups,
  description,
  is_active
)
select
  source.name,
  source.exercise_type,
  source.default_reps_mode,
  source.muscle_groups,
  source.description,
  true
from (
  values
    ('Stående rodd', 'weight_reps', 'fixed', array['Rygg','Armar','Bål']::text[], null),
    ('Stående axelpress med hantel', 'weight_reps', 'fixed', array['Axlar','Armar','Bål']::text[], null),
    ('Assisterade chins', 'reps_only', 'max', array['Rygg','Lats','Armar']::text[], null),
    ('Excentriska chins', 'reps_only', 'fixed', array['Rygg','Lats','Armar']::text[], null),
    ('Scapula pull-ups', 'reps_only', 'fixed', array['Rygg','Axlar']::text[], null),
    ('Assisterade dips', 'reps_only', 'max', array['Bröst','Armar','Axlar']::text[], null),
    ('Bänk-dips', 'reps_only', 'fixed', array['Armar','Axlar']::text[], null),
    ('Draken', 'reps_only', 'fixed', array['Ben','Säte','Balans','Bål']::text[], null),
    ('Sidoplanka', 'seconds_only', 'fixed', array['Bål']::text[], null),
    ('Planka med rotation', 'seconds_only', 'fixed', array['Bål','Rotation']::text[], null),
    ('Bålkontroll diagonal rotation', 'reps_only', 'fixed', array['Bål','Rotation']::text[], null),
    ('Klättrande planka', 'seconds_only', 'fixed', array['Bål']::text[], null)
) as source(name, exercise_type, default_reps_mode, muscle_groups, description)
where not exists (
  select 1
  from public.exercises existing
  where lower(existing.name) = lower(source.name)
);
