-- Los Tres Pacos · funciones de lectura/guardado por documento (paso 4)
-- Pegar en Supabase > SQL Editor > Run. Idempotente.
-- El panel guarda cada documento entero; estas funciones lo hacen en UNA transacción.
-- Solo service_role (servidor) puede ejecutarlas.

-- El panel identifica reservas con ids de texto y zonas por nombre.
alter table public.reservations alter column id drop default;
alter table public.reservations alter column id type text using id::text;
alter table public.reservations alter column id set default gen_random_uuid()::text;
alter table public.reservations drop column if exists zone_id;
alter table public.reservations add column if not exists zone text not null default '';

create or replace function public.get_doc(p_doc text) returns jsonb
language plpgsql stable as $$
begin
  if p_doc = 'reservas' then
    return coalesce((select jsonb_agg(jsonb_build_object(
      'id', id, 'name', name, 'phone', phone, 'people', people,
      'date', to_char(date, 'YYYY-MM-DD'), 'time', to_char(time, 'HH24:MI'),
      'zone', zone, 'notes', notes, 'status', status,
      'createdAt', to_char(created_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ) order by date, time, created_at) from public.reservations), '[]'::jsonb);

  elsif p_doc = 'horarios' then
    return jsonb_build_object(
      'durationMinutes', (select duration_minutes from public.settings where id),
      'maxPartySize',    (select max_party_size   from public.settings where id),
      'slots',           (select to_jsonb(slots)  from public.settings where id),
      'services', coalesce((select jsonb_agg(jsonb_build_object(
        'name', name, 'from', to_char(from_time, 'HH24:MI'), 'to', to_char(to_time, 'HH24:MI'),
        'lastBooking', to_char(last_booking, 'HH24:MI')) order by sort, id) from public.services), '[]'::jsonb),
      'zones', coalesce((select jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'capacity', capacity, 'enabled', enabled) order by sort, id) from public.zones), '[]'::jsonb),
      'openingHours', coalesce((select jsonb_agg(jsonb_build_object(
        'day', day, 'closed', closed,
        'open1',  coalesce(to_char(open1,  'HH24:MI'), ''), 'close1', coalesce(to_char(close1, 'HH24:MI'), ''),
        'open2',  coalesce(to_char(open2,  'HH24:MI'), ''), 'close2', coalesce(to_char(close2, 'HH24:MI'), '')
      ) order by day) from public.opening_hours), '[]'::jsonb),
      'closedDates', coalesce((select jsonb_agg(jsonb_build_object(
        'date', to_char(date, 'YYYY-MM-DD'), 'reason', reason) order by date) from public.closed_dates), '[]'::jsonb)
    );

  elsif p_doc = 'carta' then
    return coalesce((select jsonb_agg(jsonb_build_object(
      'id', c.id, 'name', c.name,
      'items', coalesce((select jsonb_agg(
          case when i.description = '' then jsonb_build_object('name', i.name, 'price', i.price)
               else jsonb_build_object('name', i.name, 'price', i.price, 'description', i.description) end
          order by i.sort, i.id) from public.menu_items i where i.category_id = c.id), '[]'::jsonb)
    ) order by c.sort, c.id) from public.menu_categories c), '[]'::jsonb);
  end if;
  raise exception 'documento desconocido: %', p_doc;
end $$;

create or replace function public.save_doc(p_doc text, p_data jsonb) returns void
language plpgsql as $$
begin
  if p_doc = 'reservas' then
    delete from public.reservations where id not in (select r->>'id' from jsonb_array_elements(p_data) r);
    insert into public.reservations (id, name, phone, people, date, time, zone, notes, status, created_at)
    select r->>'id', r->>'name', r->>'phone', (r->>'people')::int, (r->>'date')::date, (r->>'time')::time,
           r->>'zone', r->>'notes', r->>'status', coalesce(nullif(r->>'createdAt', '')::timestamptz, now())
    from jsonb_array_elements(p_data) r
    on conflict (id) do update set name = excluded.name, phone = excluded.phone, people = excluded.people,
      date = excluded.date, time = excluded.time, zone = excluded.zone, notes = excluded.notes, status = excluded.status;

  elsif p_doc = 'horarios' then
    update public.settings set
      duration_minutes = (p_data->>'durationMinutes')::int,
      max_party_size   = (p_data->>'maxPartySize')::int,
      slots            = array(select jsonb_array_elements_text(p_data->'slots'))
    where id;

    delete from public.services where true;
    insert into public.services (name, from_time, to_time, last_booking, sort)
    select s.v->>'name', (s.v->>'from')::time, (s.v->>'to')::time, (s.v->>'lastBooking')::time, s.n
    from jsonb_array_elements(p_data->'services') with ordinality s(v, n);

    delete from public.zones where id not in (select z->>'id' from jsonb_array_elements(p_data->'zones') z);
    insert into public.zones (id, name, capacity, enabled, sort)
    select z.v->>'id', z.v->>'name', (z.v->>'capacity')::int, (z.v->>'enabled')::boolean, z.n
    from jsonb_array_elements(p_data->'zones') with ordinality z(v, n)
    on conflict (id) do update set name = excluded.name, capacity = excluded.capacity, enabled = excluded.enabled, sort = excluded.sort;

    delete from public.opening_hours where day not in (select (d->>'day')::int from jsonb_array_elements(p_data->'openingHours') d);
    insert into public.opening_hours (day, closed, open1, close1, open2, close2)
    select (d->>'day')::int, (d->>'closed')::boolean,
           nullif(d->>'open1', '')::time, nullif(d->>'close1', '')::time,
           nullif(d->>'open2', '')::time, nullif(d->>'close2', '')::time
    from jsonb_array_elements(p_data->'openingHours') d
    on conflict (day) do update set closed = excluded.closed, open1 = excluded.open1, close1 = excluded.close1,
      open2 = excluded.open2, close2 = excluded.close2;

    delete from public.closed_dates where true;
    insert into public.closed_dates (date, reason)
    select (c->>'date')::date, coalesce(c->>'reason', '') from jsonb_array_elements(p_data->'closedDates') c
    on conflict (date) do update set reason = excluded.reason;

  elsif p_doc = 'carta' then
    delete from public.menu_categories where id not in (select c->>'id' from jsonb_array_elements(p_data) c);
    insert into public.menu_categories (id, name, sort)
    select c.v->>'id', c.v->>'name', c.n from jsonb_array_elements(p_data) with ordinality c(v, n)
    on conflict (id) do update set name = excluded.name, sort = excluded.sort;

    delete from public.menu_items where true;
    insert into public.menu_items (category_id, name, price, description, sort)
    select c.v->>'id', i.v->>'name', coalesce(i.v->>'price', ''), coalesce(i.v->>'description', ''), i.n
    from jsonb_array_elements(p_data) with ordinality c(v, n),
         jsonb_array_elements(c.v->'items') with ordinality i(v, n);

  else
    raise exception 'documento desconocido: %', p_doc;
  end if;
end $$;

revoke all on function public.get_doc(text)         from public, anon, authenticated;
revoke all on function public.save_doc(text, jsonb) from public, anon, authenticated;
grant execute on function public.get_doc(text)         to service_role;
grant execute on function public.save_doc(text, jsonb) to service_role;
