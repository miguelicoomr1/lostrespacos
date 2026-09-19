import { env } from "cloudflare:workers";
import { SiteFooter, SiteHeader } from "../../components/site-chrome";
import { DEFAULT_GALLERY } from "../../lib/catalog";

async function galleryFromDatabase() {
  try {
    if (!env.DB) return DEFAULT_GALLERY;
    const result = await env.DB.prepare("SELECT id, title, alt, image_url AS imageUrl FROM gallery_items ORDER BY sort_order, id").all<{ id: number; title: string; alt: string; imageUrl: string }>();
    return result.results.length ? result.results : DEFAULT_GALLERY;
  } catch { return DEFAULT_GALLERY; }
}

export default async function Galeria(){const images = await galleryFromDatabase(); return <main className="page-shell"><SiteHeader current="galeria"/><p className="section-label">GALERÍA</p><h1 className="page-title">El lugar<br />también sirve.</h1><p className="page-lead">Una selección del local, la terraza y los detalles de Los Tres Pacos.</p><div className="gallery-public">{images.map((image, index)=><figure className={index === 0 ? "gallery-featured" : ""} key={image.id || image.imageUrl}><div className="gallery-image" role="img" aria-label={image.alt} style={{backgroundImage:`url("${image.imageUrl}")`}}/>{image.title&&<figcaption>{image.title}</figcaption>}</figure>)}</div><SiteFooter/></main>}
