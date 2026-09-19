# Los Tres Pacos · Portmán

Sitio web estático de Los Tres Pacos, preparado para publicarse directamente con GitHub Pages. No necesita Node.js, compilación ni servidor para mostrar sus páginas públicas.

## Estructura

```text
index.html                 Página de inicio
pages/
  nosotros.html            Historia y propuesta del café-bar
  carta.html               Carta gastronómica
  galeria.html             Galería del local e identidad
  reservas.html            Solicitud de reservas y aforo por zona
  contacto.html            Dirección, teléfono y redes sociales
assets/
  site.css                 Estilos comunes y diseño responsive
  site.js                  Menú móvil y mensaje del formulario estático
public/images/             Logotipos e imágenes, incluido el favicon
```

## Publicación en GitHub Pages

GitHub Pages debe publicar la rama `main` desde la carpeta raíz del repositorio. La portada es `index.html`; las demás secciones son documentos HTML independientes enlazados desde el menú.

## Reservas y zona privada

La página de reservas muestra las capacidades actuales: salón interior (30), salón exterior (70) y terraza (50). Al ser una web estática, no confirma reservas ni almacena datos: dirige al teléfono del establecimiento para la confirmación. La gestión privada requiere un backend y permanece en la versión con servidor.
