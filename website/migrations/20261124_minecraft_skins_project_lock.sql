-- Extend the existing owner-only project locks without changing any current lock state.
alter table public.project_card_locks drop constraint if exists project_card_locks_project_check;
alter table public.project_card_locks add constraint project_card_locks_project_check
  check (project in ('pack','paint','editor','pfp','creator','title','animation','minecraft-skins'));
insert into public.project_card_locks (project, locked)
  values ('minecraft-skins', false) on conflict (project) do nothing;
