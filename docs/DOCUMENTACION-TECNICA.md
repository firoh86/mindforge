# MindForge — Documentación técnica

Descripción de **cómo funciona la aplicación**: interfaz, nodos, conexiones, estructuras de datos y cómo se guardan los
documentos entre sesiones. Es una referencia de comportamiento; para *cómo se programa* cada cosa (archivos, funciones,
recetas) consulta [`GUIA-DESARROLLO.md`](GUIA-DESARROLLO.md). Las reglas finas de plegado, grupos y conexiones con nodos
ocultos están en [`../MANUAL-JERARQUIA-Y-GRUPOS.md`](../MANUAL-JERARQUIA-Y-GRUPOS.md).

## Índice

1. [Visión general](#1-visión-general)
2. [La interfaz](#2-la-interfaz)
3. [El lienzo: vista, selección y atajos](#3-el-lienzo-vista-selección-y-atajos)
4. [Nodos](#4-nodos)
5. [Conexiones](#5-conexiones)
6. [Jerarquía, plegado y grupos](#6-jerarquía-plegado-y-grupos)
7. [Color, tema y tipografía](#7-color-tema-y-tipografía)
8. [Enlaces](#8-enlaces)
9. [Estructuras de datos](#9-estructuras-de-datos)
10. [Guardado y persistencia](#10-guardado-y-persistencia)
11. [Idiomas](#11-idiomas)
12. [Parte nativa (Tauri / Rust)](#12-parte-nativa-tauri--rust)
13. [Límites y consideraciones](#13-límites-y-consideraciones)

---

## 1. Visión general

MindForge es un **editor de esquemas / mapas mentales de escritorio**. Se compone de:

- Un **frontend** de HTML + CSS + JavaScript sin framework ni *bundler* (`src/`). Los scripts son clásicos (no módulos) y
  comparten ámbito global; el orden de carga (`00` → `35`) importa.
- Un **contenedor nativo Tauri v2** (`src-tauri/`, Rust) que aloja la página en una ventana (WebView2 en Windows) y ofrece
  unos pocos comandos: guardar/leer el tablero, escribir/leer archivos, abrir enlaces y guardar respaldos.
- **Sin servidor ni cuenta**: todo es local. Funciona también abriendo `src/index.html` en un navegador (con menos
  funciones de archivo, ver §10.10).

Todo el **estado** vive en un único objeto global `board` (nodos, conexiones, imágenes, vista) más unas preferencias de
interfaz `UI`. La pantalla es una función de ese estado: cada cambio llama a `commit()` (historial + guardado) y a las
funciones de pintado (`mkNode`, `applyNode`, `renderEdges`…).

```
┌──────────────────────────── ventana ────────────────────────────┐
│  BARRA (#bar)  título · espacios · muestras · rueda · botones   │
├─────────────────────────────────────────────────────────────────┤
│  #stage                                                         │
│   └ #canvas  (recibe zoom/pan)                                  │
│       └ #world  (transform: translate + scale)                  │
│           ├ svg#edges        conexiones (flechas, etiquetas)    │
│           └ div.node ×N      una tarjeta por nodo               │
│  paneles flotantes: formato · inspectores · menú · diálogos     │
│  minimapa · menú de exportar · recorte de exportación           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. La interfaz

### 2.1 La barra

La barra (`#bar`) se puede **acoplar a cualquier borde** arrastrando el asa `⠿` (arriba, abajo, izquierda o derecha); en
vertical se reorganiza en columnas. De izquierda a derecha (en horizontal):

| Elemento | Función |
|---|---|
| `⠿` asa | Arrastrar para acoplar la barra a otro borde. |
| Logo (pulpo) | Abre el selector de **color de acento** de toda la aplicación. El texto **MindForge** usa el acento. |
| Título (`#boardTitle`) | **Nombre del espacio de trabajo** (hasta 80 caracteres, se guarda en `board.title`). Enter confirma, Esc restaura el anterior. |
| Botón de **espacios de trabajo** | Desplegable: Nuevo espacio · Abrir archivo… · Guardar · Guardar como… · Autoguardado · lista de Recientes (§10). |
| **Muestras** de color | 20 muestras base + hasta 10 propias (tras un separador). Plegada muestra 6; el botón `»` las despliega. En barras estrechas pasan a un desplegable. |
| **Rueda de color** | Panel con rueda HSV, hex y cuentagotas (§7). |
| Botones de la derecha | **Eliminar todos los nodos** (con confirmación), **zoom general de la interfaz** (100 % ↔ 125 %, icono de ojo), **idioma** EN/ES, **tema** claro/oscuro, y el **zoom del lienzo** (`−` / % / `+`). |

La barra es **responsive**: se mide con el contenido real y, si no cabe en una fila, las muestras pasan a desplegable y el
título se acorta con puntos suspensivos. Los desplegables de la barra cambian de opción con la **rueda del ratón sin abrirse**.

Arriba a la derecha **del lienzo** (no de la barra) hay ocho botones en **dos bloques** separados por una línea vertical
(color de borde del tema), cada uno de dos columnas:
- **Bloque izquierdo**: *imán a la rejilla* y *Centrar vista*; debajo, *Minimapa* (§5.4c) y *Exportar vista* (§5.4d).
- **Bloque derecho**: *deshacer* y *rehacer*; debajo, *Ver principal / Ver todo* (§5.4) y *Esquivar nodos* (§5.4b).
- Bajo los dos bloques, a todo el ancho, el deslizador de **grosor de flecha**, y encima una barra fina del **historial**.

Abajo a la izquierda está el botón de **ayuda** `?`.

### 2.2 Menú contextual (clic derecho)

- **Sobre el fondo**: buscador de nodos (por título/texto; Enter selecciona y centra los resultados) · ＋ Globo · ＋ Cuadro de
  texto · ＋ Comentario · ＋ Tarea · ＋ Imagen… · ＋ Paleta de color · ＋ Pixel art · Seleccionar todo · Centrar vista ·
  Ver principal / Ver todo.
- **Sobre un nodo**: entradas propias de cada tipo (Editar texto, Recortar, Guardar como…, Exportar PNG…, Añadir
  subtarea…), *Abrir enlace* si lo hay, y comunes: Duplicar · Traer al frente · Enviar al fondo · ＋ Nodo hijo (Tab) ·
  ＋ Nodo hermano (Ctrl+Enter) · Plegar/Desplegar rama (/) · Eliminar. Los cuadros con grupo añaden Contraer/Expandir grupo.
- **Sobre una conexión**: Poner / editar texto · Flecha → / invertida ← / bidireccional ↔ · Eliminar conexión.
- **Clic derecho en una bolita de conexión y arrastrar**: la flecha de puntos sigue al ratón y, al soltar, aparece un
  menú rápido de creación de nodo hijo (§5.3).

### 2.3 Paneles flotantes, diálogos y ayuda

- **Barra de formato** de texto (fuente, tamaño, B / I / U) flotando junto al nodo de texto seleccionado.
- **Inspector de paleta** y **inspector de pixel art**, junto al nodo activo.
- **Diálogos modales** (`#modal`): mensaje, campo de texto opcional, X de cancelar arriba a la derecha, botón principal y
  uno alternativo. Se cancelan con X, Esc y clic derecho (algunos también con clic fuera).
- **Avisos** (`#toast`) breves abajo.
- **Panel de ayuda** (botón `?`) a dos columnas; **tooltips (i)** de grupos, paleta y pixel art tras ~0,8 s de ratón encima.
- Todos los menús y paneles comparten **fondo, borde, radio y sombra** (`--float-bg`, `--float-shadow`).

---

## 3. El lienzo: vista, selección y atajos

### 3.1 Vista
`board.view = { x, y, k }` (desplazamiento y zoom, `k` entre 0,1 y 8). El mundo (`#world`) se transforma con
`translate(x,y) scale(k)`. **Rueda** = zoom hacia el cursor; **arrastrar el fondo** = mover la vista. La cuadrícula del fondo
sigue al zoom. `fit()` centra y ajusta a los nodos visibles (también con **Espacio** sobre la selección, máx. 150 %).

### 3.2 Rejilla magnética
Los nodos se colocan con **ajuste a la rejilla de 20 px** (`GRID`), tanto al mover como al redimensionar. El botón *imán* de
arriba a la derecha lo desactiva (entonces se redondea al píxel).

### 3.3 Selección
- Clic = un nodo · **Ctrl+clic** = suma/quita · **clic derecho + arrastrar** en el fondo = recuadro de selección (con Ctrl
  o Shift suma a la actual) · Ctrl+A = todo.
- Con varios nodos seleccionados se mueven juntos. Las ramas plegadas y los grupos viajan con su nodo.
- **Pixel art** solo está «activo» (herramientas, pie, panel) cuando es el **único** nodo seleccionado.

### 3.4 Atajos de teclado
| Atajo | Acción |
|---|---|
| Doble clic en el fondo / clic derecho | Crear nodo |
| Doble clic, **Enter** o **F2** | Editar el texto del nodo seleccionado |
| **Tab** / **Ctrl+Enter** | Nodo hijo / nodo hermano (también dentro de la edición: confirman y crean) |
| **/** | Plegar o desplegar la rama |
| **Supr / Retroceso** | Eliminar la selección (con un grupo pregunta qué hacer) |
| **Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y** | Deshacer / rehacer (mantienen la selección) |
| **Ctrl+D** | Duplicar · **Ctrl+A** seleccionar todo · **Ctrl+S** guardar espacio · **Ctrl+0** restablecer vista |
| **Ctrl+B / I / U** | Negrita / cursiva / subrayado |
| **Espacio** | Centrar la vista en la selección |
| **C** | Recortar la imagen seleccionada |
| **Flechas** | Mover los nodos seleccionados 20 px (con **Shift**, 100 px); la rama plegada y los grupos viajan con ellos |
| **Shift+clic** sobre otro nodo | Pipeta: copia su color al seleccionado |
| **Esc** | Cierra paneles, menús, edición |
| Pixel art | Atajos de herramienta configurables (⚙), por defecto B (lápiz) E (goma) G (cubo) I (cuentagotas) M (cuadrado) L (lazo) |
| **Ctrl+V** | Pega imagen (nodo imagen), texto (nodo de texto) o, dentro de una edición, texto plano |

Además se pueden **arrastrar archivos de imagen** al lienzo.

---

## 4. Nodos

### 4.1 Modelo común
Todo nodo es un objeto de `board.nodes` y una `div.node` en el DOM (`els: Map<id, elemento>`). Campos comunes:

| Campo | Significado |
|---|---|
| `id` | Identificador único (`uid()`, 7 caracteres). |
| `type` | `bubble` · `text` · `comment` · `task` · `palette` · `image` · `pixel`. |
| `x, y, w, h` | Posición y tamaño en coordenadas del mundo. |
| `color` | `"auto"` (color de tarjeta del tema), `"#rrggbb"`, `"transparent"` (texto) o `"outline"` (cuadro de texto solo con borde). |
| `html` | Contenido de texto enriquecido (HTML). |
| `font`, `fs`, `b`, `i`, `u` | Fuente, tamaño y estilo del texto. |
| `grp`, `gcol`, `fw`, `uh`, `back`, `fold` | Grupo, plegado y apariencia (§6). |

Tamaños por defecto (`SIZE`): globo 240×64, texto 280×100, comentario 320×160, tarea 320×150, paleta 400×160,
imagen 300×200, pixel art 320×360. Cada nodo nuevo hereda el **último formato de texto usado** (`LF`).

### 4.2 Globo (`bubble`)
Burbuja redondeada con una o varias líneas de texto. Color de fondo elegible (por defecto `auto`); el color del texto se
adapta al fondo (claro/oscuro) por luminancia. Es el nodo base de los esquemas.
- **Tamaño y texto**: el globo solo se reescala solo **mientras se edita su texto**: crece (alto y, si hay una palabra
  larga, ancho hasta 360 px) para que el texto quepa, y vuelve al tamaño que tenía al empezar si se borra texto; nunca baja
  de ahí. Fuera de la edición no cambia solo. Con el nodo activo se puede escalar a mano, agrandándolo o reduciéndolo
  **hasta que el texto quepa** (ancho mínimo = palabra más larga; alto mínimo según el ancho). Código: `bubbleFit` en
  `07-render.js`, entrada en `startEdit` (`12-text-edit.js`) y límites en el `resize` de `14-pointer.js`.

### 4.3 Cuadro de texto (`text`)
Texto libre **sin fondo** por defecto (`transparent`); puede tener color de fondo, o modo **borde** (`outline`, con color de
borde `bc`). La altura es **automática** según el texto; `uh` guarda la altura mínima elegida. Funciones especiales:
- **Enviar al fondo** (`back`): queda por detrás de los demás y actúa como **cuadro de grupo** (§6.2).
- Con grupo: se reduce a una línea (el nombre del grupo, 60 caracteres) y muestra botones de **contraer** e **(i)**.
- El texto cambia de tinta según el color que tenga detrás.

### 4.4 Comentario (`comment`)
Nota con **cabecera** (título editable) y cuerpo de texto. Se **pliega** (`collapsed`) a solo la cabecera, con el ancho
ajustado al título (`fw` recuerda el ancho desplegado). Su conexión con otros nodos es **discontinua** (§5.2).

### 4.4b Tarea (`task`)
Como el comentario, con un **check de estado** (`status`: `todo` → `doing` → `done`, un clic cambia) y **subtareas**:
- `subs = [{ id, t, s }]` con `s ∈ todo | doing | done`; cada subtarea muestra un punto de color (rojo hueco / naranja / verde).
- Con subtareas, el check principal es **solo lectura** y muestra un anillo con el % completado; `status` se deriva
  (0 % pendiente · avance en progreso · 100 % completada).
- Añadir: botón al pie o clic derecho → *Añadir subtarea*. Enter guarda y abre otra, Shift+Enter hace salto de línea,
  doble clic edita, la × elimina, una subtarea vacía se descarta. Al cargar se validan.

### 4.5 Imagen (`image`)
- Al añadirla (botón, arrastrar archivo o Ctrl+V) se lee como *data URL* y, si pesa más de 1,5 MB o supera 2400 px, se
  **reescala a JPEG** (calidad 0,9). El nodo guarda solo `img` (un id); la imagen vive en `board.images[img]`.
- Campos: `img`, `nw`/`nh` (tamaño original), `crop = { x, y, w, h }` (recorte normalizado 0–1).
- **Recortar** (tecla C o menú) abre un recortador visual; **Restaurar recorte** y **Restaurar tamaño original** lo deshacen.
- Doble clic = **visor** con zoom (rueda) y arrastre.
- **Guardar como…** exporta PNG o JPEG según la extensión elegida, con el recorte aplicado y a resolución original (el JPEG
  rellena de blanco la transparencia).

### 4.6 Paleta de color (`palette`)
Conjunto de colores con generador y herramientas.
- Datos: `colors` (hasta 50 hex), `gen = { h, s, l, mode, n }` (parámetros de generación; modos de armonía),
  `selChip` (chip activo), `view` (`grid` · `strip` · `list` · `dots`), `vs` (tamaño recordado por vista), `title`.
- Cabecera (con el nodo seleccionado): botón de **vista** (su icono muestra la *siguiente*), **ordenar** (menú ▾: por tono, saturación,
  brillo, luminancia, rojo, verde o azul), **aleatoria**, **− último color**, **＋ añadir color**. Sobre un chip aparece × para quitarlo.
- **Chips**: clic = color activo y copia el HEX · doble clic = guarda el color en la barra · Shift+clic = aplica ese color a
  los demás nodos seleccionados · arrastrar un chip sobre otro = intercambiar.
- **Vistas con autoajuste y tamaño mínimo** por vista y número de colores.
- **Inspector**: crear paleta (armonía), ajustar paleta actual, archivo y biblioteca.
- **Biblioteca incluida**: Pear36 y otras de Lospec, y consolas clásicas (Game Boy, CGA, C64, ZX Spectrum, VGA…).
- **Mis paletas** (máx. 10) guardadas en `UI.pals`.
- **Archivos**: exportar/importar **.gpl** (GIMP/Aseprite/Krita; importar sustituye los colores, máx. 50) y exportar **PNG**
  (1, 8, 16, 32 o 64 px por muestra; tira o cuadrícula; con 1 px sirve de paleta indexable).

### 4.7 Pixel art (`pixel`)
Lienzo de píxeles editable dentro del nodo.
- **Datos**: `pw`×`ph` (tamaño del lienzo, p. ej. 16×16; atajos 8/16/32), `rle` (imagen comprimida, ver §9.3), `bgOn`/
  `bgColor` (fondo del lienzo), `ghost` (fondo translúcido para calcar), `title`. `tile` es **temporal** (nunca se restaura).
- **Herramientas**: lápiz, goma (punta circular o cuadrada, tamaño 1–10), cubo, cuentagotas, selección cuadrada, lazo y
  varita. Ctrl+rueda cambia el tamaño de la punta. Clic derecho = borrar/quitar selección; doble clic derecho con una
  herramienta de selección = seleccionar todo.
- **Botón central** arrastrando: desplaza todos los píxeles con envoltura (como un tile), un paso de deshacer por arrastre.
- **Modo compacto**: sin seleccionar, el nodo muestra solo un cabecero de una fila (título y medidas) y la cuadrícula, sin pie; al seleccionarlo recupera herramientas y pie.
- **Modo tile** (constante `TILEM = 8`): muestra 8 píxeles repetidos alrededor del lienzo; el nodo crece para alojarlos y vuelve a su tamaño al
  desactivarlo o perder la selección.
- **Cabecero de dos filas** (título + fondo/cuadrícula/tile; debajo las herramientas) y **pie** con tamaño de punta. Fuera
  de foco se compacta a una fila sin pie. El primer clic sobre un nodo no activo solo lo activa.
- **Exportar PNG** x1 / x8 / x32 (solo la capa de dibujo; el fondo no se exporta). Si el tamaño supera 16 384 px, avisa.
- Las selecciones de píxeles se pierden al dejar de estar el nodo seleccionado.

---

## 5. Conexiones

### 5.1 Qué son
`board.edges = [{ id, from, to, dir?, label? }]`. Se dibujan como **líneas ortogonales con esquinas redondeadas** en un único
SVG (`#edges`). Se crean arrastrando desde las **bolitas** de los lados de un nodo hasta otro. Doble clic en la línea
edita su **texto**; el texto parte la flecha en dos tramos alrededor de la etiqueta.

### 5.2 Dirección y estilo
- `dir`: ausente = flecha en el destino (`from → to`); `"rev"` = flecha en el origen; `"both"` = en ambos extremos.
  La punta apunta siempre al **hijo**; invertir una flecha intercambia padre e hijo (§6.1).
- Las conexiones que tocan un nodo de tipo **texto, comentario o tarea** se dibujan **discontinuas**.
- **Grosor** (1–4, deslizador; `board.edgeW`, por defecto 2); el texto de las flechas escala con el grosor.
- El lado de salida/llegada se elige según la posición relativa de los nodos; varias conexiones en un mismo lado se
  **reparten** en hasta tres tipos de extremo (punta, sin punta, bola).

### 5.3 Crear nodos desde una conexión
Clic derecho sobre una bolita y arrastrar: sale una flecha de puntos; al soltar, un menú permite crear un nodo hijo en ese
punto. Salir del menú o cerrarlo cancela todo.

### 5.4 Ver principal / Ver todo
`board.mainOnly` oculta todas las flechas discontinuas para ver solo la jerarquía principal.

### 5.4b Esquivar nodos
Botón junto a «Ver principal» (resaltado cuando está activo; `board.avoid`, se guarda con el tablero, desactivado por defecto).
Con él activo, las flechas **pueden cruzarse entre sí pero rodean los nodos** que se interpongan. Si el trazado normal (en
Z) no toca ningún nodo, se queda igual; si lo toca, se calcula el camino ortogonal más corto (menos esquinas) por una
rejilla formada con los bordes de los nodos cercanos más un margen de 14 px. El texto de la flecha se coloca en el tramo
más largo. No se aplica a los tramos con bola ni a la flecha mientras se arrastra para conectar. Los caminos se guardan en
caché y solo se recalculan si cambian los extremos o los nodos cercanos. El slider de grosor ocupa siempre el ancho de la
fila de botones; avanza en pasos de 0,05 (de 1 a 4) para que el cambio de grosor se sienta continuo.

### 5.4c Minimapa
Panel flotante sobre el espacio de trabajo, activable con el botón de mapa (segunda fila de botones de arriba a la derecha,
entre los botones auxiliares y el slider de grosor; hay sitio para más botones en esa fila). Borde del color de acento y
fondo del color de la tarjeta del tema al 40 %.
- Dibuja todos los nodos visibles con una forma mínima y el **color de fondo actual** de cada uno: globo = píldora; texto y
  comentario = rectángulo (los transparentes, solo con borde discontinuo); **tarea** = tres filas y un tick verde;
  **pixel art** = cuadrado con dos píxeles en diagonal; **imagen** = marco con una carita sonriente; **paleta** = cuadrícula
  2×2 con sus cuatro primeros colores. Si el nodo es muy pequeño en el panel solo se dibuja la forma. Las **conexiones principales** (las continuas) se dibujan con el mismo trazado que las reales (lado de salida, esquinas redondeadas, reparto de anclajes, «Esquivar nodos» si está activo) y con sus puntas de flecha según el sentido; el recuadro de color
  de acento marca lo que se ve ahora. Los nodos ocultos por plegado no aparecen.
- **Clic** (sin arrastrar) en un punto: la vista se centra en ese punto del tablero (el zoom no cambia).
- **Arrastrar dentro**: mueve el panel. **Arrastrar una esquina**: lo escala (mínimo 140×100, dentro del área de trabajo).
- Preferencias en `UI` (`mmOn`, `mm = {x,y,w,h}`), no en el tablero. Código: `js/33a-minimap.js`; se repinta desde
  `renderEdges()` y `applyView()` (con `requestAnimationFrame`).

### 5.4d Exportar la vista como PNG
Botón de imagen a la derecha del botón del minimapa (segunda fila). Menú **en dos pasos**:
1. **Zona**: «Recorte» o «Espacio de trabajo completo» (todo lo que se ve ahora en el espacio de trabajo).
   - Con *Recorte* aparece un rectángulo sobre el lienzo con el resto oscurecido: se **arrastra** para moverlo, se escala por
     los **ocho tiradores** o se **dibuja uno nuevo** arrastrando fuera de él (mínimo 40×40 px). Una barra superior muestra
     su tamaño y los botones *Cancelar* / *Continuar* (Esc y Enter hacen lo mismo).
2. **Resolución**: **×0,5, ×1 y ×1,5** sobre el tamaño en pantalla de la zona elegida, mostrando los píxeles resultantes. La
   flecha ‹ de la cabecera vuelve al paso 1.

La imagen lleva el fondo punteado del tema, sin tiradores, puntos de conexión ni minimapa. Pregunta dónde guardar
(`<título>_x1.png`, o `<título>_recorte_x1.png` con recorte; en navegador sin selector, descarga directa). Técnica: se clona
`#world` con los estilos calculados incrustados, se dibuja en un `<foreignObject>` SVG (desplazado y recortado si hay
recorte) y se pasa a `<canvas>`; los canvas del pixel art se convierten en imágenes. Fuentes: si existe `css/00-fonts.css`
(`npm run fonts`), `fontsCss()` lo carga, convierte sus `url()` en data URL y lo inyecta como `<style>` dentro del SVG, así las
fuentes salen en la imagen; si no existe se usan las del sistema. Código: `js/33b-export-view.js`.

### 5.5 Conexiones con nodos ocultos
Si un extremo está oculto (rama plegada o grupo contraído) la conexión se muestra de forma resumida: flecha virtual hasta
la cabecera del grupo, o tramo con **bola** hasta el nodo que lo oculta. Detalle completo en el manual de jerarquía.

---

## 6. Jerarquía, plegado y grupos

### 6.1 Jerarquía
Sale de las conexiones: **hijo** = nodo al que apunta la flecha; **padre** = el otro extremo. Las flechas dobles
(`both`) no son jerarquía. Un nodo puede tener varios padres. Código: `ePar` / `eChi`, `treeMaps()`.

### 6.2 Plegar y contraer
- **Plegar** (`fold`): oculta la rama del nodo; el botón pasa a `+N`.
- **Grupo**: un cuadro de texto enviado al fondo con nodos «bloqueados» dentro (`grp` = id del cuadro). **Contraer**
  (`gcol`) reduce el grupo a su cabecera y oculta a los miembros.
- **Regla del padre visible**: un nodo candidato a ocultarse se salva si tiene otro padre visible y sin plegar.
- Un grupo nunca anida otro grupo. Mover un grupo mueve a sus miembros; borrar un cuadro con grupo pregunta si borrar todo
  o solo el cuadro.

Todo el detalle está en el manual: [`MANUAL-JERARQUIA-Y-GRUPOS.md`](../MANUAL-JERARQUIA-Y-GRUPOS.md).

---

## 7. Color, tema y tipografía

- **Tema Notebook** claro/oscuro (arranca en oscuro; se recuerda en `UI.theme`). Variables CSS en `css/01-theme.css`:
  `--card`, `--foreground`, `--background`, `--border`, `--acc` (acento), `--ui` (escala tipográfica de la interfaz: 1,12).
- **Color de acento** configurable (`UI.accent`, por defecto `#f56565`); el icono del logo es `assets/icons/octopus.svg`
  (`fill=currentColor`), el mismo pulpo kawaii dibujado a mano que usa la app como icono.
- **Color de un nodo**: muestras de la barra (20 base + hasta 10 propias, `UI.custom`), rueda de color o **pipeta**
  (Shift+clic, o el cuentagotas global). El texto elige tinta clara u oscura según la **luminancia** del fondo real
  (incluido el cuadro de texto coloreado que tenga detrás).
- **Rueda de color**: rueda + triángulo HSV, campo hex, cuentagotas de pantalla; el color activo (`UI.activeColor`) se
  comparte con el pixel art.
- **Zoom general de la interfaz** (ojo): alterna entre 100 % y 125 % con el zoom nativo del webview (`UI.zoom`).
- **Fuentes**: Inter, Playfair Display, Montserrat, Nunito y JetBrains Mono (Google Fonts; sin conexión se usan fuentes del
  sistema). Tamaños, negrita, cursiva y subrayado por nodo.

---

## 8. Enlaces

- **Botón de enlace** `↗` en la esquina de un nodo cuyo texto contiene una dirección (`http(s)://` o `www.`): abre el
  navegador predeterminado (comando nativo `open_url`, solo `http`/`https`).
- **Pegar una dirección** en un texto en edición inserta un **enlace con sobrenombre opcional**: aparece el aviso «¿Quieres dar
  un nombre a este enlace?»; el enlace se ve en azul y subrayado, con el sobrenombre en lugar de la dirección. Doble clic
  lo reedita; vacío vuelve a mostrar la dirección. Al pasar el ratón sobre un sobrenombre aparece la dirección real. El
  botón `↗` abre siempre la dirección real.
- En el HTML del nodo es `<span class="mlk" data-u="dirección" data-a="sobrenombre" contenteditable="false">`.

---

## 9. Estructuras de datos

### 9.1 El tablero (`board`)
```jsonc
{
  "v": 5,                      // versión del formato (§9.4)
  "wsId": "w1abc2xy9k",        // id del espacio de trabajo (§10)
  "title": "Mi esquema",       // nombre del espacio
  "edgeW": 2,                  // grosor de flecha (1–4)
  "mainOnly": false,           // «Ver principal»
  "avoid": false,              // «Esquivar nodos»
  "view": { "x": 20, "y": 10, "k": 0.7 },
  "nodes": [ /* §9.2 */ ],
  "edges": [ { "id": "e1", "from": "a", "to": "b", "dir": "rev", "label": "texto" } ],
  "images": { "<id>": "data:image/jpeg;base64,..." }   // imágenes de los nodos image
}
```

### 9.2 Nodos (campos por tipo)
```jsonc
// común
{ "id": "k3f9a2b", "type": "bubble", "x": 520, "y": 140, "w": 240, "h": 64,
  "color": "auto", "html": "texto", "font": "Inter", "fs": 15, "b": false, "i": false, "u": false }
// text: "uh" altura mínima, "bc" color del borde, "back": true (al fondo), "gcol": true + "fw" (grupo contraído)
// miembro de grupo / plegado: "grp": "<id del cuadro>", "fold": true
// comment / task: "title", "collapsed", "fw"; task: "status", "subs": [{ "id", "t", "s" }]
// image: "img", "nw", "nh", "crop": { "x", "y", "w", "h" }
// palette: "title", "colors": ["#..."], "gen": { "h","s","l","mode","n" }, "selChip", "view", "vs"
// pixel: "title", "pw", "ph", "rle": [n, valor, n, valor, ...], "bgOn", "bgColor", "ghost"
```

### 9.3 Imagen del pixel art (RLE)
Los píxeles se guardan como una lista plana de pares `[repeticiones, valor, repeticiones, valor, …]` sobre un buffer de
`pw × ph` enteros de 32 bits (`Uint32`, formato ABGR del `ImageData`; `0` = transparente). Una celda vacía de 16×16 es
`[256, 0]`. `rleEnc` / `rleDec` (`js/13-pixel-art.js`) convierten en ambos sentidos.

### 9.4 Versiones y migración
`loadBoard(d)` valida el formato (`nodes` y `edges` deben ser listas) y migra datos antiguos:
- `v < 3`: normaliza colores de fondo antiguos a `auto` / `transparent`.
- `v < 4`: suma el pie del pixel art (`+PXF` de alto).
- `v < 5`: cabecero de dos filas del pixel art (`+PXH − CH`).
- Siempre: valida subtareas, fija `fw` de comentarios/tareas plegados y recorta títulos.
El formato actual es `v: 5`. Al añadir campos nuevos hay que ser tolerante con su ausencia (ver la guía de desarrollo).

### 9.5 Preferencias de interfaz (`UI`)
Objeto aparte del tablero, en `localStorage["mindforge-ui"]`:

| Clave | Contenido |
|---|---|
| `dock` | Borde donde está acoplada la barra. |
| `custom` | Muestras de color propias (máx. 10). |
| `accent`, `theme`, `lang`, `zoom` | Color de acento, tema, idioma (`es`/`en`; la primera vez, inglés) y zoom general. |
| `activeColor`, `lastFmt` | Último color activo y último formato de texto usado. |
| `pals`, `palSec`, `palPng` | «Mis paletas», secciones abiertas del inspector y opciones de exportación PNG. |
| `pxKeys`, `swOpen` | Atajos personalizados del pixel art y estado de las muestras. |
| `mmOn`, `mm` | Minimapa: visible y posición/tamaño `{x,y,w,h}`. |

### 9.6 Índice de espacios (`mindforge-ws`)
Lista (máx. 15) en `localStorage["mindforge-ws"]`: `{ id, name, t, n, s, file?, path?, auto?, lost? }` — nombre, última
fecha, nº de nodos, peso en bytes, archivo vinculado (nombre y ruta en Tauri), autoguardado y «archivo perdido». Los
*file handles* de los navegadores Chromium se guardan aparte en IndexedDB.

---

## 10. Guardado y persistencia

### 10.1 Capas de almacenamiento

| Capa | Dónde | Qué guarda | Cuándo |
|---|---|---|---|
| **Autoguardado de sesión** | App: `%APPDATA%\com.mindforge.app\board.json` (Tauri `save_board`). Navegador: `localStorage["mindforge"]` | El tablero **actual** completo | Tras cada cambio (500 ms de espera) |
| **Copias de espacios** | IndexedDB `mindforge-ws` (almacén `snap`) + índice en `localStorage["mindforge-ws"]` | Una copia de cada espacio reciente (máx. 15) | En cada guardado de sesión |
| **Archivo vinculado** | Donde el usuario eligió (`.json`) | El tablero, con sangrías | *Guardar*, *Guardar como…* y **autoguardado en archivo** |
| **Respaldos** | `%APPDATA%\com.mindforge.app\backups` | Copias fechadas por espacio | Ver §10.8 (solo app de escritorio) |
| **Preferencias** | `localStorage["mindforge-ui"]` | `UI` (§9.5) | Al cambiarlas |
| **Historial** | Solo memoria | Hasta 120 pasos de deshacer | En cada `commit()`; **no sobrevive** al cerrar |

En la app de Tauri, `localStorage` e IndexedDB viven en la carpeta de datos del WebView2 (normalmente
`%LOCALAPPDATA%\com.mindforge.app\EBWebView`).

### 10.2 Flujo de un cambio
```
acción del usuario → modifica board → commit()
   commit():  guarda un paso en el historial (JSON de nodos+conexiones) → scheduleSave()
   scheduleSave(): espera 500 ms (agrupa ráfagas) → persist()
   persist():  JSON.stringify(board) → save_board / localStorage
               → wsSync(data): índice de espacios + copia en IndexedDB
                   → wsBackup(data): respaldo fechado (app de escritorio)
                   → wsAutoFile(): escribe el archivo vinculado si el autoguardado está activo
```
Mover la vista o redimensionar guardan con `scheduleSave()` sin añadir paso de historial.

### 10.3 Arranque y entre sesiones
Al iniciar (`init()` en `js/35-icons-help-touch.js`): se aplican las preferencias (acento, barra, muestras) →
`loadSaved()` lee `board.json` (o `localStorage`) → `loadBoard()` migra y pinta (si no hay nada o falla, carga el tablero de
bienvenida `seed()`: un recorrido con globos, textos, comentario, tarea con subtareas y paleta) → `persist()` registra el espacio en recientes → `wsCheckAuto()` avisa si el autoguardado en archivo
necesita permiso. El resultado: **al volver a abrir la app aparece exactamente el último espacio abierto**, con su vista.
El historial de deshacer empieza vacío en cada sesión.

### 10.4 Espacios de trabajo
Cada tablero tiene un **id interno** (`board.wsId`, se crea al cargar si falta). El espacio se identifica por ese id, no por
el título ni por el nombre del archivo.
- **Nuevo espacio**: guarda el actual en recientes y abre uno vacío (el foco va al título).
- **Recientes**: hasta 15, ordenados por fecha, con tiempo («hace 5 min»), nº de nodos, **peso** (KB, o MB desde 1024 KB) y
  nombre de archivo si está vinculado. Un espacio vacío y sin nombre que se abandona no queda en la lista.
- **Abrir un reciente**: guarda el actual, abre la **copia de la app**. Si tiene archivo vinculado: sin permiso → copia de
  la app; archivo perdido → pregunta si abrir la última copia; archivo más reciente que la copia → pregunta cuál cargar.
- **Quitar de la lista** elimina la copia en la app (no toca el archivo en disco).
- **Vincular de nuevo** (icono de enlace) asocia otro archivo a un espacio.

### 10.5 Guardar, Guardar como y Abrir archivo
- **Guardar (Ctrl+S)**: si el espacio tiene archivo vinculado, **escribe en ese mismo archivo** (con permiso de escritura en
  navegadores). Si no, abre el diálogo de guardado con el título como nombre (`<título>.json`; sin título, `esquema.json`).
- **Guardar como…**: siempre abre el diálogo; el espacio pasa a vincularse con el **archivo nuevo** (el antiguo queda
  intacto) y el autoguardado seguirá escribiendo en el nuevo.
- **Abrir archivo…**: lee un `.json` y lo abre como **espacio nuevo** (con su archivo vinculado). Excepción: si ese archivo
  **ya está vinculado a un espacio**, no se crea otro; se abre ese mismo espacio con el contenido del archivo (conserva su
  autoguardado) y avisa. Si es el espacio que ya tienes abierto y lo único distinto es el **título** o la posición de la
  vista, se abre sin preguntar y conserva el título actual; si hay más diferencias, pregunta antes de recargar.
  En navegadores sin selector de archivos se usa un `<input type="file">` (sin vínculo).
- Al guardar con título vacío la lista muestra «Sin título».
- **Cambiar el título no renombra el archivo**: Guardar y Autoguardado escriben en el mismo archivo con el título nuevo
  dentro; solo *Guardar como…* crea otro archivo (propone `<título nuevo>.json`).

### 10.6 Autoguardado en archivo
Botón **Autoguardado** del menú de espacios: cada guardado de sesión reescribe además el archivo vinculado.
- Requiere archivo vinculado; si no hay, pide elegirlo (si se cancela, no se activa).
- **No escribe con 0 nodos** (para no vaciar el archivo por error).
- Si falta permiso o el archivo ya no existe, avisa una vez y queda «en pausa» hasta pulsar Guardar.
- Las escrituras se encolan (si llega un cambio mientras se escribe, se repite al terminar).
- Los espacios con autoguardado activo se pueden renombrar sin más: el archivo se actualiza con el nuevo título.

### 10.7 Importar / exportar otros formatos
| Qué | Cómo |
|---|---|
| **Pixel art → PNG** | Menú contextual: Exportar PNG x1 / x8 / x32 (solo la capa de dibujo). |
| **Imagen → PNG/JPEG** | Menú contextual: Guardar como… (formato por extensión). |
| **Paleta → .gpl / PNG** | Inspector de paleta → Archivo. |
| **Paleta ← .gpl** | Importar .gpl (sustituye los colores). |
| **Espacio ↔ .json** | Guardar como… / Abrir archivo… |

### 10.8 Respaldos automáticos (app de escritorio)
- **Dónde**: `%APPDATA%\com.mindforge.app\backups\<id del espacio>\` (`backups_root` en `main.rs`, vía `app_data_dir`).
  Los respaldos antiguos de `<carpeta del programa>\backups` se mueven a esa ruta la primera vez (`migrate_legacy_backups`).
- **Nombre**: `AAAA-MM-DD_HH-MM-SS_<título>.json` (formato idéntico al de *Guardar como…*; se abre con *Abrir archivo…*).
- **Cuándo**: como mucho una copia cada **2 minutos** y solo si el contenido cambió (mover la vista no cuenta), y además al
  pulsar Guardar / Guardar como… con cambios. Al abrir la app o un espacio no se crea copia hasta que haya un cambio real.
  No se copian espacios sin nodos.
- **Cuántas**: las **20 más recientes** por espacio; las antiguas se borran solas.
- Parámetros: `BK_EVERY` y `BK_KEEP` en `js/24-workspaces.js`.

### 10.8b Aviso al cerrar
`fileUnsaved()` (`js/24-workspaces.js`) lee el archivo vinculado (Tauri: `read_file`; navegador: *file handle* con permiso ya concedido) y lo compara con `board` sin `title`, `wsId` ni `view`. Se usa solo si el espacio tiene archivo y `auto` está apagado.
`closeGuard()` muestra el diálogo (Guardar y salir / Salir sin guardar en el archivo / Cancelar). «Salir sin guardar» solo afecta al `.json`: el estado de sesión (`board.json`, copia del espacio) se guarda siempre. Al reabrir el mismo archivo, `adoptBoard` ya avisa de que se pierden los cambios no guardados en él. Tauri: `getCurrentWindow().onCloseRequested` → `preventDefault()` si se cancela (necesita el permiso `core:window:allow-destroy`). Navegador: `beforeunload` con la bandera `fileDirty` (se recalcula tras cada guardado de sesión). No se pudo probar con la app real compilada, solo con un mock de Tauri.

### 10.9 Historial (deshacer / rehacer)
Pila de **120 pasos** en memoria (`hist`, `hi`); cada paso es el JSON de `nodes` + `edges`. `undo()`/`redo()` restauran y
**mantienen la selección** (los nodos que ya no existan se quitan de ella). Hay una barra de progreso del historial.
Cambios que no entran en el historial: vista, título, ajustes de la barra.

### 10.10 Diferencias navegador / app
En un navegador (`window.__TAURI__` ausente): el autoguardado de sesión va a `localStorage`; *Guardar* usa la API de
archivos de Chromium (`showSaveFilePicker`, con *file handles* en IndexedDB) o, sin ella, **descarga** el `.json`; no hay
respaldos, ni zoom general de la interfaz, ni apertura de enlaces nativa (usa `window.open`).

### 10.11 Qué se pierde y qué no
- Cerrar la app **no pierde nada**: el último estado está en `board.json` y las copias de espacios en IndexedDB.
- Desinstalar o actualizar la app no borra los datos del usuario (`%APPDATA%`, WebView2, respaldos).
- Borrar los datos del navegador/WebView borra la lista de espacios, sus copias y las preferencias; los archivos `.json`
  guardados en disco no se tocan.

---

## 11. Idiomas

Español e inglés. El **español es la clave**: los textos están escritos en español en el código y `js/00-i18n.js` contiene
el diccionario inglés (`EN` para textos exactos, `EN_PAT` para mensajes con variables). Un `MutationObserver` traduce el DOM
(texto, `title`, `placeholder`, `aria-label`) al instante; los mensajes creados en tiempo de ejecución usan `t("Texto {0}",
valor)`. El contenido escrito por el usuario nunca se traduce; solo los títulos por defecto (Comentario, Tarea, Paleta…) y
los textos por defecto de los nodos nuevos, que se crean en el idioma activo. Primer arranque: inglés.

---

## 12. Parte nativa (Tauri / Rust)

`src-tauri/src/main.rs` expone estos comandos al frontend (`invoke(...)`):

| Comando | Función |
|---|---|
| `save_board(data)` / `load_board()` | Guarda / lee `board.json` en la carpeta de datos de la app. |
| `write_file(path, data)` / `read_file(path)` | Escribe / lee un archivo de texto (guardar, abrir, autoguardado en archivo). |
| `write_bytes(path, data)` | Escribe bytes (exportación de imágenes y PNG). |
| `open_url(url)` | Abre un enlace `http(s)` en el navegador predeterminado (rechaza otros esquemas). |
| `backup_board(id, name, stamp, data, keep)` | Guarda un respaldo y rota los antiguos (§10.8). |

Plugins: `tauri-plugin-dialog` (abrir/guardar) y `tauri-plugin-opener`. Permisos de la ventana
(`src-tauri/capabilities/default.json`): `core:default`, `dialog:default`, `core:webview:allow-set-webview-zoom`.
Configuración: `tauri.conf.json` (ventana 1400×900, mínimo 1000×600, `frontendDist: ../src`, arrastrar-soltar nativo
desactivado para que funcione el de la página, `bundle.targets: all`).

---

## 13. Límites y consideraciones

- Las imágenes se guardan **dentro** del JSON como *data URL* (base64): un tablero con muchas imágenes pesa mucho (se ve en
  la lista de recientes) y cada guardado reescribe todo.
- `localStorage` tiene un tope (≈5 MB) que afecta solo al navegador; en la app, el tablero va a archivo.
- Los espacios recientes están limitados a 15; al salir de la lista se elimina su copia en la app (no el archivo).
- Dos espacios que apuntan al mismo archivo no se crean (se reutiliza el existente); aun así, si el archivo se edita desde
  fuera mientras hay autoguardado, la app lo sobrescribe.
- La app de escritorio no está probada con pruebas automáticas dentro de Tauri: las pruebas de desarrollo se hacen en un
  navegador sin cabeza con un Tauri simulado (ver la guía de desarrollo).
