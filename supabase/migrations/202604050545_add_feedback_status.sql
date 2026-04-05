alter table public.beta_feedback
add column if not exists status text not null default 'open';

alter table public.beta_feedback
add column if not exists status_updated_at timestamptz;

update public.beta_feedback
set status = 'open'
where status is null;

alter table public.beta_feedback
drop constraint if exists beta_feedback_status_check;

alter table public.beta_feedback
add constraint beta_feedback_status_check
check (status in ('open', 'done', 'future', 'wont_do'));

create index if not exists beta_feedback_status_idx on public.beta_feedback(status);
