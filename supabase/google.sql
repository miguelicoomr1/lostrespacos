-- Los Tres Pacos · integración con Google Calendar (OAuth dinámico). Pegar en Supabase > SQL Editor > Run. Idempotente.
--
-- La cuenta de Google NO está en el código ni en variables de entorno: la elige el administrador desde
-- /admin/ → Configuración → «Vincular cuenta de Google» (OAuth 2.0). Aquí solo se guarda el resultado.
-- Todo es accesible únicamente con la secret key (service_role); RLS activado y sin políticas.

-- Una fila por integración (hoy solo Google Calendar). El refresh token va cifrado (AES-GCM) desde el servidor.
create table if not exists public.integrations (
  provider           text primary key check (provider in ('google_calendar')),
  account_email      text not null,
  refresh_token_enc  text not null,
  calendar_id        text,
  calendar_name      text,
  connected_at       timestamptz not null default now(),
  last_sync_at       timestamptz,
  last_error         text
);
alter table public.integrations enable row level security;
revoke all on table public.integrations from public, anon, authenticated;
grant all on table public.integrations to service_role;

-- Vínculo de cada reserva con su evento. `google_sync_hash` = huella de los datos ya enviados (detecta cambios).
alter table public.reservations add column if not exists google_event_id    text;
alter table public.reservations add column if not exists google_calendar_id text;
alter table public.reservations add column if not exists google_sync_hash   text;
alter table public.reservations add column if not exists google_synced_at   timestamptz;

-- Eventos de reservas borradas: se anotan para retirarlos de Google Calendar en la siguiente sincronización.
create table if not exists public.gcal_deletions (
  id           bigint generated always as identity primary key,
  calendar_id  text not null,
  event_id     text not null,
  created_at   timestamptz not null default now()
);
alter table public.gcal_deletions enable row level security;
revoke all on table public.gcal_deletions from public, anon, authenticated;
grant all on table public.gcal_deletions to service_role;

create or replace function public.gcal_queue_deletion() returns trigger
language plpgsql as $$
begin
  if old.google_event_id is not null and old.google_calendar_id is not null then
    insert into public.gcal_deletions (calendar_id, event_id) values (old.google_calendar_id, old.google_event_id);
  end if;
  return old;
end $$;

drop trigger if exists reservations_gcal_deletion on public.reservations;
create trigger reservations_gcal_deletion after delete on public.reservations
  for each row execute function public.gcal_queue_deletion();
