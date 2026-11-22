create table public.tool_comments (
 id uuid primary key default gen_random_uuid(),
 page text not null check (page in ('editor','title','paint','model','animation','cape','render','pfp','highlights','banner-studio','pfp-studio','pose','creator')),
 author_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 author_name text not null default left(coalesce(nullif(trim(auth.jwt() -> 'user_metadata' ->> 'username'), ''), 'Player'), 40),
 body text not null check (char_length(trim(body)) between 1 and 1000),
 created_at timestamptz not null default now()
);
create index tool_comments_page_created on public.tool_comments(page, created_at desc, id desc);
alter table public.tool_comments enable row level security;
revoke all on public.tool_comments from anon, authenticated;
grant select on public.tool_comments to anon, authenticated;
grant insert (page, body) on public.tool_comments to authenticated;
grant delete on public.tool_comments to authenticated;
create policy "Anyone can read comments" on public.tool_comments for select to anon, authenticated using (true);
create policy "Users can post their own comments" on public.tool_comments for insert to authenticated with check ((select auth.uid()) = author_id);
create policy "Users can delete their own comments" on public.tool_comments for delete to authenticated using ((select auth.uid()) = author_id);
