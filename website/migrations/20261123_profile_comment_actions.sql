-- Profile comment replies and author-only editing. Existing comments are unchanged.
alter table public.profile_comments add column reply_to uuid references public.profile_comments(id) on delete set null;
alter table public.profile_comments add column edited_at timestamptz;
grant insert (reply_to) on public.profile_comments to authenticated;
grant update (body) on public.profile_comments to authenticated;
create policy "Authors edit their profile comments" on public.profile_comments for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create function public.profile_comment_validate() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.reply_to is not null and not exists
    (select 1 from public.profile_comments p where p.id = new.reply_to and p.profile_id = new.profile_id) then
    raise exception 'Reply must refer to a comment on the same profile';
  end if;
  if tg_op = 'UPDATE' and new.body is distinct from old.body then new.edited_at = now(); end if;
  return new;
end $$;
create trigger profile_comment_validate before insert or update on public.profile_comments
  for each row execute function public.profile_comment_validate();
