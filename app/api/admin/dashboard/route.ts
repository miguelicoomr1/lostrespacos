import { env } from "cloudflare:workers";
import { cookies } from "next/headers";
import { isAdminSession } from "../../../../lib/admin-session";
import { ensureOperationsSchema } from "../../../../lib/operations";
import { MENU_CATEGORIES, ZONE_DEFAULTS } from "../../../../lib/catalog";

const zoneNames = new Set(ZONE_DEFAULTS.map((zone) => zone.name));
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

async function database() {
  const store = await cookies();
  if (!await isAdminSession(store.get("l3p_admin")?.value)) return { error: Response.json({ error: "Sesión no autorizada." }, { status: 401 }) };
  if (!env.DB) return { error: Response.json({ error: "La base de datos de reservas aún no está conectada." }, { status: 503 }) };
  await ensureOperationsSchema(env.DB);
  return { db: env.DB };
}

export async function GET() {
  try {
    const connection = await database();
    if (connection.error) return connection.error;
    const { db } = connection;
    const [zones, reservations, closures, menu, gallery] = await Promise.all([
      db.prepare("SELECT name, capacity, enabled FROM zones ORDER BY id").all(),
      db.prepare("SELECT id, name, phone, email, people, date, time, zone, notes, status FROM reservations ORDER BY date, time LIMIT 100").all(),
      db.prepare("SELECT date, reason FROM closed_dates ORDER BY date").all(),
      db.prepare("SELECT id, category, name, price, description, sort_order AS sortOrder FROM menu_items ORDER BY category, sort_order, id").all(),
      db.prepare("SELECT id, title, alt, image_url AS imageUrl, sort_order AS sortOrder FROM gallery_items ORDER BY sort_order, id").all(),
    ]);
    return Response.json({ zones: zones.results, reservations: reservations.results, closures: closures.results, menu: menu.results, gallery: gallery.results, categories: MENU_CATEGORIES });
  } catch {
    return Response.json({ error: "No se ha podido cargar el panel." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const connection = await database();
    if (connection.error) return connection.error;
    const { db } = connection;
    const body = await request.json();
    const action = String(body.action || "");
    if (action === "zone") {
      const name = String(body.name || ""), capacity = Number(body.capacity), enabled = body.enabled ? 1 : 0;
      if (!zoneNames.has(name) || !Number.isInteger(capacity) || capacity < 1 || capacity > 300) return Response.json({ error: "Revisa el aforo de la zona." }, { status: 400 });
      await db.prepare("UPDATE zones SET capacity = ?, enabled = ? WHERE name = ?").bind(capacity, enabled, name).run();
    } else if (action === "reservation") {
      const id = Number(body.id), status = String(body.status || "");
      if (!Number.isInteger(id) || !["pending", "confirmed", "cancelled"].includes(status)) return Response.json({ error: "Estado de reserva no válido." }, { status: 400 });
      await db.prepare("UPDATE reservations SET status = ? WHERE id = ?").bind(status, id).run();
    } else if (action === "closure") {
      const date = String(body.date || ""), reason = String(body.reason || "").trim().slice(0, 160);
      if (!datePattern.test(date)) return Response.json({ error: "Elige una fecha válida." }, { status: 400 });
      await db.prepare("INSERT OR REPLACE INTO closed_dates (date, reason) VALUES (?, ?)").bind(date, reason).run();
    } else if (action === "delete-closure") {
      await db.prepare("DELETE FROM closed_dates WHERE date = ?").bind(String(body.date || "")).run();
    } else if (action === "menu") {
      const id = Number(body.id), category = String(body.category || "").trim(), name = String(body.name || "").trim(), price = String(body.price || "").trim(), description = String(body.description || "").trim(), sortOrder = Number(body.sortOrder || 0);
      if (!MENU_CATEGORIES.includes(category) || !name || !price || name.length > 100 || price.length > 40 || description.length > 350 || !Number.isInteger(sortOrder)) return Response.json({ error: "Revisa los datos del plato." }, { status: 400 });
      if (Number.isInteger(id) && id > 0) await db.prepare("UPDATE menu_items SET category = ?, name = ?, price = ?, description = ?, sort_order = ? WHERE id = ?").bind(category, name, price, description, sortOrder, id).run();
      else await db.prepare("INSERT INTO menu_items (category, name, price, description, sort_order) VALUES (?, ?, ?, ?, ?)").bind(category, name, price, description, sortOrder).run();
    } else if (action === "delete-menu") {
      await db.prepare("DELETE FROM menu_items WHERE id = ?").bind(Number(body.id)).run();
    } else if (action === "gallery") {
      const id = Number(body.id), title = String(body.title || "").trim().slice(0, 100), alt = String(body.alt || "").trim().slice(0, 180), imageUrl = String(body.imageUrl || "").trim(), sortOrder = Number(body.sortOrder || 0);
      if (!alt || !/^(\/|https:\/\/)/.test(imageUrl) || !Number.isInteger(sortOrder)) return Response.json({ error: "Añade una URL de imagen válida y un texto alternativo." }, { status: 400 });
      if (Number.isInteger(id) && id > 0) await db.prepare("UPDATE gallery_items SET title = ?, alt = ?, image_url = ?, sort_order = ? WHERE id = ?").bind(title, alt, imageUrl, sortOrder, id).run();
      else await db.prepare("INSERT INTO gallery_items (title, alt, image_url, sort_order) VALUES (?, ?, ?, ?)").bind(title, alt, imageUrl, sortOrder).run();
    } else if (action === "delete-gallery") {
      await db.prepare("DELETE FROM gallery_items WHERE id = ?").bind(Number(body.id)).run();
    } else return Response.json({ error: "Acción no reconocida." }, { status: 400 });
    return GET();
  } catch {
    return Response.json({ error: "No se han podido guardar los cambios." }, { status: 500 });
  }
}
