with hrg_exercises as (
  select
    e.id,
    case
      when exists (
        select 1
        from unnest(coalesce(e.aliases, '{}'::text[])) as alias
        where alias in (
          'Axelkontroll 4A',
          'Axelkontroll 4B',
          'Axelkontroll 4C',
          'Axelkontroll 4D',
          'Axelkontroll 4E',
          'Knäkontroll 1A',
          'Knäkontroll 1B',
          'Knäkontroll 1C',
          'Knäkontroll 1D',
          'Knäkontroll 1E',
          'Knäkontroll 2B',
          'Knäkontroll 2C',
          'Knäkontroll 2D',
          'Knäkontroll 4D',
          'Knäkontroll 5A',
          'Knäkontroll 5B',
          'Knäkontroll 5C',
          'Knäkontroll 5D',
          'Knäkontroll 5E',
          'Knäkontroll 6A',
          'Knäkontroll 6B',
          'Knäkontroll 6C',
          'Knäkontroll 6D',
          'Knäkontroll 6E'
        )
      ) then 'single_leg'
      when exists (
        select 1
        from unnest(coalesce(e.aliases, '{}'::text[])) as alias
        where alias in (
          'Axelkontroll 1B',
          'Axelkontroll 1C',
          'Axelkontroll 1D',
          'Axelkontroll 1E',
          'Axelkontroll 5A',
          'Axelkontroll 5B',
          'Axelkontroll 5C',
          'Axelkontroll 5D',
          'Axelkontroll 6A',
          'Axelkontroll 6B',
          'Axelkontroll 6C',
          'Axelkontroll 6D',
          'Knäkontroll 2E'
        )
      ) then 'single_arm'
      else 'standard'
    end as next_execution_side
  from public.exercises e
  where exists (
    select 1
    from unnest(coalesce(e.aliases, '{}'::text[])) as alias
    where alias ~ '^(Axelkontroll|Knäkontroll) [1-6][A-E]$'
  )
)
update public.exercises as e
set
  exercise_type = 'seconds_only',
  default_reps_mode = 'fixed',
  execution_side = hrg_exercises.next_execution_side
from hrg_exercises
where e.id = hrg_exercises.id;
