-- Private, server-timestamped activity; cascades when the user deletes their account.
create table public.account_activity (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);
alter table public.account_activity enable row level security;
revoke all on public.account_activity from public, anon, authenticated;
grant select on public.account_activity to authenticated;
create policy "Users can read their own activity" on public.account_activity for select to authenticated using (user_id = (select auth.uid()));
create function public.touch_account_activity() returns void
language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  insert into public.account_activity (user_id, last_seen_at) values (current_user_id, now())
  on conflict (user_id) do update set last_seen_at = excluded.last_seen_at;
end;
$$;
revoke all on function public.touch_account_activity() from public, anon;
grant execute on function public.touch_account_activity() to authenticated;
