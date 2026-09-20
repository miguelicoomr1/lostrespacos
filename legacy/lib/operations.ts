import { DEFAULT_GALLERY, DEFAULT_MENU, ZONE_DEFAULTS } from "./catalog";

export async function ensureOperationsSchema(db: D1Database) {
  await db.exec(`CREATE TABLE IF NOT EXISTS zones (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, capacity INTEGER NOT NULL, enabled INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS closed_dates (date TEXT PRIMARY KEY NOT NULL, reason TEXT);
CREATE TABLE IF NOT EXISTS reservations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL, people INTEGER NOT NULL, date TEXT NOT NULL, time TEXT NOT NULL, start_at TEXT NOT NULL, end_at TEXT NOT NULL, zone TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS menu_items (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, name TEXT NOT NULL, price TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS gallery_items (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL DEFAULT '', alt TEXT NOT NULL, image_url TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0);`);
  await db.batch(ZONE_DEFAULTS.map((zone) => db.prepare("INSERT OR IGNORE INTO zones (name, capacity, enabled) VALUES (?, ?, 1)").bind(zone.name, zone.capacity)));
  const menuCount = await db.prepare("SELECT COUNT(*) AS total FROM menu_items").first<{ total: number }>();
  if (!menuCount?.total) await db.batch(DEFAULT_MENU.map((item) => db.prepare("INSERT INTO menu_items (category, name, price, description, sort_order) VALUES (?, ?, ?, ?, ?)").bind(item.category, item.name, item.price, item.description, item.sortOrder)));
  const galleryCount = await db.prepare("SELECT COUNT(*) AS total FROM gallery_items").first<{ total: number }>();
  if (!galleryCount?.total) await db.batch(DEFAULT_GALLERY.map((item) => db.prepare("INSERT INTO gallery_items (title, alt, image_url, sort_order) VALUES (?, ?, ?, ?)").bind(item.title, item.alt, item.imageUrl, item.sortOrder)));
}
