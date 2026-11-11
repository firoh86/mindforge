# MindForge — Guía de desarrollo

Guía **para quien programa la aplicación**: dónde está cada mecánica en el código, cómo se hacen los cambios habituales y
qué trampas conviene conocer. Para el comportamiento visto desde fuera, consulta
[`DOCUMENTACION-TECNICA.md`](DOCUMENTACION-TECNICA.md); para las reglas de plegado y grupos,
[`../MANUAL-JERARQUIA-Y-GRUPOS.md`](../MANUAL-JERARQUIA-Y-GRUPOS.md).

## Índice

1. [Entorno y comandos](#1-entorno-y-comandos)
2. [Estructura del proyecto](#2-estructura-del-proyecto)
3. [Modelo de ejecución del frontend](#3-modelo-de-ejecución-del-frontend)
4. [Mapa de mecánicas → código](#4-mapa-de-mecánicas--código)
5. [Recetas: cómo añadir o cambiar cosas](#5-recetas-cómo-añadir-o-cambiar-cosas)
6. [Convenciones y trampas](#6-convenciones-y-trampas)
7. [Probar los cambios](#7-probar-los-cambios)
8. [Compilar y publicar](#8-compilar-y-publicar)
9. [Checklist antes de dar algo por terminado](#9-checklist-antes-de-dar-algo-por-terminado)

---

## 1. Entorno y comandos

Requisitos (una sola vez): Node.js 18+, Rust (rustup) y las dependencias de sistema de Tauri (en Windows: WebView2 y las
Build Tools de C++).

```bash
npm install                        # instala @tauri-apps/cli
npm run tauri icon app-icon.png    # genera src-tauri/icons (solo la primera vez o si cambia el icono)
npm run dev                        # tauri dev: ventana de desarrollo (cambios de src/ al recargar)
npm run build                      # instaladores en src-tauri/target/release/bundle/
npm test                           # tests automáticos (antes, una vez: npx playwright install chromium)
npm run fonts                      # (con internet) descarga las fuentes a src/assets/fonts y genera css/00-fonts.css
```

- **Cambios solo en `src/` (HTML/CSS/JS)**: basta recargar la ventana de `tauri dev` (o abrir `src/index.html` en el
  navegador para pruebas rápidas; sin Tauri las funciones de archivo usan la API del navegador).
- **Cambios en `src-tauri/` (Rust, `tauri.conf.json`, permisos)**: hay que **reiniciar** `tauri dev` y volver a compilar
  para el instalador.
- Un permiso nuevo del webview va en `src-tauri/capabilities/default.json`.

## 2. Estructura del proyecto

```
mindforge/
├─ README.md                    # visión general, uso y notas de funciones (documento principal)
├─ MANUAL-JERARQUIA-Y-GRUPOS.md # manual de plegado, grupos y conexiones con nodos ocultos
├─ docs/
│   ├─ DOCUMENTACION-TECNICA.md # cómo funciona la app (interfaz, nodos, datos, guardado)
│   └─ GUIA-DESARROLLO.md       # este documento
├─ CLAUDE.md                    # reglas y checklist obligatoria por sesión (para Claude / colaboradores)
├─ package.json                 # scripts: tauri / dev / build / test / fonts
├─ tests/                       # tests automáticos (node --test + Playwright): helpers.js, *.test.js
├─ scripts/fetch-fonts.mjs      # descarga fuentes → src/assets/fonts + css/00-fonts.css
├─ app-icon.png                 # icono fuente (se convierte con `tauri icon`)
├─ src/                         # FRONTEND (lo que sirve Tauri: frontendDist = "../src")
│   ├─ index.html               # solo marcado + enlaces a css/ y js/
│   ├─ assets/icons/            # octopus.svg (logo/acento), palette.svg (rueda)
│   ├─ css/   01-theme … 12-wheel          # cascada en orden numérico
│   └─ js/    00-i18n … 35-icons-help-touch # scripts clásicos, el orden importa
└─ src-tauri/                   # NATIVO (Rust)
    ├─ src/main.rs              # comandos: save/load_board, write/read_file, write_bytes, open_url, backup_board
    ├─ tauri.conf.json          # ventana, bundle, frontendDist
    ├─ capabilities/default.json# permisos de la ventana
    ├─ Cargo.toml · build.rs · icons/
    └─ target/                  # compilación (no se edita)
```

### 2.1 Archivos CSS (orden de cascada)
`01-theme` variables y tema · `02-layout` barra y escenario · `03-bar-dropdowns` desplegables · `04-swatches` muestras ·
`05-canvas` lienzo y aristas · `06-nodes` nodos (el más grande) · `07-panels` inspectores · `08-format-bar` barra de
formato · `09-menus-dialogs` menús y diálogos · `10-pixel` pixel art · `11-crop` recorte · `12-wheel` rueda de color **y el
bloque final que unifica el estilo de todos los menús flotantes**.

### 2.2 Archivos JS
| Archivo | Responsabilidad |
|---|---|
| `00-i18n` | Idiomas EN/ES, `t()`, traducción del DOM. |
| `01-state` | Constantes (`GRID`, `SIZE`, `FONTS`…), biblioteca de paletas, objeto `board`, `sel`, `UI`, `els`, helpers (`get`, `snap`, `nh`, `esc`). |
| `02-color` | Conversiones de color, `fg`/`inkFor` (tinta por luminancia), `adaptNode`, `genPalette`. |
| `03-history` | `commit`, `undo`/`redo`, `scheduleSave`, `persist`, `loadSaved`. |
| `04-ui-utils` | `toast`, `dialog`, `copyText`, `toWorld`, `hoverTip`. |
| `05-view` | `applyView`, `zoomAt`, `fit`, rueda del ratón. |
| `06-links` | Enlaces: `nodeUrl`, `openUrl`, enlaces pegados con sobrenombre. |
| `07-render` | `mkNode` (crea el DOM), `applyNode` (aplica el estado), `setSel`, `renderAll`. |
| `08-edges` | Geometría de conexiones (`route`, `rounded`, `edgeOffsets`, `edgeSideKeys`). |
| `08a-tree` | Jerarquía y plegado (`treeCompute`, `setFold`, `hiderOf`), Tab / Ctrl+Enter. |
| `08b-groups` | Grupos de cuadro de texto (miembros, bloqueo, contraer). |
| `09-edge-thickness` | `renderEdges()` (dibuja todas las flechas, etiquetas, virtuales y tramos con bola). |
| `10-create-delete` | `addNode`, `deleteSelection`, `duplicate`, `toFront/toBack`. |
| `11-images` | Imágenes: añadir, reescalar, exportar, visor. |
| `12-text-edit` · `12a-subtasks` | Edición de texto; subtareas. |
| `13-pixel-art` | Nodo pixel art: RLE, herramientas, tile, exportación. |
| `14-pointer` | **Todas** las interacciones de puntero (mover, escalar, conectar, selección, doble clic). |
| `15-context-menu` | Menús contextuales y búsqueda de nodos. |
| `16-bar-color` | Muestras y aplicación de color. |
| `17-text-format` | Barra de formato de texto. |
| `18-palette-inspector` · `18a-palette-files` | Nodo paleta, inspector, .gpl/PNG, «Mis paletas». |
| `19-pixel-inspector` · `20-eyedropper` · `31-pixel-tools` | Panel y atajos de pixel art; cuentagotas. |
| `21-keyboard` | Teclado y portapapeles (pegar). |
| `22-dock-theme` · `22a-ui-zoom` | Acople de la barra, tema, acento; zoom general. |
| `23-import-export` | `loadBoard` (validación y migración), título del espacio. |
| `24-workspaces` | Espacios, recientes, Guardar/Guardar como/Abrir, autoguardado en archivo, respaldos. |
| `25-buttons` … `33-bar-responsive` | Botones, paneles flotantes, pipeta rápida, rueda de color, recorte, barra responsive. |
| `33a-minimap` | Minimapa: dibujo, clic para centrar, mover y escalar el panel (`mmRender`, `mmGoto`). |
| `33b-export-view` | Exportar la vista a PNG (menú ×0,5 / ×1 / ×1,5; clon de `#world` → SVG `foreignObject` → canvas). |
| `34-init` | Tablero de bienvenida del primer arranque (`seed`); sus textos usan `t()` y están en `EN`. |
| `35-icons-help-touch` | Iconos, ayuda, táctil y **`init()`** (arranque). |

## 3. Modelo de ejecución del frontend

- **Scripts clásicos con ámbito global**: no hay `import`/`export`. Lo que un archivo declara con `const`/`let`/`function`
  lo ven los posteriores. Por eso el **orden de `<script>` en `index.html` es el contrato**: usar algo declarado en un
  archivo posterior solo funciona si se llama *después* de la carga (dentro de una función o un evento), nunca al evaluar el
  archivo.
- **Estado único**: `board` (documento), `sel` (`Set` de ids seleccionados), `selEdge`, `UI` (preferencias), `els`
  (`Map` id → elemento), `PX` (estados de los pixel art), `hist`/`hi` (historial).
- **Modelo → DOM**: el modelo manda. Cambiar un nodo = modificar su objeto y llamar a `applyNode(n)`; cambiar conexiones o
  jerarquía = `renderEdges()`. Para reconstruir todo, `renderAll()`.
- **Persistir**: `commit()` tras un cambio que deba poder deshacerse; `scheduleSave()` si solo hay que guardar (vista,
  tamaños automáticos). `persist()` guarda ya (úsalo antes de cambiar de espacio).
- **Asincronía**: `invoke(...)` y los diálogos son `async`. Las funciones que los usan devuelven promesas.

## 4. Mapa de mecánicas → código

### 4.1 Nodos
| Mecánica | Dónde |
|---|---|
| Crear un nodo (tamaños, valores por defecto, hijo con conexión) | `addNode` en `10-create-delete.js`; `SIZE`, `DEF`, `DEFFS`, `COLORABLE` en `01-state.js` |
| Construir el DOM de cada tipo | `mkNode` en `07-render.js` (un bloque por tipo) |
| Aplicar color, tamaño, estado visual | `applyNode` en `07-render.js`; `adaptNode`/`inkFor` en `02-color.js` |
| Globo: tamaño mínimo según el texto (`bubbleFit`), crecer al editar, límites al escalar | `07-render.js`, `12-text-edit.js` (`startEdit`), `14-pointer.js` (`resize`) |
| Altura automática de texto/comentario/tarea | `autoH`, `nh` en `01-state.js`; `nodeRO` (ResizeObserver) en `07-render.js` |
| Editar texto | `startEdit` en `12-text-edit.js` |
| Formato de texto (fuente, B/I/U) | `17-text-format.js` (`fmtToggle`), `LF`/`rememberFmt` en `01-state.js` |
| Tarea y subtareas | `12a-subtasks.js` (`syncTaskFromSubs`, `renderSubs`) |
| Imagen: añadir, recortar, exportar | `addImageFile`, `exportImage` (`11-images.js`); `startCrop`/`endCrop` (`30-crop-visual.js`) |
| Paleta: chips, vistas, ordenar | `renderPalette` y `pal*` en `18-palette-inspector.js`; `genPalette` en `02-color.js` |
| Paleta: .gpl, PNG, Mis paletas | `18a-palette-files.js` |
| Pixel art: RLE, herramientas, tile | `13-pixel-art.js` (`rleEnc/rleDec`, `pxDown/pxMove/pxUp`, `pxTile`), `31-pixel-tools.js`, `19-pixel-inspector.js` |
| Duplicar, traer al frente / enviar al fondo | `duplicate`, `toFront`, `toBack` |
| Eliminar (con aviso de grupo) | `deleteSelection` |

### 4.2 Conexiones, jerarquía y grupos
| Mecánica | Dónde |
|---|---|
| Dibujar todas las flechas (etiquetas partidas, virtuales, tramos con bola) | `renderEdges` en `09-edge-thickness.js` |
| Ruta ortogonal y esquinas redondas | `route` (`routeZ` por defecto), `rounded` en `08-edges.js` |
| Esquivar nodos (A* sobre una rejilla de coordenadas, caché `ROUTE_CACHE`, `AVOID_*`) | `avoidRoute`, `edgeObstacles`, `route(p,q,{A,B})` en `08-edges.js`; botón `#avoidBtn` en `25-buttons.js`; `board.avoid` |
| Reparto de anclajes en un lado (3 tipos de extremo) | `edgeOffsets`, `edgeSideKeys`, `sidePoint` en `08-edges.js` |
| Dirección y jerarquía (padre/hijo) | `ePar`/`eChi`, `treeMaps` en `08a-tree.js` |
| Qué queda oculto y quién lo oculta | `treeCompute`, `rescue`, `hiderOf` en `08a-tree.js` (`HID`, `HBY`, `HCOUNT`, `FCOUNT`) |
| Plegar rama | `setFold`, `toggleFold`, botón `.fbtn` en `08a-tree.js` |
| Hijo/hermano con teclado | `addChild`, `addSibling` en `08a-tree.js` |
| Grupos: miembros, bloqueo, contraer | `08b-groups.js` (`groupAll`, `members`, `toggleGroupCollapse`, `nestOK`) |
| Grosor y «Ver principal» | `applyEdgeW`, `EDGE_W_*` en `09-edge-thickness.js`; `toggleMainOnly` en `25-buttons.js` |
| Crear nodo arrastrando con clic derecho desde una bolita | `drag.type="rlink"` en `14-pointer.js`; `linkMenu` en `15-context-menu.js` |

### 4.3 Interacción
| Mecánica | Dónde |
|---|---|
| Mover, escalar, conectar, recuadro de selección, pan, doble clic | `14-pointer.js` (`pointerdown` / `pointermove` / `pointerup`, `drag.type`) |
| Selección | `setSel` en `07-render.js` |
| Teclado, atajos y pegado | `21-keyboard.js` |
| Zoom y desplazamiento de la vista | `05-view.js` |
| Menú contextual | `showMenu`, y los `contextmenu` en `15-context-menu.js` |
| Menús y paneles flotantes (posición) | `26-float-panels.js`, `28-panel-bounds.js` |

### 4.4 Datos y guardado
| Mecánica | Dónde |
|---|---|
| Objeto `board` y preferencias `UI` | `01-state.js` |
| Historial, `commit`, guardado diferido, `persist` | `03-history.js` |
| Validar y migrar un documento | `loadBoard` en `23-import-export.js` |
| Título del espacio | `23-import-export.js` (`titleIn`, `fileBase`) |
| Espacios, recientes, IndexedDB, índice | `24-workspaces.js` (`WSDB`, `wsIndex`, `wsUpsert`, `wsSync`) |
| Guardar / Guardar como / Abrir archivo | `saveWs`, `importFile`, `adoptBoard`, `wsFindByFile` en `24-workspaces.js` |
| Autoguardado en archivo | `wsAutoFile`, `setWsAuto`, `wsCheckAuto` en `24-workspaces.js` |
| Respaldos | `wsBackup` (JS, `BK_EVERY`, `BK_KEEP`) y `backup_board`/`backup_into`/`backups_root` (Rust; carpeta en `%APPDATA%`) |
| Aviso al cerrar | `fileUnsaved`, `closeGuard`, `onCloseRequested` en `js/24-workspaces.js` |
| Fuentes / PNG | `scripts/fetch-fonts.mjs`, `css/00-fonts.css`, `fontsCss()` en `js/33b-export-view.js` |
| Arranque | `init()` en `35-icons-help-touch.js`; ejemplo en `34-init.js` |
| Comandos nativos | `src-tauri/src/main.rs` |

### 4.5 Interfaz y estilo
| Mecánica | Dónde |
|---|---|
| Barra: acople, tema, acento | `22-dock-theme.js`; variables en `css/01-theme.css` |
| Barra responsive y muestras | `33-bar-responsive.js`, `16-bar-color.js` |
| Rueda de color | `29-color-wheel.js` |
| Estilo común de menús/paneles/diálogos | `--float-bg`, `--float-shadow` en `css/01-theme.css` + bloque final de `css/12-wheel.css` |
| Diálogos y avisos | `dialog`, `toast` en `04-ui-utils.js` |
| Textos e idiomas | `00-i18n.js` |
| Iconos, ayuda, táctil | `35-icons-help-touch.js` |

## 5. Recetas: cómo añadir o cambiar cosas

### 5.1 Un tipo de nodo nuevo
1. `01-state.js`: añade su tamaño a `SIZE` (y a `DEF`, `DEFFS`, `COLORABLE` si lleva color/texto).
2. `07-render.js` → `mkNode`: añade el bloque de HTML del tipo y, si hace falta, la inicialización posterior; en `applyNode`,
   el estado visual.
3. `10-create-delete.js` → `addNode`: valores iniciales específicos (como `palette`/`pixel`).
4. `15-context-menu.js`: la entrada «＋ …» del menú de fondo (y la de `linkMenu` en `15` para crear desde una bolita) y las
   entradas propias del nodo.
5. `css/06-nodes.css`: estilos del tipo.
6. Si guarda datos nuevos: ver 5.2. Si es dibujable en `renderEdges`/hierarquía, comprobar `DASH_TYPES` (`09`).
7. `23-import-export.js` → `loadBoard`: validar sus campos.
8. Documentación: §4 de la técnica + README.

### 5.2 Un campo nuevo persistente (en un nodo o en el tablero)
1. Asígnalo en el objeto (`n.campo = …`) y llama a `commit()` (o `scheduleSave()` si no debe entrar en el historial).
2. **Tolera su ausencia**: los documentos antiguos no lo tienen. Pon el valor por defecto donde se lee.
3. En `loadBoard` (`23-import-export.js`): si es del tablero, cópialo al nuevo `board = {…}` (como `edgeW`, `mainOnly`); si es
   de un nodo, validalo en el bucle de migración.
4. Si cambia el significado de datos viejos, **sube `v`** y añade el bloque `if (!d.v || d.v < N)` de migración.
5. Si afecta a lo que compara «Abrir archivo» (misma estructura salvo título/vista), recuerda que `adoptBoard` compara todo el
   documento excepto `title`, `wsId` y `view`.
6. Documenta el campo en §9 de la técnica.

### 5.3 Un texto nuevo en la interfaz
Escríbelo **en español** en el código/HTML y añade su traducción a `EN` en `00-i18n.js`. Con variables: `t("Texto {0}", x)` y,
si el mensaje se construye con plantillas, un patrón en `EN_PAT`. No traduzcas contenido del usuario. Los textos por defecto
de nodos se crean con `t()` al construir el nodo (el `MutationObserver` no entra en `.node .content`).

### 5.4 Una entrada en el menú contextual
En `15-context-menu.js`, dentro del `contextmenu` del lienzo, añade `{ label: "…", fn: () => … }` al listado del contexto
correspondiente (fondo, nodo por tipo, conexión). `"-"` es un separador. Pon el texto en español y tradúcelo (§5.3).

### 5.5 Un botón en la barra o en el lienzo
Marcado en `index.html` (con `title`; los botones auxiliares de arriba a la derecha van en los bloques `.fabcol` de `#fabcols`), icono en `35-icons-help-touch.js` (`IC` + `setIcon`), manejador en `25-buttons.js`
(o en el archivo del tema). Si va en la barra, comprueba el comportamiento **vertical** y estrecho (`33-bar-responsive.js`).

### 5.6 Un menú o panel flotante nuevo
Añade su selector al **bloque final de `css/12-wheel.css`** (junto a `#modal .box`, `#fmt`, `#cropbar`…) para heredar fondo,
borde, radio y sombra comunes. Para posicionarlo, usa `placeFixed`/`positionFmt` (`26`, `28`) y respeta el z-index de los
tooltips (500, por encima de la rueda de color y de los menús).

### 5.7 Un diálogo
`await dialog("Mensaje", { input, value, yes, alt, outside })` (`04-ui-utils.js`). Devuelve `true`/`false`; con `input`,
el texto o `null`; con `alt`, `"alt"` si se pulsa el segundo botón. `outside: true` cancela con clic fuera.

### 5.8 Un comando nativo (Rust)
1. `src-tauri/src/main.rs`: función con `#[tauri::command]` y añádela a `generate_handler![…]`.
2. Si necesita un permiso/plugin, ajústalo en `capabilities/default.json` y `Cargo.toml`.
3. Llama desde JS con `invoke("nombre", { …argumentos en camelCase… })` (solo existe `invoke` dentro de Tauri; en
   navegador es `null`, así que prevé el *fallback*).
4. Reinicia `tauri dev`.

### 5.9 Un atajo de teclado
En el `keydown` de `21-keyboard.js`, antes de los casos genéricos. Respeta los guardas de edición (`isContentEditable`,
`INPUT`) y usa `e.target` para saber de dónde viene la tecla. Añádelo a la ayuda (`index.html`) y a la tabla de controles.

### 5.10 Un valor numérico ajustable
Las constantes de comportamiento están arriba de su archivo: `GRID`, `SIZE` (`01`), `EDGE_W_MIN/MAX/DEFAULT` (`09`), `HIST_MAX`
(`03`), `BK_EVERY`/`BK_KEEP`/`WS_MAX` (`24`), `GROUP_DWELL`/`GROUP_UNLOCK` (`08b`), `TREE_GAP_*` (`08a`), `--ui` (`css/01`).

### 5.11 Cambiar algo de jerarquía o grupos
Lee antes el manual. El cálculo está **centralizado** en `treeCompute()`; la parte gráfica está en `renderEdges()`. Cualquier
cambio debe mantener la regla del padre visible (`rescue`) y la tabla de casos del manual.

## 6. Convenciones y trampas

- **`commit()` vs `scheduleSave()`**: `commit()` añade un paso de historial **y** guarda; hacerlo en cada `pointermove`
  llenaría el historial. Dentro de un arrastre, usa `scheduleSave()` y `commit()` al soltar.
- **`renderEdges()` es la fuente de verdad del dibujo de flechas**: se regenera el SVG entero. Si guardas referencias al DOM de
  una flecha, se pierden (por eso el doble clic de conexiones se detecta por posición en `14-pointer.js`).
- **`treeRefresh()` se ejecuta dentro de `renderEdges()`** y recalcula `HID` (ocultos); no leas `HID` antes de que se haya
  renderizado tras un cambio.
- **`setSel` repinta todo** (`applyNode` en cada nodo y `renderEdges`); llámalo solo cuando cambie la selección. `restore()`
  del historial conserva la selección.
- **Ids**: `uid()` → 7 caracteres; no deben contener nada que rompa selectores (se usan en `data-*` y `querySelector`).
- **`noEdit: true`** en `addNode` evita entrar en edición al crear (imágenes, pegar texto…).
- **Imágenes** en `board.images`, referenciadas por `n.img`: al duplicar/borrar nodos, las imágenes no se limpian solas.
- **No pongas lógica pesada en `persist()`**: se ejecuta tras cada ráfaga de cambios; los respaldos ya tienen su propia
  limitación (`BK_EVERY`).
- **Cuidado con el HTML de usuario**: `n.html` se guarda y se vuelve a pintar con `innerHTML`; todo lo que no venga del
  propio editor debe pasar por `esc()`.
- **Tauri vs navegador**: `TAURI`/`invoke` pueden ser `undefined`; prevé siempre una rama sin Tauri.
- **Rutas de Windows** con `\`: para el nombre de archivo usa `split(/[\\/]/).pop()`.
- **Estilo de código**: comillas dobles, punto y coma, `const`/`let`, comentarios en español explicando el *porqué*.

## 7. Probar los cambios

### 7.0 Suite automática (`npm test`)
`tests/*.test.js` (runner `node --test`, Playwright de Node). `tests/helpers.js` ofrece `launch({ tauri, ui, root })`: levanta un
servidor estático de `src/`, abre Chromium sin Google Fonts, captura `pageerror` (cada archivo comprueba que no hay ninguno) y,
con `tauri: true`, inyecta un mock de `window.__TAURI__` (sistema de archivos `FS`, cola de diálogos `NEXT`, `CLOSE` = manejador
de `onCloseRequested`). Archivos: `app.test.js` (UI, burbuja, minimapa, flechas, exportación), `workspaces.test.js` (guardado,
archivo vinculado, aviso al cerrar), `fonts.test.js` (script de fuentes e incrustación en el PNG). **Cada función nueva o bug
corregido lleva su test** (ver `CLAUDE.md`).

### 7.1 Pruebas sueltas
Para explorar a mano también sirve **Playwright** (Python o Node) en un navegador sin cabeza cargando
`src/index.html` directamente. Esquema habitual:

```python
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 900})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))       # errores de JS
    pg.route('**/fonts.g*/**', lambda r: r.abort())                    # sin Google Fonts
    pg.goto('file:///ruta/a/src/index.html'); pg.wait_for_timeout(500)
    # cargar un documento a medida y trabajar con las funciones globales
    pg.evaluate('(d)=>loadBoard(d)', {"v": 5, "nodes": [...], "edges": [...]})
    print(pg.evaluate('()=>({n: board.nodes.length, hidden: [...HID]})'), errs)
```

- Se puede llamar a cualquier función global desde `pg.evaluate` (`addNode`, `setFold`, `renderEdges`, `saveWs`…).
- Para comprobar la imagen, `pg.screenshot(path=...)`.
- **Simular Tauri** (guardado, archivos, respaldos): inyecta antes de cargar la página un `window.__TAURI__` con
  `core.invoke` (un sistema de archivos en un objeto) y `dialog.save/open` (que devuelven rutas guardadas en una cola):

```python
INIT = '''
window.FS = {}; window.NEXT = [];
window.__TAURI__ = { core: { invoke: async (c, a) => {
    if (c === "write_file") { FS[a.path] = a.data; return }
    if (c === "read_file")  { if (!(a.path in FS)) throw new Error("no existe"); return FS[a.path] }
    if (c === "save_board") { FS.__app__ = a.data; return }
    if (c === "load_board") { return null }
    if (c === "backup_board") { return "/x" }
    return null } },
  dialog: { save: async () => NEXT.shift() || null, open: async () => NEXT.shift() || null } };
'''
pg.add_init_script(INIT)
```
  Cuidado con `pg.evaluate` sobre funciones que esperan un diálogo (`importFile`, `saveWs`): envuélvelas en
  `()=>{ funcion() }` para no esperar a la promesa y pulsa después los botones (`#mYes`, `#mNo`).
- Para la **parte Rust**, la lógica pura (`backup_into`, `clean_name`) se puede probar en un proyecto `cargo` aparte copiando
  esas funciones; `rustfmt --check` valida la sintaxis. La app completa solo se compila con `npm run dev` / `npm run build`.

Casos a probar según la zona tocada:

| Zona | Qué comprobar |
|---|---|
| Jerarquía/grupos | Las matrices del manual (§11): plegar, contraer, dos padres, flecha doble, miembros ocultos. |
| Conexiones | Texto partido, flechas virtuales, tramos con bola y reparto de anclajes con varios tipos de extremo. |
| Guardado | Guardar con/sin título, autoguardado con cambio de título, Guardar como, Abrir el mismo archivo (con y sin cambios), respaldos (límite y detección de cambios). |
| Datos | `loadBoard` con documentos antiguos (`v` bajo, campos ausentes). |
| Teclado | Que Enter/Esc en campos (título, diálogos) no activan atajos del lienzo. |
| Idioma | Cambiar a EN y revisar textos nuevos, avisos y diálogos. |

## 8. Compilar y publicar

1. Actualiza `version` en `package.json`, `src-tauri/Cargo.toml` y `src-tauri/tauri.conf.json` (los tres deben coincidir).
2. Cambia la versión visible de la ayuda **solo en la versión de lanzamiento**: `index.html`, `h4.hfirst` (`RubiEdition V…`).
3. `npm run build`. Los instaladores quedan en `src-tauri/target/release/bundle/`: `nsis\*.exe` (por defecto instala para
   el usuario, en `%LOCALAPPDATA%\MindForge`) y `msi\*.msi`. El ejecutable suelto: `target/release/mindforge.exe`.
4. Si cambió el icono: `npm run tauri icon app-icon.png` antes de compilar.
5. Los respaldos están en `%APPDATA%\com.mindforge.app\backups`, fuera de la instalación: actualizar o desinstalar no los borra.
6. Para fuentes locales (y en el PNG), ejecuta `npm run fonts` antes de compilar y commitea `src/assets/fonts` y `src/css/00-fonts.css`.

## 9. Checklist antes de dar algo por terminado

- [ ] `npm test` pasa y el cambio tiene su test.
- [ ] Funciona sin errores en consola (`pageerror`) y en los dos idiomas.
- [ ] Un documento **antiguo** sigue cargando (campos nuevos opcionales; migración si cambia el sentido de un dato).
- [ ] Deshacer/rehacer revierten el cambio sin perder la selección ni el foco.
- [ ] Se guarda y se recupera tras cerrar y abrir la app (y, si toca archivos, con y sin Tauri).
- [ ] Textos nuevos en español **y** traducidos en `00-i18n.js`.
- [ ] Estilo coherente con los demás menús/diálogos (bloque común de `css/12-wheel.css`).
- [ ] Barra horizontal, vertical y estrecha siguen bien si se tocó la barra.
- [ ] Documentación actualizada: **README** (resumen de la función), **`DOCUMENTACION-TECNICA.md`** (comportamiento y datos),
      **esta guía** (si cambia dónde está el código o cómo se hace) y el **manual** si afecta a jerarquía/grupos.
