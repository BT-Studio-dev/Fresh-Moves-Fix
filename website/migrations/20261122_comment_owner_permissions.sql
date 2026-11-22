create table public.comment_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role = 'owner')
);
alter table public.comment_roles enable row level security;
revoke all on public.comment_roles from anon, authenticated;
grant select on public.comment_roles to anon, authenticated;
create policy "Public can read comment roles" on public.comment_roles for select to anon, authenticated using (true);
insert into public.comment_roles (user_id, role)
select id, 'owner' from auth.users where lower(email) = lower('fetgeryrd0187@gmail.com') and email_confirmed_at is not null;
alter table public.tool_comments add column pinned boolean not null default false;
create policy "Owners can delete any comment" on public.tool_comments for delete to authenticated using (exists (select 1 from public.comment_roles where user_id = (select auth.uid()) and role = 'owner'));
grant update (pinned) on public.tool_comments to authenticated;
create policy "Owners can pin comments" on public.tool_comments for update to authenticated using (exists (select 1 from public.comment_roles where user_id = (select auth.uid()) and role = 'owner')) with check (exists (select 1 from public.comment_roles where user_id = (select auth.uid()) and role = 'owner'));
