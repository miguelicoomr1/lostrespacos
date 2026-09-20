// Datos estructurados (Schema.org). Solo se emite lo que está en negocio.json y es visible en la web.
export function business(ctx) {
  const { n, site } = ctx;
  const a = n.address;
  const o = {
    "@context": "https://schema.org",
    "@type": ["Restaurant", "BarOrPub"],
    "@id": site.url ? `${site.url}/#negocio` : undefined,
    name: n.name,
    url: site.url ? `${site.url}/` : undefined,
    image: site.url ? `${site.url}/assets/img/og.jpg` : undefined,
    telephone: n.phone.tel,
    address: {
      "@type": "PostalAddress",
      streetAddress: a.street,
      postalCode: a.postalCode,
      addressLocality: a.locality,
      addressRegion: a.region,
      addressCountry: a.country,
    },
    servesCuisine: ["Murciana", "Tapas"],
    hasMenu: site.url ? `${site.url}/carta/` : undefined,
    acceptsReservations: true,
    sameAs: Object.values(n.social),
    geo: n.geo ? { "@type": "GeoCoordinates", latitude: n.geo.lat, longitude: n.geo.lng } : undefined,
    openingHoursSpecification: n.openingHours || undefined,
    priceRange: n.priceRange || undefined,
  };
  return o;
}

export function breadcrumbs(ctx, page) {
  if (!ctx.site.url) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: `${ctx.site.url}/` },
      { "@type": "ListItem", position: 2, name: page.crumb, item: `${ctx.site.url}${page.path}` },
    ],
  };
}
