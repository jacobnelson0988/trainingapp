alter table public.messages
add column if not exists subject text;

update public.messages
set subject = coalesce(nullif(subject, ''), 'Meddelande')
where subject is null or subject = '';

alter table public.messages
alter column subject set default 'Meddelande';

alter table public.messages
alter column subject set not null;
