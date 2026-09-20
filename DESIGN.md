# Diseño

Mundo visual: **bar de puerto con la fachada de Portmán por bandera**. Azafrán de la fachada, negro del logotipo, azul mar de la carta y cal blanca de las paredes. Tipografía condensada en mayúsculas como el «PACOS» del logo; nada de serif ni crema de plantilla.

## Color (tokens en `src/assets/css/site.css`)
| Token | Valor | Uso |
|---|---|---|
| `--ink` | #15120e | Texto, carta (pizarra), banda de datos |
| `--saffron` | #eda531 | Portada, cabeceras de página, CTA sobre oscuro, precios |
| `--sea` | #0c3d52 | Bloque «La carta» de la portada |
| `--cal` | #f0f1ec | Fondo de lectura |
| negro `#000` | — | Cabecera, pie, barra de acción (casa con el fondo del logo) |

Contrastes verificados ≥ 5,5:1 en todas las parejas de texto.

## Tipografía (autoalojada, OFL)
- Display: Barlow Condensed 700, mayúsculas, interlineado .92, máx. 6 rem.
- Cuerpo: Barlow 400/600, 17 px, medida ≤ 65 caracteres.

## Componentes
- **Botón** (`.btn`): bloque plano de 48 px, mayúsculas con tracking; sobre oscuro/mar pasa a azafrán. Variante `--ghost`.
- **Filas** (`.rows`): lista con filetes para horarios, zonas y datos; sin tarjetas.
- **Pizarra de carta** (`.board`): fondo tinta, categorías en azafrán, precios alineados a la derecha.
- **Barra de acción móvil** (`.action-bar`): Llamar · Cómo llegar · Reservar, fija abajo hasta 960 px.
- **Menú móvil**: `<details>`, sin JavaScript obligatorio.

## Movimiento
Un solo momento: la portada entra con subida de texto y persiana de la foto (`clip-path`). Resto: elevación de botones y desplazamiento de flechas. Todo desactivado con `prefers-reduced-motion`.
