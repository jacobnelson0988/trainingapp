create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = (select auth.uid())
$$;

create or replace function public.current_user_team_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select team_id
  from public.profiles
  where id = (select auth.uid())
$$;

create or replace function public.is_head_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'head_admin', false)
$$;

create or replace function public.is_coach()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'coach', false)
$$;

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_templates enable row level security;
alter table public.workout_template_exercises enable row level security;
alter table public.workout_template_exercise_alternatives enable row level security;
alter table public.warmup_templates enable row level security;
alter table public.messages enable row level security;
alter table public.message_recipients enable row level security;
alter table public.beta_feedback enable row level security;
alter table public.exercise_requests enable row level security;

drop policy if exists "Authenticated users can read allowed profiles" on public.profiles;
create policy "Authenticated users can read allowed profiles"
  on public.profiles
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or role = 'head_admin'
    or public.is_head_admin()
    or (
      public.is_coach()
      and team_id is not distinct from public.current_user_team_id()
    )
    or (
      public.current_user_role() = 'player'
      and role = 'coach'
      and team_id is not distinct from public.current_user_team_id()
    )
  );

drop policy if exists "Coach and admin can update player profiles" on public.profiles;
create policy "Coach and admin can update player profiles"
  on public.profiles
  for update
  to authenticated
  using (
    public.is_head_admin()
    or (
      public.is_coach()
      and role = 'player'
      and team_id is not distinct from public.current_user_team_id()
    )
  )
  with check (
    public.is_head_admin()
    or (
      public.is_coach()
      and role = 'player'
      and team_id is not distinct from public.current_user_team_id()
    )
  );

drop policy if exists "Authenticated users can read teams" on public.teams;
create policy "Authenticated users can read teams"
  on public.teams
  for select
  to authenticated
  using (true);

drop policy if exists "Head admin can manage teams" on public.teams;
create policy "Head admin can manage teams"
  on public.teams
  for all
  to authenticated
  using (public.is_head_admin())
  with check (public.is_head_admin());

drop policy if exists "Authenticated users can read exercises" on public.exercises;
create policy "Authenticated users can read exercises"
  on public.exercises
  for select
  to authenticated
  using (true);

drop policy if exists "Head admin can manage exercises" on public.exercises;
create policy "Head admin can manage exercises"
  on public.exercises
  for all
  to authenticated
  using (public.is_head_admin())
  with check (public.is_head_admin());

drop policy if exists "Authenticated users can read team workout templates" on public.workout_templates;
create policy "Authenticated users can read team workout templates"
  on public.workout_templates
  for select
  to authenticated
  using (
    public.is_head_admin()
    or team_id is not distinct from public.current_user_team_id()
  );

drop policy if exists "Coach and admin can manage team workout templates" on public.workout_templates;
create policy "Coach and admin can manage team workout templates"
  on public.workout_templates
  for all
  to authenticated
  using (
    public.is_head_admin()
    or (
      public.is_coach()
      and team_id is not distinct from public.current_user_team_id()
    )
  )
  with check (
    public.is_head_admin()
    or (
      public.is_coach()
      and team_id is not distinct from public.current_user_team_id()
    )
  );

drop policy if exists "Authenticated users can read team workout template exercises" on public.workout_template_exercises;
create policy "Authenticated users can read team workout template exercises"
  on public.workout_template_exercises
  for select
  to authenticated
  using (
    public.is_head_admin()
    or exists (
      select 1
      from public.workout_templates
      where workout_templates.id = workout_template_exercises.workout_template_id
        and workout_templates.team_id is not distinct from public.current_user_team_id()
    )
  );

drop policy if exists "Coach and admin can manage team workout template exercises" on public.workout_template_exercises;
create policy "Coach and admin can manage team workout template exercises"
  on public.workout_template_exercises
  for all
  to authenticated
  using (
    public.is_head_admin()
    or exists (
      select 1
      from public.workout_templates
      where workout_templates.id = workout_template_exercises.workout_template_id
        and public.is_coach()
        and workout_templates.team_id is not distinct from public.current_user_team_id()
    )
  )
  with check (
    public.is_head_admin()
    or exists (
      select 1
      from public.workout_templates
      where workout_templates.id = workout_template_exercises.workout_template_id
        and public.is_coach()
        and workout_templates.team_id is not distinct from public.current_user_team_id()
    )
  );

drop policy if exists "Authenticated users can read team workout template alternatives" on public.workout_template_exercise_alternatives;
create policy "Authenticated users can read team workout template alternatives"
  on public.workout_template_exercise_alternatives
  for select
  to authenticated
  using (
    public.is_head_admin()
    or exists (
      select 1
      from public.workout_template_exercises wte
      join public.workout_templates wt on wt.id = wte.workout_template_id
      where wte.id = workout_template_exercise_alternatives.workout_template_exercise_id
        and wt.team_id is not distinct from public.current_user_team_id()
    )
  );

drop policy if exists "Coach and admin can manage team workout template alternatives" on public.workout_template_exercise_alternatives;
create policy "Coach and admin can manage team workout template alternatives"
  on public.workout_template_exercise_alternatives
  for all
  to authenticated
  using (
    public.is_head_admin()
    or exists (
      select 1
      from public.workout_template_exercises wte
      join public.workout_templates wt on wt.id = wte.workout_template_id
      where wte.id = workout_template_exercise_alternatives.workout_template_exercise_id
        and public.is_coach()
        and wt.team_id is not distinct from public.current_user_team_id()
    )
  )
  with check (
    public.is_head_admin()
    or exists (
      select 1
      from public.workout_template_exercises wte
      join public.workout_templates wt on wt.id = wte.workout_template_id
      where wte.id = workout_template_exercise_alternatives.workout_template_exercise_id
        and public.is_coach()
        and wt.team_id is not distinct from public.current_user_team_id()
    )
  );

drop policy if exists "Authenticated users can read team warmup templates" on public.warmup_templates;
create policy "Authenticated users can read team warmup templates"
  on public.warmup_templates
  for select
  to authenticated
  using (
    public.is_head_admin()
    or team_id is not distinct from public.current_user_team_id()
  );

drop policy if exists "Coach and admin can manage team warmup templates" on public.warmup_templates;
create policy "Coach and admin can manage team warmup templates"
  on public.warmup_templates
  for all
  to authenticated
  using (
    public.is_head_admin()
    or (
      public.is_coach()
      and team_id is not distinct from public.current_user_team_id()
    )
  )
  with check (
    public.is_head_admin()
    or (
      public.is_coach()
      and team_id is not distinct from public.current_user_team_id()
    )
  );

drop policy if exists "Users can read own messages" on public.messages;
create policy "Users can read own messages"
  on public.messages
  for select
  to authenticated
  using (
    sender_id = (select auth.uid())
    or exists (
      select 1
      from public.message_recipients
      where message_recipients.message_id = messages.id
        and message_recipients.recipient_id = (select auth.uid())
    )
  );

drop policy if exists "Users can send own messages" on public.messages;
create policy "Users can send own messages"
  on public.messages
  for insert
  to authenticated
  with check (sender_id = (select auth.uid()));

drop policy if exists "Users can delete own messages" on public.messages;
create policy "Users can delete own messages"
  on public.messages
  for delete
  to authenticated
  using (sender_id = (select auth.uid()));

drop policy if exists "Users can read own message recipients" on public.message_recipients;
create policy "Users can read own message recipients"
  on public.message_recipients
  for select
  to authenticated
  using (
    recipient_id = (select auth.uid())
    or exists (
      select 1
      from public.messages
      where messages.id = message_recipients.message_id
        and messages.sender_id = (select auth.uid())
    )
  );

drop policy if exists "Users can insert recipients for own messages" on public.message_recipients;
create policy "Users can insert recipients for own messages"
  on public.message_recipients
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.messages
      where messages.id = message_recipients.message_id
        and messages.sender_id = (select auth.uid())
    )
  );

drop policy if exists "Recipients can update own message rows" on public.message_recipients;
create policy "Recipients can update own message rows"
  on public.message_recipients
  for update
  to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

drop policy if exists "Users can delete own message recipients" on public.message_recipients;
create policy "Users can delete own message recipients"
  on public.message_recipients
  for delete
  to authenticated
  using (
    recipient_id = (select auth.uid())
    or exists (
      select 1
      from public.messages
      where messages.id = message_recipients.message_id
        and messages.sender_id = (select auth.uid())
    )
  );

drop policy if exists "Head admin can read feedback" on public.beta_feedback;
create policy "Head admin can read feedback"
  on public.beta_feedback
  for select
  to authenticated
  using (public.is_head_admin());

drop policy if exists "Authenticated users can send feedback" on public.beta_feedback;
create policy "Authenticated users can send feedback"
  on public.beta_feedback
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Head admin can update feedback" on public.beta_feedback;
create policy "Head admin can update feedback"
  on public.beta_feedback
  for update
  to authenticated
  using (public.is_head_admin())
  with check (public.is_head_admin());

drop policy if exists "Head admin can read exercise requests" on public.exercise_requests;
create policy "Head admin can read exercise requests"
  on public.exercise_requests
  for select
  to authenticated
  using (public.is_head_admin());

drop policy if exists "Authenticated users can create exercise requests" on public.exercise_requests;
create policy "Authenticated users can create exercise requests"
  on public.exercise_requests
  for insert
  to authenticated
  with check (requester_id = (select auth.uid()));

drop policy if exists "Head admin can update exercise requests" on public.exercise_requests;
create policy "Head admin can update exercise requests"
  on public.exercise_requests
  for update
  to authenticated
  using (public.is_head_admin())
  with check (public.is_head_admin());
