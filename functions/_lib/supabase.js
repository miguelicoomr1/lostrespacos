// Cliente mínimo de Supabase (REST/RPC) para Pages Functions. Usa la secret key: solo en servidor.
export const configured = (env) => Boolean(env.SUPABASE_URL && env.SUPABASE_SECRET_KEY);

// Acceso REST a tablas (PostgREST). `path` = «tabla?filtros». Devuelve el JSON o null.
export async function rest(env, method, path, body, prefer) {
  const r = await fetch(`${env.SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/${path}`, {
    method,
    headers: { apikey: env.SUPABASE_SECRET_KEY, "content-type": "application/json", ...(prefer ? { Prefer: prefer } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Supabase ${method} ${path.split("?")[0]}: ${r.status} ${(await r.text()).slice(0, 300)}`);
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

export async function rpc(env, fn, args) {
  const r = await fetch(`${env.SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: env.SUPABASE_SECRET_KEY, "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`Supabase ${fn}: ${r.status} ${(await r.text()).slice(0, 300)}`);
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}
