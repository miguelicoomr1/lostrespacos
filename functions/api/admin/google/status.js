import { json } from "../../../_lib/session.js";
import { getIntegration, guard, oauthConfigured, statusView } from "../../../_lib/gcal.js";

export async function onRequestGet(ctx) {
  const denied = await guard(ctx);
  if (denied) return denied;
  try {
    return json(await statusView(ctx.env, await getIntegration(ctx.env)));
  } catch (e) {
    console.error(e);
    return json({ error: "No se pudo leer la integración. ¿Está aplicado supabase/google.sql?", configured: oauthConfigured(ctx.env) }, 502);
  }
}
