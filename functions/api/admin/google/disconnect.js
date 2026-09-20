// Desvincula la cuenta: revoca el acceso en Google y borra token y calendario. Las reservas NO se borran.
import { json } from "../../../_lib/session.js";
import { disconnect, guard } from "../../../_lib/gcal.js";

export async function onRequestPost(ctx) {
  const denied = await guard(ctx, { write: true });
  if (denied) return denied;
  try {
    await disconnect(ctx.env);
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: "No se pudo desvincular." }, 502);
  }
}
