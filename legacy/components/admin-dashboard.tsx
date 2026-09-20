"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, ImagePlus, Settings2, UtensilsCrossed } from "lucide-react";

type Zone = { name: string; capacity: number; enabled: number };
type Reservation = { id: number; name: string; phone: string; email: string; people: number; date: string; time: string; zone: string; notes: string; status: "pending" | "confirmed" | "cancelled" };
type Closure = { date: string; reason: string };
type MenuItem = { id: number; category: string; name: string; price: string; description: string; sortOrder: number };
type GalleryItem = { id: number; title: string; alt: string; imageUrl: string; sortOrder: number };
type DashboardData = { zones: Zone[]; reservations: Reservation[]; closures: Closure[]; menu: MenuItem[]; gallery: GalleryItem[]; categories: string[] };
const tabs = [{ id: "agenda", label: "Agenda", icon: CalendarDays }, { id: "zones", label: "Zonas", icon: Settings2 }, { id: "menu", label: "Carta", icon: UtensilsCrossed }, { id: "gallery", label: "Galería", icon: ImagePlus }] as const;
type Tab = typeof tabs[number]["id"];
const blankMenu = { category: "Tapas", name: "", price: "", description: "", sortOrder: 999 };
const blankGallery = { title: "", alt: "", imageUrl: "", sortOrder: 99 };

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("agenda");
  const [data, setData] = useState<DashboardData | null>(null);
  const [message, setMessage] = useState("Cargando la operativa…");
  const [menuFilter, setMenuFilter] = useState("Todas");
  const [newMenu, setNewMenu] = useState(blankMenu);
  const [newGallery, setNewGallery] = useState(blankGallery);

  async function load() {
    const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) { setMessage(payload.error || "No se ha podido cargar el panel."); return; }
    setData(payload); setMessage("");
  }
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, []);
  async function save(payload: Record<string, unknown>, confirmation = "Cambios guardados.") {
    setMessage("Guardando…");
    const response = await fetch("/api/admin/dashboard", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const next = await response.json();
    if (!response.ok) { setMessage(next.error || "No se han podido guardar los cambios."); return false; }
    setData(next); setMessage(confirmation); return true;
  }
  const pending = data?.reservations.filter((item) => item.status === "pending").length || 0;
  const confirmed = data?.reservations.filter((item) => item.status === "confirmed").length || 0;
  const visibleMenu = useMemo(() => data?.menu.filter((item) => menuFilter === "Todas" || item.category === menuFilter) || [], [data, menuFilter]);
  if (!data) return <section className="admin-panel admin-loading"><h2>Preparando el panel.</h2><p role="status">{message}</p><button className="button button-dark" onClick={() => void load()}>Reintentar</button></section>;

  return <section className="admin-panel">
    <div className="admin-overview"><div><h2>Operativa diaria.</h2><p>Gestiona el servicio y publica cambios desde un único lugar.</p></div><div className="admin-counts"><span><b>{pending}</b> por confirmar</span><span><b>{confirmed}</b> confirmadas</span></div></div>
    <div className="admin-tabs" role="tablist" aria-label="Gestión privada">{tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon size={17} />{label}</button>)}</div>
    <p className="admin-message" aria-live="polite">{message}</p>

    {tab === "agenda" && <Agenda data={data} save={save} />}
    {tab === "zones" && <Zones zones={data.zones} save={save} />}
    {tab === "menu" && <section className="admin-content"><div className="admin-section-heading"><div><h3>Carta publicada</h3><p>Los cambios se reflejan en la carta pública al guardarse.</p></div><select aria-label="Filtrar categoría" value={menuFilter} onChange={(event) => setMenuFilter(event.target.value)}><option>Todas</option>{data.categories.map((category) => <option key={category}>{category}</option>)}</select></div><div className="menu-admin-list">{visibleMenu.map((item) => <MenuEditor key={item.id} item={item} categories={data.categories} save={save} />)}</div><EntryForm title="Añadir plato" onSubmit={async (event) => { event.preventDefault(); if (await save({ action: "menu", ...newMenu }, "Plato añadido.")) setNewMenu(blankMenu); }}><select value={newMenu.category} onChange={(e) => setNewMenu({ ...newMenu, category: e.target.value })}>{data.categories.map((category) => <option key={category}>{category}</option>)}</select><input aria-label="Nombre del plato" placeholder="Nombre" value={newMenu.name} onChange={(e) => setNewMenu({ ...newMenu, name: e.target.value })} required/><input aria-label="Precio del plato" placeholder="Precio" value={newMenu.price} onChange={(e) => setNewMenu({ ...newMenu, price: e.target.value })} required/><input aria-label="Descripción del plato" placeholder="Descripción opcional" value={newMenu.description} onChange={(e) => setNewMenu({ ...newMenu, description: e.target.value })}/></EntryForm></section>}
    {tab === "gallery" && <section className="admin-content"><div className="admin-section-heading"><div><h3>Galería</h3><p>Añade enlaces directos a imágenes para publicarlas.</p></div></div><div className="gallery-admin-list">{data.gallery.map((item) => <GalleryEditor key={item.id} item={item} save={save} />)}</div><EntryForm title="Añadir imagen" onSubmit={async (event) => { event.preventDefault(); if (await save({ action: "gallery", ...newGallery }, "Imagen añadida.")) setNewGallery(blankGallery); }}><input aria-label="Título de imagen" placeholder="Título" value={newGallery.title} onChange={(e) => setNewGallery({ ...newGallery, title: e.target.value })}/><input aria-label="Texto alternativo" placeholder="Descripción de la imagen" value={newGallery.alt} onChange={(e) => setNewGallery({ ...newGallery, alt: e.target.value })} required/><input aria-label="URL de la imagen" placeholder="URL de imagen (https:// o /images/)" value={newGallery.imageUrl} onChange={(e) => setNewGallery({ ...newGallery, imageUrl: e.target.value })} required/></EntryForm></section>}
  </section>;
}

function Agenda({ data, save }: { data: DashboardData; save: (body: Record<string, unknown>, message?: string) => Promise<boolean> }) {
  const [date, setDate] = useState(""), [reason, setReason] = useState("");
  return <section className="admin-content"><div className="admin-section-heading"><div><h3>Agenda de reservas</h3><p>Las solicitudes ocupan aforo hasta que se cancelan.</p></div></div><div className="reservation-list">{data.reservations.length ? data.reservations.map((item) => <article key={item.id} className="reservation-row"><div><strong>{item.date} · {item.time}</strong><span>{item.name} · {item.people} personas · {item.zone}</span><small>{item.phone}{item.notes ? ` · ${item.notes}` : ""}</small></div><select value={item.status} aria-label={`Estado de ${item.name}`} onChange={(event) => void save({ action: "reservation", id: item.id, status: event.target.value }, "Estado actualizado.")}><option value="pending">Pendiente</option><option value="confirmed">Confirmada</option><option value="cancelled">Cancelada</option></select></article>) : <p className="admin-empty">Aún no hay reservas registradas.</p>}</div><div className="closure-block"><div><h3>Cierres y excepciones</h3><p>Estas fechas no admitirán nuevas reservas.</p></div><form onSubmit={(event) => { event.preventDefault(); void save({ action: "closure", date, reason }, "Fecha cerrada.").then((ok) => { if (ok) { setDate(""); setReason(""); } }); }}><input type="date" aria-label="Fecha de cierre" value={date} onChange={(e) => setDate(e.target.value)} required/><input aria-label="Motivo del cierre" placeholder="Motivo (opcional)" value={reason} onChange={(e) => setReason(e.target.value)}/><button type="submit">Cerrar fecha</button></form>{data.closures.map((item) => <div className="closure-row" key={item.date}><span>{item.date}{item.reason ? ` · ${item.reason}` : ""}</span><button onClick={() => void save({ action: "delete-closure", date: item.date }, "Fecha reabierta.")}>Reabrir</button></div>)}</div></section>;
}

function Zones({ zones, save }: { zones: Zone[]; save: (body: Record<string, unknown>, message?: string) => Promise<boolean> }) { return <section className="admin-content"><div className="admin-section-heading"><div><h3>Zonas y capacidades</h3><p>El aforo se valida por zona y se cruza con cada reserva de 90 minutos.</p></div></div><div className="zones-admin">{zones.map((zone) => <form className="zone-card" key={zone.name} onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void save({ action: "zone", name: zone.name, capacity: Number(form.get("capacity")), enabled: form.get("enabled") === "on" }, `${zone.name} actualizada.`); }}><h3>{zone.name}</h3><label>Aforo<input name="capacity" type="number" min="1" max="300" defaultValue={zone.capacity}/><span>comensales</span></label><label className="availability"><input name="enabled" type="checkbox" defaultChecked={Boolean(zone.enabled)}/> Disponible para reservar</label><button type="submit">Guardar zona</button></form>)}</div></section>; }

function MenuEditor({ item, categories, save }: { item: MenuItem; categories: string[]; save: (body: Record<string, unknown>, message?: string) => Promise<boolean> }) { const [draft, setDraft] = useState(item); return <form className="menu-editor" onSubmit={(event) => { event.preventDefault(); void save({ action: "menu", ...draft }, "Plato actualizado."); }}><select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select><input value={draft.name} aria-label="Nombre" onChange={(e) => setDraft({ ...draft, name: e.target.value })}/><input value={draft.price} aria-label="Precio" onChange={(e) => setDraft({ ...draft, price: e.target.value })}/><input value={draft.description} aria-label="Descripción" onChange={(e) => setDraft({ ...draft, description: e.target.value })}/><button type="submit">Guardar</button><button className="delete" type="button" onClick={() => void save({ action: "delete-menu", id: item.id }, "Plato eliminado.")}>Eliminar</button></form>; }
function GalleryEditor({ item, save }: { item: GalleryItem; save: (body: Record<string, unknown>, message?: string) => Promise<boolean> }) { const [draft, setDraft] = useState(item); return <form className="gallery-editor" onSubmit={(event) => { event.preventDefault(); void save({ action: "gallery", ...draft }, "Imagen actualizada."); }}><div className="gallery-thumb" style={{ backgroundImage: `url("${draft.imageUrl}")` }} role="img" aria-label={draft.alt}/><div><input value={draft.title} aria-label="Título" onChange={(e) => setDraft({ ...draft, title: e.target.value })}/><input value={draft.alt} aria-label="Texto alternativo" onChange={(e) => setDraft({ ...draft, alt: e.target.value })}/><input value={draft.imageUrl} aria-label="URL" onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}/></div><button type="submit">Guardar</button><button className="delete" type="button" onClick={() => void save({ action: "delete-gallery", id: item.id }, "Imagen eliminada.")}>Eliminar</button></form>; }
function EntryForm({ title, children, onSubmit }: { title: string; children: React.ReactNode; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) { return <form className="entry-form" onSubmit={onSubmit}><h3>{title}</h3><div>{children}</div><button type="submit">Añadir</button></form>; }
