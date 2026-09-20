-- Los Tres Pacos · reservas desde la web (paso 5). Pegar en Supabase > SQL Editor > Run. Idempotente.

-- Crea una reserva web validando TODO en servidor y dentro de una transacción con bloqueo.
-- Devuelve {"ok":true,"id":"..."} o {"ok":false,"code":"past|party|zone|slot|closed|limit|full"}.
create or replace function public.book_web(
  p_name text, p_phone text, p_people int, p_date date, p_time time, p_zone text, p_notes text
) returns jsonb
language plpgsql as $$
declare
  s public.settings%rowtype;
  z public.zones%rowtype;
  madrid timestamp := now() at time zone 'Europe/Madrid';
  used int;
  new_id text;
begin
  perform pg_advisory_xact_lock(hashtext('book_web'));
  select * into s from public.settings where id;

  if p_date < madrid::date or (p_date = madrid::date and p_time <= madrid::time) then
    return jsonb_build_object('ok', false, 'code', 'past');
  end if;
  if p_people < 1 or p_people > s.max_party_size then
    return jsonb_build_object('ok', false, 'code', 'party');
  end if;

  select * into z from public.zones where id = p_zone and enabled;
  if not found then return jsonb_build_object('ok', false, 'code', 'zone'); end if;

  if not (to_char(p_time, 'HH24:MI') = any (s.slots))
     or not exists (select 1 from public.services where p_time >= from_time and p_time <= last_booking) then
    return jsonb_build_object('ok', false, 'code', 'slot');
  end if;

  if exists (select 1 from public.closed_dates where date = p_date)
     or exists (select 1 from public.opening_hours where day = extract(dow from p_date)::int and closed) then
    return jsonb_build_object('ok', false, 'code', 'closed');
  end if;

  if p_phone <> '' and (select count(*) from public.reservations
       where phone = p_phone and source = 'web' and status = 'pending' and date >= madrid::date) >= 3 then
    return jsonb_build_object('ok', false, 'code', 'limit');
  end if;

  select coalesce(sum(people), 0) into used from public.reservations
   where zone = z.name and date = p_date and status <> 'cancelled'
     and abs(extract(epoch from (time - p_time)) / 60) < s.duration_minutes;
  if used + p_people > z.capacity then
    return jsonb_build_object('ok', false, 'code', 'full');
  end if;

  insert into public.reservations (name, phone, people, date, time, zone, notes, status, source)
  values (p_name, p_phone, p_people, p_date, p_time, z.name, p_notes, 'pending', 'web')
  returning id into new_id;
  return jsonb_build_object('ok', true, 'id', new_id);
end $$;

-- Guardado de reservas desde el panel: solo borra las que ya existían cuando se cargó el panel
-- (p_loaded), para no perder reservas web que entraron mientras tanto. Sin p_loaded no borra nada.
create or replace function public.save_reservas(p_data jsonb, p_loaded timestamptz) returns void
language plpgsql as $$
begin
  if p_loaded is not null then
    delete from public.reservations
     where created_at <= p_loaded and id not in (select r->>'id' from jsonb_array_elements(p_data) r);
  end if;
  insert into public.reservations (id, name, phone, people, date, time, zone, notes, status, created_at)
  select r->>'id', r->>'name', r->>'phone', (r->>'people')::int, (r->>'date')::date, (r->>'time')::time,
         r->>'zone', r->>'notes', r->>'status', coalesce(nullif(r->>'createdAt', '')::timestamptz, now())
  from jsonb_array_elements(p_data) r
  on conflict (id) do update set name = excluded.name, phone = excluded.phone, people = excluded.people,
    date = excluded.date, time = excluded.time, zone = excluded.zone, notes = excluded.notes, status = excluded.status;
end $$;

revoke all on function public.book_web(text, text, int, date, time, text, text) from public, anon, authenticated;
revoke all on function public.save_reservas(jsonb, timestamptz)                 from public, anon, authenticated;
grant execute on function public.book_web(text, text, int, date, time, text, text) to service_role;
grant execute on function public.save_reservas(jsonb, timestamptz)                 to service_role;
