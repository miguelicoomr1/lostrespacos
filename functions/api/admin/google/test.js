import { json } from "../../../_lib/session.js";
import { GoogleError, getIntegration, guard, testConnection } from "../../../_lib/gcal.js";

export async function onRequestPost(ctx) {
  const denied = await guard(ctx, { write: true });
  if (denied) return denied;
  try {
    const integ = await getIntegration(ctx.env);
    if (!integ) return json({ error: "No hay ninguna cuenta de Google vinculada." }, 409);
    return json(await testConnection(ctx.env, integ));
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof GoogleError ? e.message : "No se pudo probar la conexión.", reauth: e instanceof GoogleError && e.code === "reauth" }, 502);
  }
}
