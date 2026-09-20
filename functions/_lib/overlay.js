// Sirve una página estática con sus zonas dinámicas (<!--dyn:x-->) rellenadas desde la base de datos.
// Si la base falla o no está configurada, devuelve la página estática tal cual (siempre hay carta y formulario).
import { fill } from "../../src/partials/dynamic.mjs";
import { configured, rpc } from "./supabase.js";

export async function overlay({ request, env }, assetPath, doc, render) {
  const asset = await env.ASSETS.fetch(new URL(assetPath, request.url).href);
  if (!asset.ok || !configured(env)) return asset;
  try {
    const parts = render(await rpc(env, "get_doc", { p_doc: doc }));
    const headers = new Headers(asset.headers);
    headers.delete("content-length");
    headers.delete("etag");
    headers.set("cache-control", "public, max-age=0, must-revalidate");
    return new Response(fill(await asset.text(), parts), { status: asset.status, headers });
  } catch (e) {
    console.error(e);
    return env.ASSETS.fetch(new URL(assetPath, request.url).href);
  }
}
