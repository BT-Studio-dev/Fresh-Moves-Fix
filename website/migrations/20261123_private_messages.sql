-- Private messages are visible only to their two participants, not encrypted end-to-end.
create table public.direct_messages (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null default auth.uid() references public.user_profiles(user_id) on delete cascade,
 recipient_id uuid not null references public.user_profiles(user_id) on delete cascade,
 body text not null check (char_length(btrim(body)) between 1 and 1000),
 created_at timestamptz not null default now(),
 check (sender_id <> recipient_id)
);
create index direct_messages_sender_time on public.direct_messages(sender_id, created_at desc);
create index direct_messages_recipient_time on public.direct_messages(recipient_id, created_at desc);
create table public.message_blocks (
 blocker_id uuid not null default auth.uid() references public.user_profiles(user_id) on delete cascade,
 blocked_id uuid not null references public.user_profiles(user_id) on delete cascade,
 primary key(blocker_id, blocked_id), check(blocker_id <> blocked_id)
);
alter table public.direct_messages enable row level security;
alter table public.message_blocks enable row level security;
revoke all on public.direct_messages, public.message_blocks from public, anon, authenticated;
grant select on public.direct_messages, public.message_blocks to authenticated;
grant insert (recipient_id, body) on public.direct_messages to authenticated;
grant insert (blocked_id) on public.message_blocks to authenticated;
grant delete on public.message_blocks to authenticated;
create policy "Participants read messages" on public.direct_messages for select to authenticated using ((select auth.uid()) in (sender_id,recipient_id));
create policy "Users send messages" on public.direct_messages for insert to authenticated with check (sender_id = (select auth.uid()));
create policy "Users see their blocks" on public.message_blocks for select to authenticated using (blocker_id = (select auth.uid()));
create policy "Users create their blocks" on public.message_blocks for insert to authenticated with check (blocker_id = (select auth.uid()));
create policy "Users remove their blocks" on public.message_blocks for delete to authenticated using (blocker_id = (select auth.uid()));
create function public.check_direct_message() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or new.sender_id <> auth.uid() then raise exception 'Not permitted'; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.sender_id::text, 0));
  if exists (select 1 from public.message_blocks where (blocker_id = new.sender_id and blocked_id = new.recipient_id) or (blocker_id = new.recipient_id and blocked_id = new.sender_id)) then
    raise exception 'Message cannot be delivered';
  end if;
  if (select count(*) from public.direct_messages where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Message rate limit reached';
  end if;
  return new;
end $$;
revoke all on function public.check_direct_message() from public, anon, authenticated;
create trigger check_direct_message before insert on public.direct_messages for each row execute function public.check_direct_message();
