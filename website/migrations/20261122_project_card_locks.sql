create table public.project_card_locks (project text primary key check (project in ('pack','paint','editor','pfp','creator','title','animation')), locked boolean not null default false);
insert into public.project_card_locks (project) values ('pack'),('paint'),('editor'),('pfp'),('creator'),('title'),('animation');
alter table public.project_card_locks enable row level security;
revoke all on public.project_card_locks from anon, authenticated;
grant select on public.project_card_locks to anon, authenticated;
grant update (locked) on public.project_card_locks to authenticated;
create policy "Anyone can read project locks" on public.project_card_locks for select to anon, authenticated using (true);
create policy "Owners can update project locks" on public.project_card_locks for update to authenticated using (exists (select 1 from public.comment_roles where user_id=(select auth.uid()) and role='owner')) with check (exists (select 1 from public.comment_roles where user_id=(select auth.uid()) and role='owner'));
