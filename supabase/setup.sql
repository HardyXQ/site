-- WaveSign — full database setup. Run once in the Supabase SQL Editor.
-- (Regenerate with: npm run setup:sql)

-- ================= supabase/migrations/20250831000001_init.sql =================
-- WaveSign admin — core schema
-- All human-facing text fields are i18n: jsonb shaped as {"ru": "...", "uk": "...", "en": "..."}

create extension if not exists "pgcrypto";

-- Keep updated_at fresh on every UPDATE
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  name         jsonb   not null default '{}'::jsonb,
  slug         text    not null unique,
  is_published boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index categories_sort_idx on public.categories (sort_order);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------------
create type public.price_type as enum ('fixed', 'from', 'on_request');

create table public.services (
  id                uuid primary key default gen_random_uuid(),
  title             jsonb   not null default '{}'::jsonb,
  slug              text    not null unique,
  short_description jsonb   not null default '{}'::jsonb,
  description       jsonb   not null default '{}'::jsonb,  -- sanitized rich HTML per language
  price_amount      numeric(12,2),
  price_currency    text    not null default 'USD'
                      check (price_currency in ('USD','EUR','GBP','UAH','RUB','PLN')),
  price_type        public.price_type not null default 'from',
  price_unit        text check (price_unit in ('item','hour','minute')),
  main_image_url    text,
  seo_title         jsonb   not null default '{}'::jsonb,
  seo_description   jsonb   not null default '{}'::jsonb,
  og_image_url      text,
  is_published      boolean not null default false,
  sort_order        integer not null default 0,
  sub_group         smallint not null default 0,   -- preserves the current public-site sub-grouping
  category_id       uuid references public.categories(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index services_category_idx      on public.services (category_id);
create index services_pub_sort_idx      on public.services (is_published, sort_order);
create index services_updated_at_idx    on public.services (updated_at desc);

create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

-- price_amount is required unless the price is "on request"
alter table public.services
  add constraint services_price_amount_required
  check (price_type = 'on_request' or price_amount is not null);

-- ---------------------------------------------------------------------------
-- service_images (gallery)
-- ---------------------------------------------------------------------------
create table public.service_images (
  id         uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  image_url  text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index service_images_service_idx on public.service_images (service_id, sort_order);

-- ---------------------------------------------------------------------------
-- settings (studio-wide key/value)
-- ---------------------------------------------------------------------------
create table public.settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- service_drafts (server-side autosave for existing services)
-- ---------------------------------------------------------------------------
create table public.service_drafts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  unique (user_id, service_id)
);
create trigger service_drafts_set_updated_at
  before update on public.service_drafts
  for each row execute function public.set_updated_at();

-- ================= supabase/migrations/20250831000002_security.sql =================
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

-- ================= supabase/migrations/20250831000003_storage.sql =================
-- WaveSign admin — image storage bucket
--
-- Public read (images are shown on the public site), writes restricted to admins.
-- Files are stored as optimized WebP/JPEG/PNG; the 5 MB limit is enforced by the
-- bucket and again in the browser before upload.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'service-images',
  'service-images',
  true,
  5242880,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "service-images public read"   on storage.objects;
drop policy if exists "service-images admin insert"  on storage.objects;
drop policy if exists "service-images admin update"  on storage.objects;
drop policy if exists "service-images admin delete"  on storage.objects;

create policy "service-images public read" on storage.objects
  for select using (bucket_id = 'service-images');

create policy "service-images admin insert" on storage.objects
  for insert with check (bucket_id = 'service-images' and public.is_admin());

create policy "service-images admin update" on storage.objects
  for update using (bucket_id = 'service-images' and public.is_admin())
  with check (bucket_id = 'service-images' and public.is_admin());

create policy "service-images admin delete" on storage.objects
  for delete using (bucket_id = 'service-images' and public.is_admin());

-- ================= supabase/seed.sql =================
-- Generated by scripts/build-seed.mjs — initial migration of existing site content.
-- Safe to re-run: rows are matched by slug.

insert into public.categories (slug, name, is_published, sort_order) values ('design', '{"ru":"Дизайн и анимация","uk":"Дизайн і анімація","en":"Design and animation"}'::jsonb, true, 0) on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.categories (slug, name, is_published, sort_order) values ('development', '{"ru":"Разработка","uk":"Розробка","en":"Development"}'::jsonb, true, 1) on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.categories (slug, name, is_published, sort_order) values ('additional', '{"ru":"Дополнительно","uk":"Додатково","en":"Additional"}'::jsonb, true, 2) on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;

insert into public.services (slug, title, short_description, description, price_amount, price_currency, price_type, price_unit, main_image_url, is_published, sort_order, sub_group, category_id) values ('logo', '{"ru":"Лого","uk":"Лого","en":"Logo"}'::jsonb, '{"ru":"Разрабатываем уникальный логотип, который отражает характер бренда и остаётся узнаваемым в цифровых и печатных материалах.","uk":"Розробляємо унікальний логотип, який відображає характер бренду і залишається впізнаваним у цифрових та друкованих матеріалах.","en":"We design a unique logo that reflects your brand''s character and stays recognizable across digital and print materials."}'::jsonb, '{"ru":"<p>Разрабатываем уникальный логотип, который отражает характер бренда и остаётся узнаваемым в цифровых и печатных материалах.</p>","uk":"<p>Розробляємо унікальний логотип, який відображає характер бренду і залишається впізнаваним у цифрових та друкованих матеріалах.</p>","en":"<p>We design a unique logo that reflects your brand''s character and stays recognizable across digital and print materials.</p>"}'::jsonb, 300, 'USD', 'from', null, 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%BB%D0%BE%D0%B3%D0%BE/cover.png', true, 0, 0, (select id from public.categories where slug = 'design')) on conflict (slug) do update set title = excluded.title, short_description = excluded.short_description, description = excluded.description, price_amount = excluded.price_amount, price_unit = excluded.price_unit, main_image_url = excluded.main_image_url, sort_order = excluded.sort_order, sub_group = excluded.sub_group, category_id = excluded.category_id;
delete from public.service_images where service_id = (select id from public.services where slug = 'logo');
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'logo'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%BB%D0%BE%D0%B3%D0%BE/559_1x_shots_so.png', 0);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'logo'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%BB%D0%BE%D0%B3%D0%BE/cover.png', 1);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'logo'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%BB%D0%BE%D0%B3%D0%BE/Notebook%20with%20Flowers%20Mockup.png', 2);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'logo'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%BB%D0%BE%D0%B3%D0%BE/%D0%BF%D1%82%D0%B8%D1%86%D0%B0%20%2B%20%D0%B2%D0%B5%D0%B5%D1%80%20-%20%D0%BB%D0%BE%D0%B3%D0%BE.png', 3);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'logo'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%BB%D0%BE%D0%B3%D0%BE/%D1%80%D0%B0%D0%B7%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D0%BA%D0%B0%20%D1%80%D0%B0%D0%B7%D0%BD%D1%8B%D1%85%20%D0%B2%D0%B0%D1%80%D0%B8%D0%B0%D0%BD%D1%82%D0%BE%D0%B2%20%D0%BB%D0%BE%D0%B3%D0%BE.jpg', 4);
insert into public.services (slug, title, short_description, description, price_amount, price_currency, price_type, price_unit, main_image_url, is_published, sort_order, sub_group, category_id) values ('logo-animation', '{"ru":"Анимация лого","uk":"Анімація лого","en":"Logo animation"}'::jsonb, '{"ru":"Оживляем существующий логотип с помощью динамичной анимации для видео, социальных сетей, презентаций и цифровых продуктов.","uk":"Оживляємо наявний логотип за допомогою динамічної анімації для відео, соціальних мереж, презентацій і цифрових продуктів.","en":"We bring your existing logo to life with dynamic animation for video, social media, presentations, and digital products."}'::jsonb, '{"ru":"<p>Оживляем существующий логотип с помощью динамичной анимации для видео, социальных сетей, презентаций и цифровых продуктов.</p>","uk":"<p>Оживляємо наявний логотип за допомогою динамічної анімації для відео, соціальних мереж, презентацій і цифрових продуктів.</p>","en":"<p>We bring your existing logo to life with dynamic animation for video, social media, presentations, and digital products.</p>"}'::jsonb, 200, 'USD', 'from', null, 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F%20%D0%BB%D0%BE%D0%B3%D0%BE/%D0%BF%D1%80%D0%BE%D1%86%D0%B5%D1%81%D1%81%20%D0%B2%20%D0%B0%D1%84%D1%82%D0%B5%D1%80%20%D1%8D%D1%84%D1%84%D0%B5%D0%BA%D1%82%D1%81.gif', true, 1, 0, (select id from public.categories where slug = 'design')) on conflict (slug) do update set title = excluded.title, short_description = excluded.short_description, description = excluded.description, price_amount = excluded.price_amount, price_unit = excluded.price_unit, main_image_url = excluded.main_image_url, sort_order = excluded.sort_order, sub_group = excluded.sub_group, category_id = excluded.category_id;
delete from public.service_images where service_id = (select id from public.services where slug = 'logo-animation');
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'logo-animation'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F%20%D0%BB%D0%BE%D0%B3%D0%BE/____cafe_____.mp4', 0);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'logo-animation'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F%20%D0%BB%D0%BE%D0%B3%D0%BE/Comp%206_1.mp4', 1);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'logo-animation'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F%20%D0%BB%D0%BE%D0%B3%D0%BE/crypto-1.mp4', 2);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'logo-animation'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F%20%D0%BB%D0%BE%D0%B3%D0%BE/horizontal.mp4', 3);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'logo-animation'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F%20%D0%BB%D0%BE%D0%B3%D0%BE/logo%203d_final.mp4', 4);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'logo-animation'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F%20%D0%BB%D0%BE%D0%B3%D0%BE/%D0%BD%D0%B0%20%D0%BF%D1%80%D0%BE%D0%B7%D1%80%D0%B0%D1%87%D0%BD%D0%BE%D0%BC%20%D1%84%D0%BE%D0%BD%D0%B5.webm', 5);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'logo-animation'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F%20%D0%BB%D0%BE%D0%B3%D0%BE/%D0%BF%D1%80%D0%BE%D1%86%D0%B5%D1%81%D1%81%20%D0%B2%20%D0%B0%D1%84%D1%82%D0%B5%D1%80%20%D1%8D%D1%84%D1%84%D0%B5%D0%BA%D1%82%D1%81.gif', 6);
insert into public.services (slug, title, short_description, description, price_amount, price_currency, price_type, price_unit, main_image_url, is_published, sort_order, sub_group, category_id) values ('logo-animation-bundle', '{"ru":"лого + анимация","uk":"лого + анімація","en":"logo + animation"}'::jsonb, '{"ru":"Создаём логотип и сразу разрабатываем его анимированную версию, чтобы бренд получил цельную статичную и динамичную айдентику.","uk":"Створюємо логотип і одразу розробляємо його анімовану версію, щоб бренд отримав цілісну статичну й динамічну айдентику.","en":"We create a logo and its animated version together, giving your brand a cohesive static and motion identity."}'::jsonb, '{"ru":"<p>Создаём логотип и сразу разрабатываем его анимированную версию, чтобы бренд получил цельную статичную и динамичную айдентику.</p>","uk":"<p>Створюємо логотип і одразу розробляємо його анімовану версію, щоб бренд отримав цілісну статичну й динамічну айдентику.</p>","en":"<p>We create a logo and its animated version together, giving your brand a cohesive static and motion identity.</p>"}'::jsonb, 450, 'USD', 'from', null, null, true, 2, 0, (select id from public.categories where slug = 'design')) on conflict (slug) do update set title = excluded.title, short_description = excluded.short_description, description = excluded.description, price_amount = excluded.price_amount, price_unit = excluded.price_unit, main_image_url = excluded.main_image_url, sort_order = excluded.sort_order, sub_group = excluded.sub_group, category_id = excluded.category_id;
insert into public.services (slug, title, short_description, description, price_amount, price_currency, price_type, price_unit, main_image_url, is_published, sort_order, sub_group, category_id) values ('brand-identity', '{"ru":"фирменный стиль","uk":"фірмовий стиль","en":"brand identity"}'::jsonb, '{"ru":"Формируем единую визуальную систему бренда: цвета, типографику, графические элементы и правила их использования.","uk":"Формуємо єдину візуальну систему бренду: кольори, типографіку, графічні елементи та правила їх використання.","en":"We build a consistent visual system for your brand: colors, typography, graphic elements, and usage guidelines."}'::jsonb, '{"ru":"<p>Формируем единую визуальную систему бренда: цвета, типографику, графические элементы и правила их использования.</p>","uk":"<p>Формуємо єдину візуальну систему бренду: кольори, типографіку, графічні елементи та правила їх використання.</p>","en":"<p>We build a consistent visual system for your brand: colors, typography, graphic elements, and usage guidelines.</p>"}'::jsonb, 900, 'USD', 'from', null, 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D1%84%D0%B8%D1%80%D0%BC%D0%B5%D0%BD%D0%BD%D1%8B%D0%B9%20%D1%81%D1%82%D0%B8%D0%BB%D1%8C/cover.jpg', true, 3, 1, (select id from public.categories where slug = 'design')) on conflict (slug) do update set title = excluded.title, short_description = excluded.short_description, description = excluded.description, price_amount = excluded.price_amount, price_unit = excluded.price_unit, main_image_url = excluded.main_image_url, sort_order = excluded.sort_order, sub_group = excluded.sub_group, category_id = excluded.category_id;
delete from public.service_images where service_id = (select id from public.services where slug = 'brand-identity');
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'brand-identity'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D1%84%D0%B8%D1%80%D0%BC%D0%B5%D0%BD%D0%BD%D1%8B%D0%B9%20%D1%81%D1%82%D0%B8%D0%BB%D1%8C/cover.jpg', 0);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'brand-identity'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D1%84%D0%B8%D1%80%D0%BC%D0%B5%D0%BD%D0%BD%D1%8B%D0%B9%20%D1%81%D1%82%D0%B8%D0%BB%D1%8C/Cup-with-a-Straw-Mockup.png', 1);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'brand-identity'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D1%84%D0%B8%D1%80%D0%BC%D0%B5%D0%BD%D0%BD%D1%8B%D0%B9%20%D1%81%D1%82%D0%B8%D0%BB%D1%8C/ID_Cards_Mockup.jpg', 2);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'brand-identity'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D1%84%D0%B8%D1%80%D0%BC%D0%B5%D0%BD%D0%BD%D1%8B%D0%B9%20%D1%81%D1%82%D0%B8%D0%BB%D1%8C/Poster_Wall_Mockup.jpg', 3);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'brand-identity'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D1%84%D0%B8%D1%80%D0%BC%D0%B5%D0%BD%D0%BD%D1%8B%D0%B9%20%D1%81%D1%82%D0%B8%D0%BB%D1%8C/T-Shirts-PSD-Mockup.jpg', 4);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'brand-identity'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D1%84%D0%B8%D1%80%D0%BC%D0%B5%D0%BD%D0%BD%D1%8B%D0%B9%20%D1%81%D1%82%D0%B8%D0%BB%D1%8C/%D0%B2%D0%B8%D0%B7%D0%B8%D1%82%D0%BA%D0%B0.jpg', 5);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'brand-identity'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D1%84%D0%B8%D1%80%D0%BC%D0%B5%D0%BD%D0%BD%D1%8B%D0%B9%20%D1%81%D1%82%D0%B8%D0%BB%D1%8C/%D0%B7%D0%BD%D0%B0%D1%87%D0%BA%D0%B8%20%D1%81%20%D0%BB%D0%BE%D0%B3%D0%BE.png', 6);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'brand-identity'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D1%84%D0%B8%D1%80%D0%BC%D0%B5%D0%BD%D0%BD%D1%8B%D0%B9%20%D1%81%D1%82%D0%B8%D0%BB%D1%8C/%D0%BD%D0%B0%20%D1%82%D0%B5%D0%BB%D0%B5%D1%84%D0%BE%D0%BD%D0%B5%20%D0%BB%D0%BE%D0%B3%D0%BE.png', 7);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'brand-identity'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D1%84%D0%B8%D1%80%D0%BC%D0%B5%D0%BD%D0%BD%D1%8B%D0%B9%20%D1%81%D1%82%D0%B8%D0%BB%D1%8C/%D1%84%D1%80%D0%B0%D0%B3%D0%BC%D0%B5%D0%BD%D1%82%20%D0%B8%D0%B7%20%D0%B1%D1%80%D0%B5%D0%BD%D0%B4%D0%B1%D1%83%D0%BA%D0%B0.jpg', 8);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'brand-identity'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D1%84%D0%B8%D1%80%D0%BC%D0%B5%D0%BD%D0%BD%D1%8B%D0%B9%20%D1%81%D1%82%D0%B8%D0%BB%D1%8C/%D1%84%D1%80%D0%B0%D0%B3%D0%BC%D0%B5%D0%BD%D1%82%20%D0%B8%D0%B7%20%D0%B4%D1%80%D1%83%D0%B3%D0%BE%D0%B3%D0%BE%20%D0%B1%D1%80%D0%B5%D0%BD%D0%B4%D0%B1%D1%83%D0%BA%D0%B0.jpg.jpg', 9);
insert into public.services (slug, title, short_description, description, price_amount, price_currency, price_type, price_unit, main_image_url, is_published, sort_order, sub_group, category_id) values ('graphic-design', '{"ru":"Графический дизайн","uk":"Графічний дизайн","en":"Graphic design"}'::jsonb, '{"ru":"Создаём меню и прайс-листы, карточки товаров, инфографику, рекламные баннеры и другие графические материалы. Выполняем обработку, ретушь и цветокоррекцию фотографий.","uk":"Створюємо меню та прайс-листи, картки товарів, інфографіку, рекламні банери й інші графічні матеріали. Виконуємо обробку, ретуш і кольорокорекцію фотографій.","en":"We create menus, price lists, product cards, infographics, advertising banners, and other graphic materials. We also provide photo editing, retouching, and color correction."}'::jsonb, '{"ru":"<p>Создаём меню и прайс-листы, карточки товаров, инфографику, рекламные баннеры и другие графические материалы. Выполняем обработку, ретушь и цветокоррекцию фотографий.</p>","uk":"<p>Створюємо меню та прайс-листи, картки товарів, інфографіку, рекламні банери й інші графічні матеріали. Виконуємо обробку, ретуш і кольорокорекцію фотографій.</p>","en":"<p>We create menus, price lists, product cards, infographics, advertising banners, and other graphic materials. We also provide photo editing, retouching, and color correction.</p>"}'::jsonb, 50, 'USD', 'from', 'item', null, true, 4, 1, (select id from public.categories where slug = 'design')) on conflict (slug) do update set title = excluded.title, short_description = excluded.short_description, description = excluded.description, price_amount = excluded.price_amount, price_unit = excluded.price_unit, main_image_url = excluded.main_image_url, sort_order = excluded.sort_order, sub_group = excluded.sub_group, category_id = excluded.category_id;
insert into public.services (slug, title, short_description, description, price_amount, price_currency, price_type, price_unit, main_image_url, is_published, sort_order, sub_group, category_id) values ('print-layouts', '{"ru":"макеты под печать","uk":"макети для друку","en":"print layouts"}'::jsonb, '{"ru":"Подготавливаем макеты для качественной печати: визитки, открытки, флаеры, буклеты, постеры, календари, сертификаты, приглашения, наклейки, этикетки и принты.","uk":"Готуємо макети для якісного друку: візитки, листівки, флаєри, буклети, постери, календарі, сертифікати, запрошення, наліпки, етикетки та принти.","en":"We create print-ready layouts for business cards, postcards, flyers, booklets, posters, calendars, certificates, invitations, stickers, labels, and prints."}'::jsonb, '{"ru":"<p>Подготавливаем макеты для качественной печати: визитки, открытки, флаеры, буклеты, постеры, календари, сертификаты, приглашения, наклейки, этикетки и принты.</p>","uk":"<p>Готуємо макети для якісного друку: візитки, листівки, флаєри, буклети, постери, календарі, сертифікати, запрошення, наліпки, етикетки та принти.</p>","en":"<p>We create print-ready layouts for business cards, postcards, flyers, booklets, posters, calendars, certificates, invitations, stickers, labels, and prints.</p>"}'::jsonb, 50, 'USD', 'from', 'item', 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%BC%D0%B0%D0%BA%D0%B5%D1%82%D1%8B%20%D0%BF%D0%BE%D0%B4%20%D0%BF%D0%B5%D1%87%D0%B0%D1%82%D1%8C/cover.png', true, 5, 1, (select id from public.categories where slug = 'design')) on conflict (slug) do update set title = excluded.title, short_description = excluded.short_description, description = excluded.description, price_amount = excluded.price_amount, price_unit = excluded.price_unit, main_image_url = excluded.main_image_url, sort_order = excluded.sort_order, sub_group = excluded.sub_group, category_id = excluded.category_id;
delete from public.service_images where service_id = (select id from public.services where slug = 'print-layouts');
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'print-layouts'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%BC%D0%B0%D0%BA%D0%B5%D1%82%D1%8B%20%D0%BF%D0%BE%D0%B4%20%D0%BF%D0%B5%D1%87%D0%B0%D1%82%D1%8C/3.png', 0);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'print-layouts'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%BC%D0%B0%D0%BA%D0%B5%D1%82%D1%8B%20%D0%BF%D0%BE%D0%B4%20%D0%BF%D0%B5%D1%87%D0%B0%D1%82%D1%8C/c200816747.gif', 1);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'print-layouts'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%BC%D0%B0%D0%BA%D0%B5%D1%82%D1%8B%20%D0%BF%D0%BE%D0%B4%20%D0%BF%D0%B5%D1%87%D0%B0%D1%82%D1%8C/calendar-2025.jpg', 2);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'print-layouts'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%BC%D0%B0%D0%BA%D0%B5%D1%82%D1%8B%20%D0%BF%D0%BE%D0%B4%20%D0%BF%D0%B5%D1%87%D0%B0%D1%82%D1%8C/calendar-20253.jpg', 3);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'print-layouts'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%BC%D0%B0%D0%BA%D0%B5%D1%82%D1%8B%20%D0%BF%D0%BE%D0%B4%20%D0%BF%D0%B5%D1%87%D0%B0%D1%82%D1%8C/calendar-20256.jpg', 4);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'print-layouts'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%BC%D0%B0%D0%BA%D0%B5%D1%82%D1%8B%20%D0%BF%D0%BE%D0%B4%20%D0%BF%D0%B5%D1%87%D0%B0%D1%82%D1%8C/calendar-%D0%BB%D1%96%D1%82%D0%BE%20(2).jpg', 5);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'print-layouts'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%BC%D0%B0%D0%BA%D0%B5%D1%82%D1%8B%20%D0%BF%D0%BE%D0%B4%20%D0%BF%D0%B5%D1%87%D0%B0%D1%82%D1%8C/cover.png', 6);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'print-layouts'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%BC%D0%B0%D0%BA%D0%B5%D1%82%D1%8B%20%D0%BF%D0%BE%D0%B4%20%D0%BF%D0%B5%D1%87%D0%B0%D1%82%D1%8C/Paper_Wristbands_Mockup_01.png', 7);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'print-layouts'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%BC%D0%B0%D0%BA%D0%B5%D1%82%D1%8B%20%D0%BF%D0%BE%D0%B4%20%D0%BF%D0%B5%D1%87%D0%B0%D1%82%D1%8C/%D0%BF%D1%80%D0%B8%D0%BD%D1%82%20%D0%BD%D0%B0%20%D1%82%D0%BA%D0%B0%D0%BD%D1%8C.jpg', 8);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'print-layouts'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%BC%D0%B0%D0%BA%D0%B5%D1%82%D1%8B%20%D0%BF%D0%BE%D0%B4%20%D0%BF%D0%B5%D1%87%D0%B0%D1%82%D1%8C/%D1%80%D0%B0%D0%B7%D0%BD%D1%8B%D0%B5%20%D0%B2%D0%B0%D1%80%D0%B8%D0%B0%D0%BD%D1%82%D1%8B.png', 9);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'print-layouts'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%BF%D0%BE%D1%81%D1%82%D0%B5%D1%80%D1%8B/%D1%82%D0%B5%D1%81%D1%82%20%D0%B4%D0%BB%D1%8F%20%D0%B4%D1%80%D1%83%D0%BA%D1%83%402x.png', 10);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'print-layouts'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%BF%D0%BE%D1%81%D1%82%D0%B5%D1%80%D1%8B/1%402x.png', 11);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'print-layouts'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%BF%D0%BE%D1%81%D1%82%D0%B5%D1%80%D1%8B/3%402x.png', 12);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'print-layouts'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%BF%D0%BE%D1%81%D1%82%D0%B5%D1%80%D1%8B/cover.png', 13);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'print-layouts'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%BF%D0%BE%D1%81%D1%82%D0%B5%D1%80%D1%8B/2%402x.png', 14);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'print-layouts'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%BF%D0%BE%D1%81%D1%82%D0%B5%D1%80%D1%8B/%D0%BC%D0%B0%D0%B3%D0%B0%D0%B7%D0%B8%D0%BD%20%D0%BE%D0%B4%D0%B5%D0%B6%D0%B4%D1%8B.png', 15);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'print-layouts'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%BF%D0%BE%D1%81%D1%82%D0%B5%D1%80%D1%8B/%D0%BF%D0%BB%D0%B0%D0%BD%D0%B5%D1%82%D0%B0%D1%80%D0%B8%D0%B9.png', 16);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'print-layouts'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%BF%D0%BE%D1%81%D1%82%D0%B5%D1%80%D1%8B/%D1%84%D0%B5%D1%81%D1%821.png', 17);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'print-layouts'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%BF%D0%BE%D1%81%D1%82%D0%B5%D1%80%D1%8B/%D1%84%D0%B5%D1%81%D1%822.png', 18);
insert into public.service_images (service_id, image_url, sort_order) values ((select id from public.services where slug = 'print-layouts'), 'https://wavesign.art/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%20%D0%B8%20%D0%B0%D0%BD%D0%B8%D0%BC%D0%B0%D1%86%D0%B8%D1%8F/%D0%BF%D0%BE%D1%81%D1%82%D0%B5%D1%80%D1%8B/%D1%84%D0%B5%D1%81%D1%823.png', 19);
insert into public.services (slug, title, short_description, description, price_amount, price_currency, price_type, price_unit, main_image_url, is_published, sort_order, sub_group, category_id) values ('telegram-bot', '{"ru":"Telegram Bot","uk":"Telegram Bot","en":"Telegram Bot"}'::jsonb, '{"ru":"Разрабатываем Telegram-ботов для автоматизации общения, обработки заявок, продаж, поддержки клиентов и внутренних процессов.","uk":"Розробляємо Telegram-ботів для автоматизації спілкування, обробки заявок, продажів, підтримки клієнтів і внутрішніх процесів.","en":"We build Telegram bots that automate communication, request handling, sales, customer support, and internal workflows."}'::jsonb, '{"ru":"<p>Разрабатываем Telegram-ботов для автоматизации общения, обработки заявок, продаж, поддержки клиентов и внутренних процессов.</p>","uk":"<p>Розробляємо Telegram-ботів для автоматизації спілкування, обробки заявок, продажів, підтримки клієнтів і внутрішніх процесів.</p>","en":"<p>We build Telegram bots that automate communication, request handling, sales, customer support, and internal workflows.</p>"}'::jsonb, 400, 'USD', 'from', null, null, true, 6, 0, (select id from public.categories where slug = 'development')) on conflict (slug) do update set title = excluded.title, short_description = excluded.short_description, description = excluded.description, price_amount = excluded.price_amount, price_unit = excluded.price_unit, main_image_url = excluded.main_image_url, sort_order = excluded.sort_order, sub_group = excluded.sub_group, category_id = excluded.category_id;
insert into public.services (slug, title, short_description, description, price_amount, price_currency, price_type, price_unit, main_image_url, is_published, sort_order, sub_group, category_id) values ('ai-integration', '{"ru":"ИИ интеграция","uk":"ШІ інтеграція","en":"AI integration"}'::jsonb, '{"ru":"Встраиваем инструменты искусственного интеллекта в существующие сайты, сервисы и рабочие процессы для автоматизации типовых задач.","uk":"Впроваджуємо інструменти штучного інтелекту в наявні сайти, сервіси та робочі процеси для автоматизації типових завдань.","en":"We integrate AI tools into existing websites, services, and workflows to automate routine tasks."}'::jsonb, '{"ru":"<p>Встраиваем инструменты искусственного интеллекта в существующие сайты, сервисы и рабочие процессы для автоматизации типовых задач.</p>","uk":"<p>Впроваджуємо інструменти штучного інтелекту в наявні сайти, сервіси та робочі процеси для автоматизації типових завдань.</p>","en":"<p>We integrate AI tools into existing websites, services, and workflows to automate routine tasks.</p>"}'::jsonb, 600, 'USD', 'from', null, null, true, 7, 0, (select id from public.categories where slug = 'development')) on conflict (slug) do update set title = excluded.title, short_description = excluded.short_description, description = excluded.description, price_amount = excluded.price_amount, price_unit = excluded.price_unit, main_image_url = excluded.main_image_url, sort_order = excluded.sort_order, sub_group = excluded.sub_group, category_id = excluded.category_id;
insert into public.services (slug, title, short_description, description, price_amount, price_currency, price_type, price_unit, main_image_url, is_published, sort_order, sub_group, category_id) values ('ai-agents', '{"ru":"ИИ-Агенты","uk":"ШІ-Агенти","en":"AI Agents"}'::jsonb, '{"ru":"Создаём ИИ-агентов, которые работают с данными, выполняют последовательности действий и помогают автоматизировать бизнес-процессы.","uk":"Створюємо ШІ-агентів, які працюють з даними, виконують послідовності дій і допомагають автоматизувати бізнес-процеси.","en":"We build AI agents that work with data, execute sequences of actions, and help automate business processes."}'::jsonb, '{"ru":"<p>Создаём ИИ-агентов, которые работают с данными, выполняют последовательности действий и помогают автоматизировать бизнес-процессы.</p>","uk":"<p>Створюємо ШІ-агентів, які працюють з даними, виконують послідовності дій і допомагають автоматизувати бізнес-процеси.</p>","en":"<p>We build AI agents that work with data, execute sequences of actions, and help automate business processes.</p>"}'::jsonb, 1500, 'USD', 'from', null, null, true, 8, 0, (select id from public.categories where slug = 'development')) on conflict (slug) do update set title = excluded.title, short_description = excluded.short_description, description = excluded.description, price_amount = excluded.price_amount, price_unit = excluded.price_unit, main_image_url = excluded.main_image_url, sort_order = excluded.sort_order, sub_group = excluded.sub_group, category_id = excluded.category_id;
insert into public.services (slug, title, short_description, description, price_amount, price_currency, price_type, price_unit, main_image_url, is_published, sort_order, sub_group, category_id) values ('turnkey-website', '{"ru":"Сайт под ключ","uk":"Сайт під ключ","en":"Turnkey website"}'::jsonb, '{"ru":"Проектируем и разрабатываем сайт от структуры и дизайна до запуска, адаптации под устройства и подключения необходимых функций.","uk":"Проєктуємо і розробляємо сайт від структури та дизайну до запуску, адаптації під пристрої й підключення потрібних функцій.","en":"We design and build your website from structure and design to launch, device adaptation, and feature integration."}'::jsonb, '{"ru":"<p>Проектируем и разрабатываем сайт от структуры и дизайна до запуска, адаптации под устройства и подключения необходимых функций.</p>","uk":"<p>Проєктуємо і розробляємо сайт від структури та дизайну до запуску, адаптації під пристрої й підключення потрібних функцій.</p>","en":"<p>We design and build your website from structure and design to launch, device adaptation, and feature integration.</p>"}'::jsonb, 900, 'USD', 'from', null, null, true, 9, 1, (select id from public.categories where slug = 'development')) on conflict (slug) do update set title = excluded.title, short_description = excluded.short_description, description = excluded.description, price_amount = excluded.price_amount, price_unit = excluded.price_unit, main_image_url = excluded.main_image_url, sort_order = excluded.sort_order, sub_group = excluded.sub_group, category_id = excluded.category_id;
insert into public.services (slug, title, short_description, description, price_amount, price_currency, price_type, price_unit, main_image_url, is_published, sort_order, sub_group, category_id) values ('custom-software', '{"ru":"Софт на заказ","uk":"Софт на замовлення","en":"Custom software"}'::jsonb, '{"ru":"Разрабатываем специализированное программное обеспечение под конкретные процессы, задачи и требования проекта.","uk":"Розробляємо спеціалізоване програмне забезпечення під конкретні процеси, завдання та вимоги проєкту.","en":"We develop custom software tailored to your specific processes, tasks, and project requirements."}'::jsonb, '{"ru":"<p>Разрабатываем специализированное программное обеспечение под конкретные процессы, задачи и требования проекта.</p>","uk":"<p>Розробляємо спеціалізоване програмне забезпечення під конкретні процеси, завдання та вимоги проєкту.</p>","en":"<p>We develop custom software tailored to your specific processes, tasks, and project requirements.</p>"}'::jsonb, 2500, 'USD', 'from', null, null, true, 10, 1, (select id from public.categories where slug = 'development')) on conflict (slug) do update set title = excluded.title, short_description = excluded.short_description, description = excluded.description, price_amount = excluded.price_amount, price_unit = excluded.price_unit, main_image_url = excluded.main_image_url, sort_order = excluded.sort_order, sub_group = excluded.sub_group, category_id = excluded.category_id;
insert into public.services (slug, title, short_description, description, price_amount, price_currency, price_type, price_unit, main_image_url, is_published, sort_order, sub_group, category_id) values ('app-development', '{"ru":"Разработка приложений","uk":"Розробка застосунків","en":"App development"}'::jsonb, '{"ru":"Создаём веб- и мобильные приложения с продуманным интерфейсом, необходимой логикой и интеграциями с внешними сервисами.","uk":"Створюємо веб- і мобільні застосунки з продуманим інтерфейсом, необхідною логікою та інтеграціями із зовнішніми сервісами.","en":"We build web and mobile apps with a thoughtful interface, the logic you need, and integrations with external services."}'::jsonb, '{"ru":"<p>Создаём веб- и мобильные приложения с продуманным интерфейсом, необходимой логикой и интеграциями с внешними сервисами.</p>","uk":"<p>Створюємо веб- і мобільні застосунки з продуманим інтерфейсом, необхідною логікою та інтеграціями із зовнішніми сервісами.</p>","en":"<p>We build web and mobile apps with a thoughtful interface, the logic you need, and integrations with external services.</p>"}'::jsonb, 3500, 'USD', 'from', null, null, true, 11, 1, (select id from public.categories where slug = 'development')) on conflict (slug) do update set title = excluded.title, short_description = excluded.short_description, description = excluded.description, price_amount = excluded.price_amount, price_unit = excluded.price_unit, main_image_url = excluded.main_image_url, sort_order = excluded.sort_order, sub_group = excluded.sub_group, category_id = excluded.category_id;
insert into public.services (slug, title, short_description, description, price_amount, price_currency, price_type, price_unit, main_image_url, is_published, sort_order, sub_group, category_id) values ('web3-development', '{"ru":"Web3 разработка","uk":"Web3 розробка","en":"Web3 development"}'::jsonb, '{"ru":"Разрабатываем Web3-продукты и интеграции с блокчейн-сетями, кошельками, токенами и децентрализованными приложениями.","uk":"Розробляємо Web3-продукти та інтеграції з блокчейн-мережами, гаманцями, токенами й децентралізованими застосунками.","en":"We build Web3 products and integrations with blockchain networks, wallets, tokens, and decentralized applications."}'::jsonb, '{"ru":"<p>Разрабатываем Web3-продукты и интеграции с блокчейн-сетями, кошельками, токенами и децентрализованными приложениями.</p>","uk":"<p>Розробляємо Web3-продукти та інтеграції з блокчейн-мережами, гаманцями, токенами й децентралізованими застосунками.</p>","en":"<p>We build Web3 products and integrations with blockchain networks, wallets, tokens, and decentralized applications.</p>"}'::jsonb, 3000, 'USD', 'from', null, null, true, 12, 2, (select id from public.categories where slug = 'development')) on conflict (slug) do update set title = excluded.title, short_description = excluded.short_description, description = excluded.description, price_amount = excluded.price_amount, price_unit = excluded.price_unit, main_image_url = excluded.main_image_url, sort_order = excluded.sort_order, sub_group = excluded.sub_group, category_id = excluded.category_id;
insert into public.services (slug, title, short_description, description, price_amount, price_currency, price_type, price_unit, main_image_url, is_published, sort_order, sub_group, category_id) values ('smart-contracts', '{"ru":"Смарт контракты","uk":"Смарт контракти","en":"Smart contracts"}'::jsonb, '{"ru":"Проектируем и разрабатываем смарт-контракты для автоматического и прозрачного выполнения операций в блокчейн-среде.","uk":"Проєктуємо і розробляємо смарт-контракти для автоматичного й прозорого виконання операцій у блокчейн-середовищі.","en":"We design and develop smart contracts for automatic, transparent execution of operations on the blockchain."}'::jsonb, '{"ru":"<p>Проектируем и разрабатываем смарт-контракты для автоматического и прозрачного выполнения операций в блокчейн-среде.</p>","uk":"<p>Проєктуємо і розробляємо смарт-контракти для автоматичного й прозорого виконання операцій у блокчейн-середовищі.</p>","en":"<p>We design and develop smart contracts for automatic, transparent execution of operations on the blockchain.</p>"}'::jsonb, 1500, 'USD', 'from', null, null, true, 13, 2, (select id from public.categories where slug = 'development')) on conflict (slug) do update set title = excluded.title, short_description = excluded.short_description, description = excluded.description, price_amount = excluded.price_amount, price_unit = excluded.price_unit, main_image_url = excluded.main_image_url, sort_order = excluded.sort_order, sub_group = excluded.sub_group, category_id = excluded.category_id;
insert into public.services (slug, title, short_description, description, price_amount, price_currency, price_type, price_unit, main_image_url, is_published, sort_order, sub_group, category_id) values ('security-audit', '{"ru":"Аудит безопасности","uk":"Аудит безпеки","en":"Security audit"}'::jsonb, '{"ru":"Проверяем код, архитектуру и потенциальные уязвимости цифрового продукта и формируем рекомендации по снижению рисков.","uk":"Перевіряємо код, архітектуру та потенційні вразливості цифрового продукту й формуємо рекомендації щодо зниження ризиків.","en":"We review the code, architecture, and potential vulnerabilities of your product and provide recommendations to reduce risk."}'::jsonb, '{"ru":"<p>Проверяем код, архитектуру и потенциальные уязвимости цифрового продукта и формируем рекомендации по снижению рисков.</p>","uk":"<p>Перевіряємо код, архітектуру та потенційні вразливості цифрового продукту й формуємо рекомендації щодо зниження ризиків.</p>","en":"<p>We review the code, architecture, and potential vulnerabilities of your product and provide recommendations to reduce risk.</p>"}'::jsonb, 1200, 'USD', 'from', null, null, true, 14, 2, (select id from public.categories where slug = 'development')) on conflict (slug) do update set title = excluded.title, short_description = excluded.short_description, description = excluded.description, price_amount = excluded.price_amount, price_unit = excluded.price_unit, main_image_url = excluded.main_image_url, sort_order = excluded.sort_order, sub_group = excluded.sub_group, category_id = excluded.category_id;
insert into public.services (slug, title, short_description, description, price_amount, price_currency, price_type, price_unit, main_image_url, is_published, sort_order, sub_group, category_id) values ('naming', '{"ru":"Нейминг","uk":"Неймінг","en":"Naming"}'::jsonb, '{"ru":"Разрабатываем запоминающееся название для бренда, продукта или сервиса с учётом позиционирования и целевой аудитории.","uk":"Розробляємо запам''ятовувану назву для бренду, продукту чи сервісу з урахуванням позиціонування та цільової аудиторії.","en":"We create a memorable name for your brand, product, or service based on positioning and target audience."}'::jsonb, '{"ru":"<p>Разрабатываем запоминающееся название для бренда, продукта или сервиса с учётом позиционирования и целевой аудитории.</p>","uk":"<p>Розробляємо запам''ятовувану назву для бренду, продукту чи сервісу з урахуванням позиціонування та цільової аудиторії.</p>","en":"<p>We create a memorable name for your brand, product, or service based on positioning and target audience.</p>"}'::jsonb, 150, 'USD', 'from', null, null, true, 15, 0, (select id from public.categories where slug = 'additional')) on conflict (slug) do update set title = excluded.title, short_description = excluded.short_description, description = excluded.description, price_amount = excluded.price_amount, price_unit = excluded.price_unit, main_image_url = excluded.main_image_url, sort_order = excluded.sort_order, sub_group = excluded.sub_group, category_id = excluded.category_id;
insert into public.services (slug, title, short_description, description, price_amount, price_currency, price_type, price_unit, main_image_url, is_published, sort_order, sub_group, category_id) values ('slogans', '{"ru":"Слоганы","uk":"Слогани","en":"Slogans"}'::jsonb, '{"ru":"Создаём короткие и выразительные слоганы, которые передают основную идею бренда и подходят для рекламных коммуникаций.","uk":"Створюємо короткі та виразні слогани, які передають основну ідею бренду й підходять для рекламних комунікацій.","en":"We craft short, expressive slogans that capture your brand''s core idea and work well in advertising communications."}'::jsonb, '{"ru":"<p>Создаём короткие и выразительные слоганы, которые передают основную идею бренда и подходят для рекламных коммуникаций.</p>","uk":"<p>Створюємо короткі та виразні слогани, які передають основну ідею бренду й підходять для рекламних комунікацій.</p>","en":"<p>We craft short, expressive slogans that capture your brand''s core idea and work well in advertising communications.</p>"}'::jsonb, 80, 'USD', 'from', null, null, true, 16, 0, (select id from public.categories where slug = 'additional')) on conflict (slug) do update set title = excluded.title, short_description = excluded.short_description, description = excluded.description, price_amount = excluded.price_amount, price_unit = excluded.price_unit, main_image_url = excluded.main_image_url, sort_order = excluded.sort_order, sub_group = excluded.sub_group, category_id = excluded.category_id;
insert into public.services (slug, title, short_description, description, price_amount, price_currency, price_type, price_unit, main_image_url, is_published, sort_order, sub_group, category_id) values ('consultation', '{"ru":"Консультация","uk":"Консультація","en":"Consultation"}'::jsonb, '{"ru":"Разбираем задачу, оцениваем возможные решения и помогаем определить оптимальный формат, объём и последовательность работ.","uk":"Розбираємо задачу, оцінюємо можливі рішення та допомагаємо визначити оптимальний формат, обсяг і послідовність робіт.","en":"We break down the task, evaluate possible solutions, and help define the right format, scope, and order of work."}'::jsonb, '{"ru":"<p>Разбираем задачу, оцениваем возможные решения и помогаем определить оптимальный формат, объём и последовательность работ.</p>","uk":"<p>Розбираємо задачу, оцінюємо можливі рішення та допомагаємо визначити оптимальний формат, обсяг і послідовність робіт.</p>","en":"<p>We break down the task, evaluate possible solutions, and help define the right format, scope, and order of work.</p>"}'::jsonb, 60, 'USD', 'from', 'hour', null, true, 17, 1, (select id from public.categories where slug = 'additional')) on conflict (slug) do update set title = excluded.title, short_description = excluded.short_description, description = excluded.description, price_amount = excluded.price_amount, price_unit = excluded.price_unit, main_image_url = excluded.main_image_url, sort_order = excluded.sort_order, sub_group = excluded.sub_group, category_id = excluded.category_id;
insert into public.services (slug, title, short_description, description, price_amount, price_currency, price_type, price_unit, main_image_url, is_published, sort_order, sub_group, category_id) values ('info-search', '{"ru":"Поиск информации","uk":"Пошук інформації","en":"Information search"}'::jsonb, '{"ru":"Собираем, проверяем и структурируем информацию по заданной теме, чтобы подготовить удобную основу для анализа или дальнейшей работы.","uk":"Збираємо, перевіряємо та структуруємо інформацію за заданою темою, щоб підготувати зручну основу для аналізу чи подальшої роботи.","en":"We gather, verify, and structure information on a given topic to provide a solid foundation for analysis or further work."}'::jsonb, '{"ru":"<p>Собираем, проверяем и структурируем информацию по заданной теме, чтобы подготовить удобную основу для анализа или дальнейшей работы.</p>","uk":"<p>Збираємо, перевіряємо та структуруємо інформацію за заданою темою, щоб підготувати зручну основу для аналізу чи подальшої роботи.</p>","en":"<p>We gather, verify, and structure information on a given topic to provide a solid foundation for analysis or further work.</p>"}'::jsonb, 25, 'USD', 'from', 'hour', null, true, 18, 2, (select id from public.categories where slug = 'additional')) on conflict (slug) do update set title = excluded.title, short_description = excluded.short_description, description = excluded.description, price_amount = excluded.price_amount, price_unit = excluded.price_unit, main_image_url = excluded.main_image_url, sort_order = excluded.sort_order, sub_group = excluded.sub_group, category_id = excluded.category_id;
insert into public.services (slug, title, short_description, description, price_amount, price_currency, price_type, price_unit, main_image_url, is_published, sort_order, sub_group, category_id) values ('transcription', '{"ru":"Транскрибация","uk":"Транскрибація","en":"Transcription"}'::jsonb, '{"ru":"Преобразуем аудио и видео в структурированный текст с понятным форматированием и, при необходимости, разделением по участникам.","uk":"Перетворюємо аудіо та відео на структурований текст із зрозумілим форматуванням і, за потреби, розподілом за учасниками.","en":"We convert audio and video into structured text with clear formatting and, if needed, speaker-by-speaker separation."}'::jsonb, '{"ru":"<p>Преобразуем аудио и видео в структурированный текст с понятным форматированием и, при необходимости, разделением по участникам.</p>","uk":"<p>Перетворюємо аудіо та відео на структурований текст із зрозумілим форматуванням і, за потреби, розподілом за учасниками.</p>","en":"<p>We convert audio and video into structured text with clear formatting and, if needed, speaker-by-speaker separation.</p>"}'::jsonb, 2, 'USD', 'from', 'minute', null, true, 19, 2, (select id from public.categories where slug = 'additional')) on conflict (slug) do update set title = excluded.title, short_description = excluded.short_description, description = excluded.description, price_amount = excluded.price_amount, price_unit = excluded.price_unit, main_image_url = excluded.main_image_url, sort_order = excluded.sort_order, sub_group = excluded.sub_group, category_id = excluded.category_id;

