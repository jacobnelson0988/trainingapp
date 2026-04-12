update public.exercises
set description = case name
  when 'Kastprogram nivå A' then '15 skott på 50 % av maximal skotthastighet, 10 skott på 70 %.'
  when 'Kastprogram nivå B' then '15 skott på 50 % av maximal skotthastighet, 10 skott på 70 % och 5 skott på 90 %.'
  when 'Kastprogram nivå C' then '15 skott på 60 % av maximal skotthastighet, 10 skott på 80 % och 5 skott på 100 %.'
  when 'Kastprogram nivå D' then '15 skott på 70 % av maximal skotthastighet, 10 skott på 85 % och 5 skott på 100 %.'
  else description
end
where name in (
  'Kastprogram nivå A',
  'Kastprogram nivå B',
  'Kastprogram nivå C',
  'Kastprogram nivå D'
);

update public.workout_template_exercises as wte
set custom_guide = null
from public.exercises as e
where e.id = wte.exercise_id
  and e.name in (
    'Kastprogram nivå A',
    'Kastprogram nivå B',
    'Kastprogram nivå C',
    'Kastprogram nivå D'
  );
