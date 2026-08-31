-- WaveSign admin — authorization & row-level security
--
-- Model: only administrators ever get an auth account (public sign-up is disabled
-- in the Supabase Auth settings). Every admin is listed in public.admins.
-- All write access is enforced here, in the database — never in the browser.

-- ---------------------------------------------------------------------------
-- admins registry
-- ---------------------------------------------------------------------------
create table public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- enable RLS
-- ---------------------------------------------------------------------------
alter table public.categories      enable row level security;
alter table public.services        enable row level security;
alter table public.service_images  enable row level security;
alter table public.settings        enable row level security;
alter table public.service_drafts  enable row level security;
alter table public.admins          enable row level security;

-- categories -----------------------------------------------------------------
create policy categories_public_read on public.categories
  for select using (is_published = true);

create policy categories_admin_read on public.categories
  for select using (public.is_admin());

create policy categories_admin_write on public.categories
  for insert with check (public.is_admin());

create policy categories_admin_update on public.categories
  for update using (public.is_admin()) with check (public.is_admin());

create policy categories_admin_delete on public.categories
  for delete using (public.is_admin());

-- services ------------------------------------------------------------------
create policy services_public_read on public.services
  for select using (is_published = true);

create policy services_admin_read on public.services
  for select using (public.is_admin());

create policy services_admin_write on public.services
  for insert with check (public.is_admin());

create policy services_admin_update on public.services
  for update using (public.is_admin()) with check (public.is_admin());

create policy services_admin_delete on public.services
  for delete using (public.is_admin());

-- service_images ----------------------------------------------------------
create policy service_images_public_read on public.service_images
  for select using (
    exists (select 1 from public.services s where s.id = service_id and s.is_published)
  );

create policy service_images_admin_read on public.service_images
  for select using (public.is_admin());

create policy service_images_admin_write on public.service_images
  for insert with check (public.is_admin());

create policy service_images_admin_update on public.service_images
  for update using (public.is_admin()) with check (public.is_admin());

create policy service_images_admin_delete on public.service_images
  for delete using (public.is_admin());

-- settings ----------------------------------------------------------------
create policy settings_public_read on public.settings
  for select using (true);

create policy settings_admin_write on public.settings
  for insert with check (public.is_admin());

create policy settings_admin_update on public.settings
  for update using (public.is_admin()) with check (public.is_admin());

-- service_drafts (owner-only) ------------------------------------------------
create policy drafts_owner_all on public.service_drafts
  for all
  using (user_id = auth.uid() and public.is_admin())
  with check (user_id = auth.uid() and public.is_admin());

-- admins (visible to admins, never writable from the client) -----------------
create policy admins_read on public.admins
  for select using (public.is_admin());

-- ---------------------------------------------------------------------------
-- ordering helpers — set sort_order from the position in the given id array
-- ---------------------------------------------------------------------------
create or replace function public.reorder_services(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.services s
     set sort_order = pos.ord
    from (
      select unnest(p_ids) as id, generate_subscripts(p_ids, 1) as ord
    ) pos
   where s.id = pos.id;
end;
$$;

create or replace function public.reorder_categories(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.categories c
     set sort_order = pos.ord
    from (
      select unnest(p_ids) as id, generate_subscripts(p_ids, 1) as ord
    ) pos
   where c.id = pos.id;
end;
$$;

create or replace function public.reorder_service_images(p_service_id uuid, p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.service_images si
     set sort_order = pos.ord
    from (
      select unnest(p_ids) as id, generate_subscripts(p_ids, 1) as ord
    ) pos
   where si.id = pos.id and si.service_id = p_service_id;
end;
$$;

revoke all on function public.reorder_services(uuid[])                from public, anon;
revoke all on function public.reorder_categories(uuid[])             from public, anon;
revoke all on function public.reorder_service_images(uuid, uuid[])   from public, anon;
grant execute on function public.reorder_services(uuid[])              to authenticated;
grant execute on function public.reorder_categories(uuid[])            to authenticated;
grant execute on function public.reorder_service_images(uuid, uuid[])  to authenticated;
