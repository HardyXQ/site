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
