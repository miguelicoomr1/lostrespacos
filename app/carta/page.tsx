import { env } from "cloudflare:workers";
import { SiteFooter, SiteHeader } from "../../components/site-chrome";
import { DEFAULT_MENU, MenuEntry } from "../../lib/catalog";

async function menuFromDatabase(): Promise<MenuEntry[]> {
  try {
    if (!env.DB) return DEFAULT_MENU;
    const result = await env.DB.prepare("SELECT id, category, name, price, description, sort_order AS sortOrder FROM menu_items ORDER BY category, sort_order, id").all<MenuEntry>();
    return result.results.length ? result.results : DEFAULT_MENU;
  } catch { return DEFAULT_MENU; }
}

export default async function Carta() {
  const entries = await menuFromDatabase();
  const groups = [...new Set(entries.map((item) => item.category))].map((category) => ({ category, dishes: entries.filter((item) => item.category === category) }));
  return <main className="page-shell"><SiteHeader current="carta"/><p className="section-label">CARTA</p><h1 className="page-title">Para sentarse,<br />pedir y compartir.</h1><p className="page-lead">Carta transcrita de la documentación facilitada por el establecimiento. Consulta la disponibilidad en sala.</p><div className="menu-grid">{groups.map(({ category, dishes })=><section className="menu-section" key={category}><h2>{category}</h2>{dishes.map((item)=><div className="dish" key={item.id || `${item.category}-${item.name}`}><p>{item.name}</p><span>{item.price}</span>{item.description&&<small>{item.description}</small>}</div>)}</section>)}</div><SiteFooter/></main>;
}
