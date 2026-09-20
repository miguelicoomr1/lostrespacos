-- Los Tres Pacos · esquema Supabase (fase 2)
-- Pegar entero en Supabase > SQL Editor > Run. Es idempotente para tablas nuevas (if not exists).
--
-- Modelo de acceso:
--  · anon (web pública): solo LEE datos públicos (carta, zonas, horarios). No toca reservas.
--  · Reservas: se crean y gestionan desde Cloudflare Pages Functions con la secret key
--    (service_role), que salta RLS. Así el servidor valida aforo, horario y formato.
--  · RLS activado en TODAS las tablas.

-- ───────── Ajustes generales (una sola fila) ─────────
create table if not exists public.settings (
  id               boolean primary key default true check (id),
  duration_minutes int  not null default 90  check (duration_minutes between 15 and 480),
  max_party_size   int  not null default 12  check (max_party_size between 1 and 300),
  slots            text[] not null default '{}'
);
insert into public.settings (id) values (true) on conflict do nothing;

-- ───────── Zonas y aforo ─────────
create table if not exists public.zones (
  id        text primary key,
  name      text not null check (char_length(name) between 1 and 40),
  capacity  int  not null default 0 check (capacity between 0 and 1000),
  enabled   boolean not null default true,
  sort      int  not null default 0
);

-- ───────── Servicios (comida, cena…) ─────────
create table if not exists public.services (
  id            bigint generated always as identity primary key,
  name          text not null check (char_length(name) between 1 and 30),
  from_time     time not null,
  to_time       time not null,
  last_booking  time not null,
  sort          int  not null default 0
);

-- ───────── Horario semanal (0 = lunes … 6 = domingo, como el panel) ─────────
create table if not exists public.opening_hours (
  day     int primary key check (day between 0 and 6),
  closed  boolean not null default false,
  open1   time, close1 time,
  open2   time, close2 time
);

-- ───────── Días cerrados ─────────
create table if not exists public.closed_dates (
  date    date primary key,
  reason  text not null default '' check (char_length(reason) <= 120)
);

-- ───────── Carta ─────────
create table if not exists public.menu_categories (
  id    text primary key,
  name  text not null check (char_length(name) between 1 and 60),
  sort  int  not null default 0
);

create table if not exists public.menu_items (
  id           bigint generated always as identity primary key,
  category_id  text not null references public.menu_categories(id) on delete cascade on update cascade,
  name         text not null check (char_length(name) between 1 and 100),
  price        text not null default '' check (char_length(price) <= 40),  -- texto libre: "4,00€ / 5,00€"
  description  text not null default '' check (char_length(description) <= 300),
  sort         int  not null default 0
);
create index if not exists menu_items_category_idx on public.menu_items (category_id, sort);

-- ───────── Reservas ─────────
create table if not exists public.reservations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  phone       text not null default '' check (char_length(phone) <= 30),
  people      int  not null check (people between 1 and 300),
  date        date not null,
  time        time not null,
  zone_id     text references public.zones(id) on update cascade on delete set null,
  notes       text not null default '' check (char_length(notes) <= 500),
  status      text not null default 'pending' check (status in ('pending','confirmed','cancelled')),
  source      text not null default 'admin' check (source in ('web','admin')),
  created_at  timestamptz not null default now()
);
create index if not exists reservations_date_idx on public.reservations (date, time);

-- ───────── RLS ─────────
alter table public.settings         enable row level security;
alter table public.zones            enable row level security;
alter table public.services         enable row level security;
alter table public.opening_hours    enable row level security;
alter table public.closed_dates     enable row level security;
alter table public.menu_categories  enable row level security;
alter table public.menu_items       enable row level security;
alter table public.reservations     enable row level security;

-- Lectura pública de datos que ya son públicos en la web
do $$
declare t text;
begin
  foreach t in array array['settings','zones','services','opening_hours','closed_dates','menu_categories','menu_items']
  loop
    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

-- reservations: sin políticas = anon/authenticated no ven ni escriben nada.
-- Solo service_role (servidor) accede.

-- Nada de escritura pública en ninguna tabla: sin políticas de insert/update/delete.
