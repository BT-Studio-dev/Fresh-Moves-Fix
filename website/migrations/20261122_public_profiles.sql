-- Public profile data contains no email addresses.
create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  created_at timestamptz not null default now()
);
alter table public.user_profiles enable row level security;
revoke all on public.user_profiles from public, anon, authenticated;
grant select on public.user_profiles to anon, authenticated;
create policy "Public profiles" on public.user_profiles for select to anon, authenticated using (true);
create function public.sync_user_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_profiles(user_id,display_name,created_at) values (new.id, left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'username'),''),'Player'),40),new.created_at)
  on conflict(user_id) do update set display_name=excluded.display_name;
  return new;
end; $$;
revoke all on function public.sync_user_profile() from public, anon, authenticated;
create trigger sync_user_profile after insert or update of raw_user_meta_data on auth.users for each row execute function public.sync_user_profile();
insert into public.user_profiles(user_id,display_name,created_at) select id,left(coalesce(nullif(btrim(raw_user_meta_data ->> 'username'),''),'Player'),40),created_at from auth.users on conflict(user_id) do nothing;
-- User approved public last-active times, without exposing account emails.
grant select on public.account_activity to anon;
create policy "Public last active" on public.account_activity for select to anon, authenticated using (true);
create table public.profile_uploads (
  id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references public.user_profiles(user_id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80), kind text not null check(kind in ('skin','image')),
  image_data text not null check (char_length(image_data)<=180000 and image_data ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$' and (kind <> 'skin' or image_data like 'data:image/png;base64,%')),
  created_at timestamptz not null default now()
);
alter table public.profile_uploads enable row level security;
revoke all on public.profile_uploads from public, anon, authenticated;
grant select on public.profile_uploads to anon, authenticated;
grant insert(title,kind,image_data) on public.profile_uploads to authenticated;
grant delete on public.profile_uploads to authenticated;
create policy "Public uploads" on public.profile_uploads for select to anon, authenticated using (true);
create policy "Users upload their own" on public.profile_uploads for insert to authenticated with check (user_id=(select auth.uid()));
create policy "Users delete their uploads" on public.profile_uploads for delete to authenticated using (user_id=(select auth.uid()));
create table public.profile_comments (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.user_profiles(user_id) on delete cascade,
 author_id uuid not null default auth.uid() references public.user_profiles(user_id) on delete cascade,
 body text not null check(char_length(btrim(body)) between 1 and 1000), created_at timestamptz not null default now()
);
alter table public.profile_comments enable row level security;
revoke all on public.profile_comments from public, anon, authenticated;
grant select on public.profile_comments to anon, authenticated;
grant insert(profile_id,body) on public.profile_comments to authenticated;
grant delete on public.profile_comments to authenticated;
create policy "Public profile comments" on public.profile_comments for select to anon, authenticated using (true);
create policy "Users write profile comments" on public.profile_comments for insert to authenticated with check (author_id=(select auth.uid()));
create policy "Users moderate profile comments" on public.profile_comments for delete to authenticated using (author_id=(select auth.uid()) or profile_id=(select auth.uid()) or exists(select 1 from public.comment_roles where user_id=(select auth.uid()) and role in ('owner','co-owner')));
create table public.profile_friendships (
 id uuid primary key default gen_random_uuid(), requester uuid not null default auth.uid() references public.user_profiles(user_id) on delete cascade,
 recipient uuid not null references public.user_profiles(user_id) on delete cascade, accepted boolean not null default false,
 created_at timestamptz not null default now(), check(requester<>recipient)
);
create unique index profile_friendships_pair on public.profile_friendships (least(requester,recipient),greatest(requester,recipient));
alter table public.profile_friendships enable row level security;
revoke all on public.profile_friendships from public, anon, authenticated;
grant select on public.profile_friendships to anon, authenticated;
grant insert(recipient) on public.profile_friendships to authenticated;
grant delete on public.profile_friendships to authenticated;
create policy "Visible friendships" on public.profile_friendships for select to anon, authenticated using (accepted or requester=(select auth.uid()) or recipient=(select auth.uid()));
create policy "Send own friend request" on public.profile_friendships for insert to authenticated with check (requester=(select auth.uid()) and not accepted);
create policy "Remove own friendships" on public.profile_friendships for delete to authenticated using (requester=(select auth.uid()) or recipient=(select auth.uid()));
create function public.accept_friend_request(request_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
 update public.profile_friendships set accepted=true where id=request_id and recipient=auth.uid() and not accepted;
 if not found then raise exception 'Request not found or not permitted'; end if;
end; $$;
revoke all on function public.accept_friend_request(uuid) from public, anon;
grant execute on function public.accept_friend_request(uuid) to authenticated;
create index profile_uploads_user_created on public.profile_uploads(user_id,created_at desc);
create index profile_comments_profile_created on public.profile_comments(profile_id,created_at desc);
