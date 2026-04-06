alter table public.exercises
add column if not exists navigation_category text;

update public.exercises
set navigation_category = case
  when coalesce(navigation_category, '') <> '' then navigation_category
  when muscle_groups is not null and array_length(muscle_groups, 1) > 0 then
    case muscle_groups[1]
      when 'Bål' then 'Mage'
      when 'Axlar' then 'Axlar'
      when 'Ben' then 'Ben'
      when 'Biceps' then 'Biceps'
      when 'Bröst' then 'Bröst'
      when 'Kondition' then 'Kondition'
      when 'Rygg' then 'Rygg'
      when 'Triceps' then 'Triceps'
      when 'Armar' then 'Armar'
      when 'Lats' then 'Lats'
      when 'Säte' then 'Säte'
      when 'Baksida lår' then 'Baksida lår'
      when 'Balans' then 'Balans'
      when 'Rotation' then 'Rotation'
      when 'Rörlighet' then 'Rörlighet'
      when 'Helkropp' then 'Helkropp'
      else 'Övrigt'
    end
  when exercise_type = 'seconds_only' then 'Kondition'
  else 'Övrigt'
end;
