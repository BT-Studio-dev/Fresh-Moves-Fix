-- An authenticated user can delete only the account identified by their JWT.
-- Cascading foreign keys delete their comments, embedded images, and role.
create function public.delete_own_account() returns void
language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  delete from auth.users where id = current_user_id;
  if not found then
    raise exception 'Account not found';
  end if;
end;
$$;
revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
