-- Assign specific verified users separately; do not trust user-editable usernames.
alter table public.comment_roles drop constraint comment_roles_role_check;
alter table public.comment_roles add constraint comment_roles_role_check check (role in ('owner', 'co-owner'));
create policy "Co-owners can delete any comment" on public.tool_comments for delete to authenticated using (exists (select 1 from public.comment_roles where user_id = (select auth.uid()) and role = 'co-owner'));
