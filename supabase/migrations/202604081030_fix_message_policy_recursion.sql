create or replace function public.user_owns_message(target_message_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.messages
    where id = target_message_id
      and sender_id = (select auth.uid())
  )
$$;

create or replace function public.user_is_message_recipient(target_message_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.message_recipients
    where message_id = target_message_id
      and recipient_id = (select auth.uid())
  )
$$;

drop policy if exists "Users can read own messages" on public.messages;
create policy "Users can read own messages"
  on public.messages
  for select
  to authenticated
  using (
    sender_id = (select auth.uid())
    or public.user_is_message_recipient(id)
  );

drop policy if exists "Users can read own message recipients" on public.message_recipients;
create policy "Users can read own message recipients"
  on public.message_recipients
  for select
  to authenticated
  using (
    recipient_id = (select auth.uid())
    or public.user_owns_message(message_id)
  );

drop policy if exists "Users can insert recipients for own messages" on public.message_recipients;
create policy "Users can insert recipients for own messages"
  on public.message_recipients
  for insert
  to authenticated
  with check (public.user_owns_message(message_id));

drop policy if exists "Users can delete own message recipients" on public.message_recipients;
create policy "Users can delete own message recipients"
  on public.message_recipients
  for delete
  to authenticated
  using (
    recipient_id = (select auth.uid())
    or public.user_owns_message(message_id)
  );
