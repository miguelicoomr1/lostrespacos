# Los Tres Pacos · Portmán

Web de Los Tres Pacos, café-bar de Portmán. Incluye carta, reservas con control de aforo por zona, galería y área privada de gestión.

## Desarrollo

Requiere Node.js 22 o posterior.

```bash
npm install
npm run dev
```

La vista local estará disponible en `http://localhost:5173`.

## Funciones principales

- Reservas en franjas de 30 minutos con duración de 90 minutos.
- Aforo configurable por zona: salón interior, salón exterior y terraza.
- Panel privado para agenda, cierres, carta y galería.
- Carta y galería públicas conectadas a la gestión privada.
