// Sincronización manual: envía a Google las reservas futuras nuevas, modificadas, canceladas o borradas.
import { json } from "../../../_lib/session.js";
import { getIntegration, guard, reconcile } from "../../../_lib/gcal.js";

export async function onRequestPost(ctx) {
  const denied = await guard(ctx, { write: true });
  if (denied) return denied;
  try {
    const integ = await getIntegration(ctx.env);
    if (!integ?.calendar_id) return json({ error: "Elige primero un calendario." }, 409);
    return json({ ok: true, ...(await reconcile(ctx.env)) });
  } catch (e) {
    console.error(e);
    return json({ error: "No se pudo sincronizar." }, 502);
  }
}
