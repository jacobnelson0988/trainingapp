create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null,
  team_id uuid references public.teams(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint messages_sender_id_fkey
    foreign key (sender_id)
    references public.profiles(id)
    on delete cascade
);

create table if not exists public.message_recipients (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null,
  recipient_id uuid not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint message_recipients_message_id_fkey
    foreign key (message_id)
    references public.messages(id)
    on delete cascade,
  constraint message_recipients_recipient_id_fkey
    foreign key (recipient_id)
    references public.profiles(id)
    on delete cascade,
  constraint message_recipients_message_id_recipient_id_key
    unique (message_id, recipient_id)
);

create index if not exists messages_sender_id_idx on public.messages(sender_id);
create index if not exists messages_team_id_idx on public.messages(team_id);
create index if not exists message_recipients_message_id_idx on public.message_recipients(message_id);
create index if not exists message_recipients_recipient_id_idx on public.message_recipients(recipient_id);

create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  team_id uuid references public.teams(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint beta_feedback_user_id_fkey
    foreign key (user_id)
    references public.profiles(id)
    on delete cascade
);

create index if not exists beta_feedback_user_id_idx on public.beta_feedback(user_id);
create index if not exists beta_feedback_team_id_idx on public.beta_feedback(team_id);
