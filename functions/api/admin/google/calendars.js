// GET: calendarios de la cuenta vinculada (dinámico, desde Google). POST: elegir uno o crear el de reservas.
import { json } from "../../../_lib/session.js";
import { GoogleError, createCalendar, getIntegration, guard, listCalendars, reconcile, runInBackground, selectCalendar, setCalendar } from "../../../_lib/gcal.js";
import negocio from "../../../_lib/negocio.gen.js";

const fail = (e) => {
  console.error(e);
  if (e instanceof GoogleError) return json({ error: e.message, reauth: e.code === "reauth" }, e.status === 400 ? 400 : e.code === "reauth" ? 401 : 502);
  return json({ error: "No se pudo completar la operación." }, 502);
};

// El nombre sale del nombre comercial del negocio (src/data/negocio.json), no de un texto fijo.
const calendarName = () => `Reservas - ${negocio.name}`;

async function connected(env) {
  const integ = await getIntegration(env);
  return integ ? { integ } : { denied: json({ error: "No hay ninguna cuenta de Google vinculada." }, 409) };
}

export async function onRequestGet(ctx) {
  const denied = await guard(ctx);
  if (denied) return denied;
  try {
    const c = await connected(ctx.env);
    if (c.denied) return c.denied;
    return json({ calendars: await listCalendars(ctx.env, c.integ), newName: calendarName() });
  } catch (e) { return fail(e); }
}

export async function onRequestPost(ctx) {
  const denied = await guard(ctx, { write: true });
  if (denied) return denied;
  const body = await ctx.request.json().catch(() => ({}));
  try {
    const c = await connected(ctx.env);
    if (c.denied) return c.denied;
    let chosen;
    if (body.create) {
      chosen = await createCalendar(ctx.env, c.integ, calendarName());
      await setCalendar(ctx.env, chosen);
    } else if (typeof body.calendarId === "string" && body.calendarId) {
      chosen = await selectCalendar(ctx.env, c.integ, body.calendarId);
    } else return json({ error: "Elige un calendario." }, 400);
    // Las reservas futuras que aún no estén en Google se envían ya.
    runInBackground(ctx, reconcile(ctx.env));
    return json({ ok: true, calendar: chosen });
  } catch (e) { return fail(e); }
}
