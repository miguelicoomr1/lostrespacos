import { json, readSession } from "../../_lib/session.js";

export async function onRequestGet({ request, env }) {
  const s = await readSession(env, request);
  return s ? json({ ok: true, email: s.email }) : json({ ok: false }, 401);
}
