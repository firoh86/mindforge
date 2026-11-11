# MindForge — editor de esquemas de escritorio (Tauri v2)

Globos, cuadros de texto, comentarios plegables, conexiones ortogonales con flecha, modo oscuro,
zoom con la rueda, rejilla magnética, colores y escalado desde las esquinas. Todo se guarda en local.

## Requisitos (una sola vez)
1. Node.js 18+  →  https://nodejs.org
2. Rust  →  https://rustup.rs
3. Dependencias del sistema de Tauri  →  https://tauri.app/start/prerequisites/
   (Windows: WebView2 + Build Tools de C++; Linux: webkit2gtk, etc.)

## Uso
```bash
npm install
npm run tauri icon app-icon.png   # genera src-tauri/icons (solo la primera vez)
npm run dev                       # modo desarrollo
npm run build                     # instalador en src-tauri/target/release/bundle/
npm run fonts                     # (opcional, con internet) fuentes locales: ver nota más abajo
npm test                          # tests automáticos (ver «Tests»)
```

## Documentación

| Documento | Para qué sirve |
|---|---|
| [`docs/DOCUMENTACION-TECNICA.md`](docs/DOCUMENTACION-TECNICA.md) | Cómo funciona la aplicación: interfaz y barra, espacios de trabajo, cada tipo de nodo en detalle, conexiones, estructuras de datos, **guardado y manejo de documentos entre sesiones**, idiomas y parte nativa. |
| [`docs/GUIA-DESARROLLO.md`](docs/GUIA-DESARROLLO.md) | Guía para programar: estructura del proyecto, mapa «mecánica → archivo y función», recetas (nuevo tipo de nodo, campo persistente, textos, menús…), trampas y pruebas. |
| [`MANUAL-JERARQUIA-Y-GRUPOS.md`](MANUAL-JERARQUIA-Y-GRUPOS.md) | Manual de plegado, grupos y conexiones con nodos ocultos. |

Este README es la visión general y las notas de uso de cada función; el detalle técnico vive en `docs/`.

## Qué incluye

- **Nodos**: globo (crece al escribir y no se reduce por debajo de su texto), cuadro de texto, comentario plegable, tarea (con subtareas), paleta de color, imagen (con recorte) y pixel art.
- **Conexiones** ortogonales con flecha (uno o dos sentidos), texto en la flecha y grosor ajustable; jerarquía con ramas plegables y **grupos** de cuadros de texto.
- **Espacios de trabajo** con lista de recientes, archivos `.json` vinculados, autoguardado y respaldos automáticos (ver «Guardado y documentos»).
- **Texto**: 4 fuentes (Inter, Playfair Display, Montserrat, JetBrains Mono), tamaño, negrita, cursiva, subrayado y enlaces con sobrenombre.
- **Color**: tema Notebook claro/oscuro, color de acento (pulpo de la barra), barra de muestras, rueda de color, pipeta (Shift+clic) y paletas de hasta 50 colores con biblioteca (Pear36, Lospec, consolas clásicas), «Mis paletas» y archivos `.gpl`/PNG.
- **Pixel art**: lienzo X×Y, lápiz, goma, cubo, cuentagotas, selección (cuadrado, lazo, varita), 2 capas, punta circular/cuadrada, modo tile, fondo translúcido para calcar y exportación PNG x1 / x8 / x32.
- **Vista**: minimapa, exportación de la vista a PNG (con recorte y 3 resoluciones) y flechas que esquivan nodos.
- **Interfaz**: barra acoplable (horizontal/vertical), zoom general 100 %/125 %, EN / ES, selección múltiple (Ctrl+clic o clic derecho + arrastrar) y menús flotantes con un estilo común.

> **Fuentes**: por defecto se cargan desde Google Fonts (sin conexión se usan fuentes del sistema). Para que la app se vea igual sin internet **y** que las fuentes salgan en el PNG exportado, ejecuta una vez `npm run fonts` (con internet): descarga las fuentes a `src/assets/fonts/`, genera `src/css/00-fonts.css` y quita el enlace a Google del `index.html`. Después vuelve a compilar la app.
> Tras actualizar el proyecto vuelve a generar los iconos si cambian: `npm run tauri icon app-icon.png`
> El detalle de cada función (pixel art, paletas, barra, zoom…) está en `docs/DOCUMENTACION-TECNICA.md`.

## Guardado y documentos

**Todo se guarda solo.** Cada cambio se guarda en unos 0,5 s: en la app, en `%APPDATA%\com.mindforge.app\board.json`; en el navegador, en `localStorage`. Además cada espacio de trabajo guarda una copia propia en la app (recientes), así que cerrar y volver a abrir lo deja todo como estaba.

**Espacios de trabajo** (botón de la barra): cada tablero es un espacio con su **id interno**; el título y el nombre del archivo no lo identifican. La lista de recientes (hasta 15) muestra tiempo, nodos, **peso en KB/MB** y archivo vinculado. Un espacio vacío y sin nombre que se abandona no queda en la lista. «Quitar» borra la copia de la app, no el archivo.

| Acción | Qué hace |
|---|---|
| **Guardar** (Ctrl+S) | Con archivo vinculado, escribe en **ese mismo archivo**; si no, abre el diálogo (`<título>.json`, o `esquema.json` sin título). |
| **Guardar como…** | Siempre pregunta; el espacio pasa a vincularse con el archivo nuevo (el anterior queda intacto). |
| **Abrir archivo…** | Abre un `.json` como espacio nuevo. Si ese archivo ya está vinculado a un espacio, abre **ese** espacio. Si solo cambia el título o la vista, abre sin preguntar y conserva el título actual; si hay más diferencias, pregunta antes de recargar. |
| **Autoguardado** | Reescribe además el archivo vinculado en cada guardado. Requiere archivo; no escribe con 0 nodos; si falta permiso o el archivo no existe, avisa una vez y queda en pausa. |
| **Vincular de nuevo** | Asocia otro archivo a un espacio (icono de enlace). |
| **Respaldos** (solo app) | Copias fechadas automáticas: ver la sección «Respaldos automáticos». |

Cambiar el título **no renombra el archivo**: Guardar y Autoguardado escriben en el mismo archivo con el título nuevo dentro; solo *Guardar como…* crea otro (ver «Renombrar un espacio con archivo vinculado»). **Primer arranque:** se abre un espacio de bienvenida con un pequeño recorrido (nodos, conexiones, tareas, guardado) que puedes editar o borrar. «Borrar nodos» sin nada que borrar muestra un aviso. Deshacer/rehacer (hasta 120 pasos) viven en memoria y no sobreviven a cerrar la app. Más detalle en `docs/DOCUMENTACION-TECNICA.md` §10.

## Nodo de tarea
Una tarea tiene título, texto y un check de estado (pendiente → en progreso → completada, clic o menú contextual).
- **Subtareas**: botón «Añadir subtarea» al pie del nodo o clic derecho → *Añadir subtarea*. Enter guarda y abre otra debajo,
  Shift+Enter hace salto de línea, doble clic edita, la × (al pasar el ratón) elimina, y una subtarea vacía se descarta.
- Cada subtarea solo muestra un **punto de color** alineado a la derecha y centrado en altura (aunque el texto ocupe varias líneas).
  Un clic cicla: **pendiente** (hueco con borde rojo) → **en progreso** (naranja) → **completada** (verde).
  El borde existe siempre (transparente al rellenar), así el punto no cambia de tamaño.
- Con subtareas, el **check principal es de solo lectura**: muestra un anillo con el % de subtareas completadas
  (`n.status` se deriva: 0 % pendiente · avance en progreso · 100 % completada).
- Entre subtareas hay un separador fino que usa el color de texto del nodo. Al plegar el nodo se ocultan.
- Datos: `n.subs = [{ id, t, s }]` con `s` ∈ `todo | doing | done`; se validan al cargar. Código en `js/12a-subtasks.js`.

## Estructura del frontend (`src/`)
```
src/
├─ index.html            # solo el marcado (HTML) + enlaces a css/ y js/
├─ assets/icons/
│   └─ palette.svg       # icono de la rueda de color (misma forma que IC.wheel en js/35)
├─ css/                  # hojas de estilo en orden de cascada (01 → 12)
│   01-theme  02-layout  03-bar-dropdowns  04-swatches  05-canvas  06-nodes
│   07-panels  08-format-bar  09-menus-dialogs  10-pixel  11-crop  12-wheel
└─ js/                   # scripts clásicos que comparten ámbito global; el orden (00 → 35) importa
    00-i18n  01-state  02-color  03-history … 12-text-edit  12a-subtasks … 24-workspaces … 34-init  35-icons-help-touch
```
El mapa completo de qué hace cada archivo está en `docs/GUIA-DESARROLLO.md`.
Cada archivo JS corresponde a una sección del antiguo `index.html` único. `00-i18n.js` va primero
(traducción) y `34-init.js` arranca la app. Tauri sirve toda la carpeta (`build.frontendDist = "../src"`).

## Idiomas (EN / ES)
- El botón **EN | ES** de la barra (junto a «Borrar nodos») cambia el idioma al instante y se guarda en `localStorage`
  (`mindforge-ui` → `lang`). **Primer arranque / instalación nueva: inglés.**
- Los textos en español del código son las *claves*; el diccionario inglés está en `js/00-i18n.js` (`EN` para textos exactos,
  `EN_PAT` para mensajes con variables). Un `MutationObserver` traduce el DOM (textos, `title`, `placeholder`, `aria-label`) y
  el panel de ayuda se traduce por bloques (`data-i18n-html`).
- Para añadir un texto nuevo: escríbelo en español en el código/HTML y añade su traducción a `EN`. Si lleva datos
  variables, usa `t("Texto {0}", valor)` o un patrón en `EN_PAT`.
- El contenido que escribe el usuario (notas, títulos propios) nunca se traduce; solo los títulos por defecto
  (Comentario, Tarea, Paleta…).

## Controles
| Acción | Cómo |
|---|---|
| Crear | Botones ＋ de la barra, doble clic en el fondo, o **clic derecho** sobre la pizarra |
| Editar texto | Doble clic · barra de formato superior (fuente, tamaño, B / I / U) · Ctrl+B/I/U |
| Mover / escalar | Arrastrar · esquinas para escalar (imágenes y pixel art mantienen proporción) |
| Conectar | Arrastrar desde los puntos laterales de un nodo hasta otro · doble clic en la línea = texto |
| Imágenes | ＋ Imagen, arrastrar archivos o **Ctrl+V** · doble clic = visor con zoom |
| Pixel art | Panel derecho al seleccionarlo · atajos B E G I M L (lápiz, goma, cubo, cuentagotas, cuadrado, lazo) · Supr borra la selección |
| Barra de herramientas | Arrastra ⠿ hacia cualquier borde |
| Zoom / mover vista | Rueda / arrastrar el fondo (clic izquierdo) · clic derecho + arrastrar = selección múltiple |
| Atajos | Ctrl+Z/Y, Ctrl+D, Ctrl+A, Ctrl+S, Ctrl+0, flechas |
| Deshacer / rehacer | Ctrl+Z / Ctrl+Shift+Z (o Ctrl+Y). **Mantienen la selección**: con un pixel art activo se puede deshacer trazo a trazo sin que el nodo pierda el foco (los nodos que dejen de existir se quitan de la selección). |

## Árbol: ramas plegables y nodos con teclado
- **Jerarquía**: sale de las conexiones. Los *hijos* de un nodo son los destinos de sus conexiones (origen → destino) y su *padre* es el origen de la que le llega.
- **Tab** crea un **nodo hijo** conectado: el primero va **debajo** del padre (centrado) y los siguientes (hermanos) se añaden **al lado**, a la derecha del último, en la misma fila; busca hueco libre y lo deja en edición. **Ctrl+Enter** crea un **hermano** (hijo del mismo padre, al lado del último). Si el nodo **no tiene padre**, el hermano aparece a su derecha **unido con una flecha en ambos sentidos**; pulsando Enter otra vez se encadena (A ↔ B ↔ C). Los pares unidos con flecha doble **no son jerarquía**: no cuentan como hijos ni para colocar con Tab ni para plegar ramas (un nodo con solo pares no muestra el botón de plegar). **Mayús+Tab** sube al padre. El nodo nuevo hereda tipo de texto (globo, texto, comentario, tarea) y color; los pixel art, paletas e imágenes generan globos. Para un **pixel art** el primer hijo se coloca por debajo de su altura **activa** (con barra de herramientas y pie), para que ni el panel del inspector ni la propia tarjeta al ganar el foco lo tapen.
- **Cambio (actualizado)**: el nodo **hermano** pasa de *Enter* a **Ctrl+Enter** (el mismo atajo que ya valía durante la edición), porque Enter creaba hermanos sin querer al intentar editar cuadros de texto y comentarios. **Enter vuelve a editar** el texto del nodo seleccionado (igual que **F2** o doble clic).
- **Durante la edición**: *Tab* confirma y crea un hijo; *Ctrl+Enter* confirma y crea un hermano (Enter sigue siendo salto de línea).
- **Plegar rama**: botón en la esquina inferior derecha del nodo (aparece al pasar el ratón o al seleccionarlo) o tecla **/** (en los pixel art va a la misma altura pero en el lado **izquierdo**, porque el pincel del pie está a la derecha). Oculta todo lo que cuelga del nodo; el botón pasa a `+N` (nº de nodos ocultos) y queda siempre visible. Pulsar el botón (o plegar con la tecla /) **no activa ni cambia la selección**: funciona igual con los nodos fuera de foco. Un nodo con **dos padres** no es rama directa: al plegar uno de ellos sigue visible mientras el otro lo esté, y si un nodo solo tiene hijos así (nada que ocultar) **no muestra el botón** ni responde a la tecla /; el botón se ajusta solo al cambiar las conexiones. Una rama plegada se **mueve entera** (arrastre y flechas); Tab sobre un nodo plegado lo despliega. Ctrl+A, selección por recuadro, buscador y «Centrar vista» ignoran los nodos ocultos. Dato: `n.fold`; los nodos ocultos llevan la clase `.fhid` (visibility, no display, para no alterar las medidas).
- También en el menú contextual del nodo, que queda ordenado así: *Editar texto · Duplicar · Traer al frente · Enviar al fondo* — *＋ Nodo hijo · ＋ Nodo hermano · Plegar / Desplegar rama* — *Eliminar* (las acciones propias de cada tipo, como las de tarea o imagen, van entre Editar texto y Duplicar). Código: `js/08a-tree.js`.

- **Tamaño de los globos nuevos**: 240 × 64 px (antes 240 × 120), más compacto; se define en `SIZE.bubble` de `js/01-state.js`. Vale para ＋ Globo, Tab y Ctrl+Enter. Los globos ya creados no cambian.
- **Pixel art · fondo translúcido fuera de foco**: arreglado — con el fondo translúcido (calcar) y el nodo sin foco quedaban dos bandas sólidas de 24 y 32 px sobre y bajo el lienzo (restos de la barra de herramientas y del pie). Ahora la franja sólida del cabecero mide 40 px y no hay franja inferior (`.node.pixel.ghost:not(.sel)` en `css/10-pixel.css`).
- **Selección múltiple**: la rueda de color **ya no se cierra** al seleccionar varios nodos (sigue abierta para colorear el grupo). Un **pixel art solo está activo** (herramientas, pie, panel y altura completa) cuando es el **único** nodo seleccionado; con varios seleccionados se queda compacto y no cambia de tamaño. Código: `pxActive(n)` en `js/01-state.js` y clase `.act` en los nodos (las reglas de `css/10-pixel.css` usan `.pixel.act` / `.pixel:not(.act)` en lugar de `.sel`).

## Cuadros de texto: grupos y borde de color
- **Redimensionar hacia arriba y abajo**: los cuadros de texto se pueden estirar con las cuatro esquinas (antes solo cambiaba el ancho). La altura sigue siendo automática, pero con una **altura mínima propia** (`n.uh`) que se fija al arrastrar en vertical: el cuadro puede crecer todo lo que quieras, pero **nunca baja del tamaño del texto** (`textMinH` en `js/07-render.js`, calculado con el ancho resultante), así que nunca colapsa sobre el contenido. Con *Enviar al fondo* sirve como recuadro de **grupo** detrás de otros nodos. Si solo cambias el ancho, la altura sigue al texto.
- **Chip «borde»** en las muestras de la barra, entre *Color del tema* y *Sin relleno*: círculo transparente cuyo aro interior muestra el color del borde. **Solo funciona con cuadros de texto** (con otro nodo avisa con un mensaje). Al aplicarlo (`n.color = "outline"`), el cuadro queda sin relleno con un borde de 2 px; mientras esté en ese modo, **cualquier color que elijas** (muestras, rueda de color, pipeta Shift+clic) cambia el **borde** (`n.bc`) y no el relleno. El borde arranca con el color de relleno que tuviera el cuadro. Para volver al relleno se pulsa *Color del tema* o *Sin relleno*. Sin nada seleccionado, el chip se guarda para los próximos cuadros de texto (los demás tipos lo ignoran). Código: `applyColorTo()` en `js/16-bar-color.js`, clase `.outl` y variable `--nbc` en los nodos.
- **Conexiones de los cuadros de texto**: un cuadro de texto (usado como grupo) **no puede conectarse con flechas a los nodos que tiene dentro** (centro del nodo dentro del rectángulo del cuadro), ni ellos a él; sí puede conectarse con cualquier nodo de fuera, incluidos otros cuadros. Al arrastrar una flecha hacia un nodo interior no se crea y sale un aviso. Los tableros antiguos no se modifican. Código: `insideBox` y `linkOK` en `js/16-bar-color.js`; comprobación en `js/14-pointer.js`.
- **Capas**: los nodos *enviados al fondo* (`n.back`, clase `.back`) quedan en la capa 0, las **flechas en la 1** y el resto de nodos en la 2, así las flechas se ven por encima de un cuadro de texto usado como grupo. *Traer al frente* quita la marca. Código: `toBack`/`toFront` en `js/10-create-delete.js`, reglas `#world > .node` en `css/05-canvas.css`.
- **Contraste adaptativo (oscuro ↔ claro)**: el texto de los nodos con relleno **transparente** (o en modo borde) y las **flechas** se invierten solos según el cuadro de texto de color que tengan debajo: texto/flecha claros (`#f1f5f9`/`#e5e7eb`) sobre fondos oscuros y oscuros (`#0d1117`/`#1f2937`) sobre claros (umbral de contraste, luminancia 0,179). Para el texto se usa el cuadro que queda bajo el centro del nodo; para una flecha, el cuadro **enviado al fondo** bajo su punto medio. Sin cuadro debajo se mantienen los colores del tema; una flecha seleccionada conserva el color de acento. Se recalcula al mover, recolorear o enviar al fondo/frente. Código: `bgUnder`, `inkFor`, `adaptNode`, `queueAdapt` en `js/02-color.js`; `renderEdges` en `js/09-edge-thickness.js` (marcadores `arrL`/`arrD` en `index.html`).

## Grupos de cuadro de texto
- **Unir un nodo a un grupo**: arrastra un nodo hasta que su centro quede **dentro de un cuadro de texto y por delante de él** (un cuadro enviado al fondo siempre lo está) y **mantenlo ~1,2 s**: el cuadro late con un borde de acento discontinuo y, al cumplirse el tiempo, el nodo entra en su grupo (`n.grp`, aviso «Añadido al grupo»). Si el nodo tenía una conexión con ese cuadro, se quita (los cuadros no se conectan con lo que tienen dentro). Un nodo solo pertenece a un grupo; también se pueden anidar cuadros.
- **Salir del grupo**: soltar un miembro con su centro **fuera** del cuadro lo libera («Fuera del grupo»). Un miembro movido dentro del cuadro sigue en el grupo.
- **Mover el cuadro** arrastra con él a **todos los miembros** (y los de grupos anidados), estén o no seleccionados. Al seleccionar el cuadro, sus miembros se marcan con un contorno de puntos.
- **Plegado por ramas**: al plegar la rama del **padre del cuadro** se oculta todo: el cuadro, sus nodos y lo que cuelga de ellos (cuentan en el contador de ocultos). El **botón de plegado del propio cuadro** solo oculta las conexiones que salen de él (p. ej. un nodo fuera del grupo que cuelga del cuadro), **nunca sus nodos** (no se deja el cuadro vacío); si el cuadro solo tiene nodos dentro y ninguna flecha de salida, no muestra botón de plegado. Código: `outR` (conexiones reales) frente a `out` (con miembros) en `treeMaps`/`descendants` de `js/08a-tree.js`.
- **Eliminar un cuadro con grupo**: pregunta **«Eliminar todo el grupo»** (borra cuadro y miembros) o **«Solo el cuadro»** (los miembros quedan libres, o pasan al grupo superior si el cuadro era miembro de otro). La X / clic derecho cancela. **Duplicar** conserva el grupo si se copia entero.
- Código: `js/08b-groups.js` (`joinGroup`, `groupAll`, `dwellCheck`, `releaseOutside`), `treeMaps`/`branchIds` en `js/08a-tree.js`, `deleteSelection` (ahora asíncrona) en `js/10-create-delete.js`, `dialog(msg,{yes,alt})` en `js/04-ui-utils.js`.
- **Candado**: los nodos que forman parte de un grupo muestran un **icono de candado arriba a la izquierda del nodo** (no del cuadro de texto). Mientras estén bloqueados **se pueden activar con un clic pero nunca moverlos** (ni arrastrando ni con las flechas del teclado): solo se mueven con su cuadro de texto. Para **liberarlos**, mantén pulsado el nodo (o el candado) ~1,2 s sin moverlo: el candado se agita y el nodo sale del grupo («Liberado del grupo»); si mueves el ratón o sueltas antes, no pasa nada. Código: `isLocked`, `lockStart`, `lockCancel`, `GLOCK_SVG` en `js/08b-groups.js`; `.glock` en `css/06-nodes.css`.
- **Atrapar nodos con un cuadro enviado atrás**: arrastra un cuadro de texto hasta que quede **detrás de varios nodos** (sus centros dentro del cuadro y por delante de él) y **mantenlo ~1,2 s**: todos esos nodos resaltan con el borde discontinuo y, al cumplirse el tiempo, **entran de golpe en su grupo** («Nodos atrapados en el grupo…»). Solo se atrapan nodos libres (no los que ya están en otro grupo), y se quitan sus conexiones directas con el cuadro. Si el cuadro no tiene nodos debajo, se mantiene el comportamiento anterior (unirse al cuadro sobre el que se suelta).
- **Liberar con un clic**: un **clic directo en el candado** libera el nodo del grupo al instante (mantener pulsado el nodo sigue funcionando). Código: `captureCands`, `captureGroup`, `dwellCheck` en `js/08b-groups.js`; clic en `.glock` en `js/14-pointer.js`.
- **Selección múltiple**: si arrastras **varios nodos seleccionados** sobre un cuadro de texto y los mantienes ~1,2 s, **todos los seleccionados cuyo centro esté dentro del cuadro (y por delante)** se unen al grupo a la vez; los que queden fuera, o ya sean miembros del propio cuadro, no cambian. Un nodo sigue perteneciendo a un solo grupo. Código: `canJoin` y la rama `join` de `dwellCheck` en `js/08b-groups.js`.
- **Liberar varios a la vez**: con varios nodos seleccionados, **mantener pulsado** (o clic en un candado) libera a **todos los seleccionados que estén bloqueados** («Nodos liberados del grupo»); basta pulsar sobre uno de ellos sin mover el ratón. Código: `lockTargets`, `releaseLocked`, `lockStart` en `js/08b-groups.js`.
- **Un miembro nunca queda detrás de su cuadro**: al unirse a un grupo, al *Traer al frente* el cuadro, o al *Enviar al fondo* un miembro, el orden se corrige solo (el miembro queda justo encima del cuadro y pierde la marca «al fondo»), para que no se pierda bajo el relleno del cuadro. Código: `fixGroupOrder` en `js/08b-groups.js`, llamada desde `toFront`/`toBack`.

## Ayuda de grupos y nombre del grupo
- **Botón (i)**: todo cuadro de texto con al menos un nodo en su grupo muestra un **icono de información arriba a la derecha** (mismo estilo que el de los menús). Al dejar el ratón encima ~0,8 s aparece una ayuda por secciones: *Crear un grupo*, *Nodos del grupo*, *Mover y plegar* y *Eliminar y nombre* (`#grpTip` en `index.html`; estilo en `css/06-nodes.css`).
- **Un cuadro con grupo solo lleva su nombre**: una **única línea** de máximo **60 caracteres** (`GROUP_TITLE_MAX`): Enter acaba la edición, el pegado se aplana a una línea y el texto se recorta; se ve con una sola línea y puntos suspensivos. Al convertirse en grupo, su texto existente se reduce a la primera línea (`normGroupBox`); se puede deshacer. Código: `isGroupBox`, `normGroupBox` en `js/08b-groups.js`; edición en `js/12-text-edit.js`.
- **Redimensionar el cuadro**: al soltar el redimensionado, los miembros que queden con su centro **fuera** del cuadro se liberan del grupo automáticamente (`releaseResized` en `js/08b-groups.js`).
- **Contraer un grupo**: un cuadro con grupo tiene un botón **⌄ a la izquierda de la (i)** (o clic derecho → *Contraer grupo*). Al contraerlo **se ocultan los nodos del grupo** y el cuadro se reduce al **ancho de su nombre**, con un **candado con el nº de nodos** que lleva dentro, la flecha de expandir y la (i). Moverlo sigue arrastrando a sus miembros ocultos; al expandir recupera ancho (`n.fw`) y alto. Un cuadro contraído no libera miembros ni acepta nodos nuevos. Código: `n.gcol`, `toggleGroupCollapse` en `js/08b-groups.js`, `.gcount` en `js/07-render.js` / `css/06-nodes.css`, ocultado en `treeCompute` (`js/08a-tree.js`).
- **(i) en cuadros enviados atrás**: un cuadro de texto enviado al fondo muestra el icono de información aunque aún no tenga grupo, para que se descubra el truco. La ayuda general incluye «Grupos: usa un cuadro de texto mandándolo atrás…». *Enviar al fondo / Traer al frente* con varios elementos seleccionados también marca/desmarca `n.back` (antes no lo hacía).
- **Rama con grupos (ejemplo)**: globo → cuadro de grupo (hijo por flecha) con varios nodos dentro, y el cuadro con otro hijo fuera del grupo. Plegar el **globo** oculta cuadro + miembros + hijo externo; plegar el **cuadro** oculta solo el hijo externo; los miembros no se pliegan nunca por sí solos.
- **Recalcular al expandir**: al expandir un grupo, el cuadro recupera su ancho/alto guardados y además se **recalcula para abarcar de nuevo a todos sus miembros** (con margen y la cabecera del nombre libre), de modo que nunca queda estrecho con nodos fuera aunque no se hubiera guardado su tamaño (tableros contraídos antes de esta versión). Código: `refitGroup` en `js/08b-groups.js`; el ancho previo se recuerda también desde `js/07-render.js` (`n.fw`).
- **Sin miembros, deja de ser grupo**: al liberar al último nodo (candado, mantener pulsado, redimensionar o borrar) el cuadro se repinta (`refreshBoxes`): desaparece el botón de contraer, vuelve a admitir texto largo y, si estaba contraído, se expande y recupera su ancho. Si sigue enviado al fondo conserva la (i).
- **Cuadro enviado atrás sin grupo = cuadro de texto normal**: mientras no tenga ningún nodo en su grupo, un cuadro enviado al fondo solo añade el icono (i) (con el texto reservando su espacio para no quedar debajo); admite varias líneas, texto largo y no se puede contraer. Las restricciones de una línea / 60 caracteres y el botón de contraer solo aparecen cuando tiene miembros.

## Dirección de la flecha y jerarquía

El hijo es siempre el nodo al que **apunta** la flecha. Al cambiar la dirección de una conexión (menú contextual: → / ← / ↔) la jerarquía se recalcula al instante: con **←** padre e hijo se intercambian (botones de plegar, nodos ocultos y contadores, Tab y Ctrl+Enter siguen al nuevo padre); con **↔** la conexión deja de ser jerarquía (une pares) y al volver a **→** se restaura. Probado con la cadena A→B→{C,D}.

## Jerarquías con grupos: comportamiento probado
Pruebas automáticas con conexiones entre globos, cuadros de grupo y miembros (`t41.py`):
| Caso | Resultado |
|---|---|
| Padre → cuadro{m1,m2}, cuadro → X | Plegar **padre** oculta cuadro, m1, m2 y X (botón con 4). Plegar **cuadro** oculta solo X (botón con 1). **Contraer** el cuadro oculta m1 y m2. |
| Miembro con hijo fuera (m1 → Y) | Plegar padre oculta todo (incl. Y). Plegar m1 oculta Y. **Contraer el cuadro oculta m1 e Y** (antes Y se quedaba suelto; corregido), y lo mismo con toda la rama de cada miembro. |
| Flecha de fuera hacia un miembro (Z → m1) | m1 sigue visible al plegar Z porque su cuadro lo mantiene visible (un nodo con otro padre visible no se pliega); Z no muestra botón. |
| Miembro → miembro | Sin botón de plegar (el segundo ya cuelga de su cuadro); contraer oculta ambos. |
| Cuadros anidados (G1 ⊃ G2 ⊃ m1) | Plegar el padre oculta todo; contraer G2 oculta solo lo suyo; contraer G1 oculta G2 y todo lo de dentro; arrastrar G1 mueve todo. |
| Cuadro hijo de otro cuadro, con padre propio en un miembro (G1 → G2 ⊃ m2, T2 → m2 → B2) | Plegar G1 oculta G2, m2 **y B2** (lo que cuelga solo del miembro): +3. T2, que está fuera de la rama, se queda visible sin su flecha. (Antes B2 quedaba suelto; corregido.) |
| Cuadro con dos padres | Como cualquier nodo con dos padres: no es plegable desde ninguno mientras el otro esté visible. |
| Cuadro solo con miembros | Sin botón de plegar. |
| Cuadro con flechas: G→Q, R→G, Q↔R | R es el padre de G (y G el de Q); la flecha doble no es jerarquía. Plegar R oculta G, Q y m1. |
| **Tab** en un miembro / en el cuadro | Hijo conectado por flecha, **no entra en el grupo** (sale suelto). En el cuadro el hijo aparece **debajo del cuadro**. |
| **Ctrl+Enter** en un miembro / en el cuadro | Miembro: hermano nuevo unido con flecha doble (sin padre). Cuadro hijo de P: nuevo hijo de P. |
- **Arrastre**: mover un nodo/cuadro arrastra también lo plegado, y con un grupo **contraído** arrastra además lo que cuelga de sus miembros ocultos (`branchIds`, `js/08a-tree.js`).

- **Espacio = centrar la vista en la selección**: con uno o varios nodos seleccionados, **Espacio** centra (y ajusta el zoom, máx. 150 %) la vista sobre ellos, igual que el botón *Centrar vista* con selección. Sin selección no hace nada; no actúa mientras se edita texto. Solo cuenta nodos visibles y usa la altura real de los cuadros de texto. Código: `js/21-keyboard.js`, `fit()` en `js/05-view.js`.

> Los cuadros de ayuda (i) (paleta, píxel, grupo) siempre se muestran por encima de la rueda de color, los menús y los paneles.

## Ordenar los chips de una paleta

El botón **▾** de la cabecera del nodo de paleta (con el nodo seleccionado) abre un menú, preferiblemente hacia arriba para no tapar los chips, con la animación de los demás desplegables. Ordena por tono, saturación, brillo, luminancia, rojo, verde o azul, en sentido ascendente o descendente (✓). Se cierra solo al sacar el ratón (o con Esc / clic fuera). El chip activo sigue a su color y el orden entra en el historial (deshacer).

En el nodo de paleta, tras el título hay un separador vertical y los botones (vista, ordenar, aleatoria, −, +) van alineados a la izquierda, así no se desplazan al cambiar de vista.

## Propagar un nodo desde la bolita de conexión

**Clic derecho sobre una bolita de conexión y arrastrar**: una flecha de **puntos** (en vez de continua o discontinua) sigue al ratón, como si fuese el nodo. Al soltar el clic derecho aparece un menú con los tipos de nodo (globo, cuadro de texto, comentario, tarea, imagen, paleta de color, pixel art); al elegir uno se crea justo donde soltaste, ya como hijo del nodo de origen y con su flecha normal. Si el ratón sale del menú, o se pulsa fuera / Esc, se cancela todo (flecha y menú).

## Ver principal / Ver todo

Interruptor que oculta o muestra las flechas **discontinuas** (las de comentarios, tareas y cuadros de texto) para ver de un vistazo la jerarquía principal. Está en el menú de clic derecho del lienzo, debajo de «Centrar vista» (muestra la acción que hará: «Ver principal» / «Ver todo»), y en un quinto botón arriba a la derecha, junto a «Centrar vista» (resaltado cuando solo se ve lo principal). Solo cambia lo que se dibuja: la jerarquía, los pliegues y los contadores no cambian. Se guarda con el tablero.

En «Ver principal / Ver todo», el título del botón es la acción (Ver principal / Ver todo) y el aviso que aparece abajo describe el resultado («Flechas discontinuas ocultas / visibles»).

El texto de una conexión funciona como un nodo transparente en mitad de la flecha: una flecha llega hasta la etiqueta y otra sale de ella hacia el nodo de destino (con la punta o puntas que correspondan), sin ningún fondo que tape lo de debajo. Es solo dibujo: la jerarquía sigue siendo origen → destino. La flecha se recorta siempre por el rectángulo de la etiqueta (también con tramos cortos), así no hay saltos de aspecto al mover los nodos; el texto se adapta (claro/oscuro) al cuadro de texto coloreado que tenga debajo.

## Minimapa

Botón de mapa (arriba a la derecha). Muestra todos los nodos con una forma simple y su color (globos como píldoras, tareas con tres filas y un tick, imágenes con una carita, pixel art con dos píxeles en diagonal, paletas como cuadrícula 2×2), las conexiones principales con el mismo trazado que las reales y el recuadro de lo que ves ahora. **Clic** en un punto: la vista va allí. **Arrastrar** dentro: mueve el panel; **arrastrar una esquina**: lo escala (con tamaño mínimo). Se recuerda si está abierto y dónde.

## Exportar la vista como PNG

Botón de imagen junto al del minimapa, con menú de dos pasos: primero **Recorte** (un rectángulo que se mueve y escala sobre el lienzo) o **Espacio de trabajo completo** (todo lo visible), y luego la resolución **×0,5 / ×1 / ×1,5**. Las fuentes salen en la imagen si has ejecutado `npm run fonts` (se incrustan desde `assets/fonts`); si no, se sustituyen por otras del sistema.

## Esquivar nodos

Botón junto a «Ver principal» (arriba a la derecha). Activado, las flechas **se pueden pisar entre sí pero rodean los nodos** que haya por medio, buscando el camino con menos esquinas; si el trazado normal no toca ningún nodo, no cambia. Se guarda con el tablero (por defecto desactivado). El slider de grosor de flecha ocupa el ancho de toda la fila de botones y avanza en pasos finos (0,05).

## Grupo contraído: conexiones de fuera

Al contraer un grupo, las flechas **continuas** que llegan desde fuera a un miembro (o salen de él hacia fuera) se dibujan —solo visualmente— hasta el nodo del grupo, con la misma dirección; si varias coinciden se muestran como una sola. Al expandir el grupo vuelven a verse las conexiones reales con cada nodo. Las flechas **discontinuas** (comentarios, tareas, cuadros de texto) simplemente se ocultan. Las conexiones mostradas así conservan su texto (el de la primera que lo tenga), pero no se pueden seleccionar ni editar mientras el grupo esté contraído.

## Un grupo nunca anida otro grupo

Un cuadro de texto que ya tiene miembros no puede bloquearse dentro de otro cuadro, y un nodo que es miembro de un cuadro no puede convertirse en cuadro de grupo (nada puede unirse a él ni ser capturado por él). Un cuadro de texto enviado atrás **sin miembros** sí puede bloquearse como un nodo más dentro de otro cuadro.

## Grosor de las flechas y coherencia de textos

- El slider de grosor de las flechas llega ahora hasta el 60 % de su antiguo recorrido (el máximo anterior, 6, pasa a ser 4: ese 60 % es el nuevo 100 %). Los tableros con un grosor mayor se ajustan al nuevo máximo. El **texto de las flechas escala con el grosor** (12 px en el mínimo, 14 px por defecto, 18 px en el máximo) y su hueco en la flecha se recalcula al mover el slider.
- Revisión de los textos de la aplicación para unificar términos: **Eliminar** para lo que se borra de verdad (nodos, conexiones, colores, paletas guardadas, subtareas) y **Quitar** solo para sacar algo de una lista; **nodo** en vez de «tarjeta»; **Nuevo espacio**; «Luminosidad» en la armonía; en inglés, las opciones de ordenar con mayúscula solo inicial. «Borrar» se mantiene únicamente para borrar píxeles (lápiz, selección).

Los textos por defecto de los nodos nuevos («Nuevo nodo», «Texto», «Escribe tu nota…», «Describe la tarea…») se crean en el idioma seleccionado en ese momento.

## Guardar imagen como…

Clic derecho sobre un nodo de imagen → **Guardar como…**: abre el diálogo de guardado y el formato (**PNG** o **JPEG**) se elige ahí, por el tipo o la extensión del archivo. Exporta la imagen con su recorte actual y a su resolución original (el JPEG se rellena de blanco donde haya transparencia).

## Respaldos automáticos (app de escritorio)

La app instalada guarda **copias de respaldo fechadas** de cada espacio, sin que hagas nada:

- **Dónde**: `%APPDATA%\com.mindforge.app\backups` (así **sobreviven a desinstalar o actualizar** la app), con **una subcarpeta por espacio** (su id interno). Los respaldos de versiones anteriores, que estaban junto al programa (`backups` en la carpeta de instalación), se **mueven solos** a esa ubicación la primera vez.
- **Nombre**: `AAAA-MM-DD_HH-MM-SS_<título>.json` (el mismo formato que «Guardar como…», se puede abrir con *Abrir archivo…*).
- **Cuándo**: como mucho una copia cada **2 minutos** y solo si el contenido cambió (mover la vista no cuenta); además, cada vez que pulsas **Guardar / Guardar como…** y hay cambios. Al abrir la app o un espacio no se crea copia hasta que haya un cambio real. No se copian espacios sin nodos.
- **Cuántas**: se conservan las **20 más recientes** de cada espacio (`BK_KEEP` en `js/24-workspaces.js`; intervalo en `BK_EVERY`).
- Solo en la app de escritorio (en el navegador no hay carpeta de respaldos). Código: `backup_board` en `src-tauri/src/main.rs` (hay que recompilar la app) y `wsBackup()` en `js/24-workspaces.js`.

## Aviso al cerrar con cambios sin guardar

Si el espacio tiene un archivo `.json` vinculado y el **autoguardado está apagado**, al cerrar la app (o la pestaña en el navegador) se compara el archivo con lo que hay en pantalla; si difiere, pregunta **Guardar y salir / Salir sin guardar en el archivo / Cancelar** (la X). Ojo: «Salir sin guardar en el archivo» no descarta nada, porque la app conserva siempre el estado de la sesión (`board.json` en `%APPDATA%`); solo el `.json` vinculado se queda sin esos cambios. Si luego abres ese mismo archivo, la app ya avisa de que recargarlo pierde los cambios no guardados en él. Se ignoran el título y la posición de la vista. Con autoguardado activo o sin archivo vinculado nunca pregunta. Código: `closeGuard()` y `fileUnsaved()` en `js/24-workspaces.js`; en la app usa `onCloseRequested` (permiso `core:window:allow-destroy`).

## Tests

`npm install` y, una sola vez, `npx playwright install chromium`. Después `npm test` ejecuta `tests/*.test.js` (Node + Playwright, sin internet): bienvenida y traducción, botones, burbuja, minimapa, flechas que esquivan nodos (y rendimiento), exportar PNG (recorte, fuentes), espacios/guardado/archivo vinculado, aviso al cerrar y el script de fuentes. Ver `docs/GUIA-DESARROLLO.md` §7. Las reglas de trabajo para cada sesión de desarrollo están en `CLAUDE.md`.

## Renombrar un espacio con archivo vinculado

Un espacio de trabajo se identifica por su **id interno**, no por el título ni por el nombre del archivo. Cambiar el título **nunca renombra el archivo** en disco:

- **Guardar (Ctrl+S)** o **Autoguardado**: escriben en el **mismo archivo** (p. ej. `workspace1.json`) con el título nuevo dentro. No se crea ningún archivo nuevo.
- **Guardar como…**: propone `<título nuevo>.json`; al guardar, el espacio pasa a vincularse con el **archivo nuevo** (el autoguardado seguirá escribiendo ahí) y el archivo antiguo queda tal como estaba, sin tocar.
- En la lista de espacios se ve el título actual y, junto a él, el nombre del archivo vinculado, que puede no coincidir con el título.
- Sin guardar, el archivo en disco conserva el título antiguo; la copia de la app (recientes) ya lleva el nuevo.
- Con título vacío, la lista muestra «Sin título» y «Guardar como…» propone `esquema.json`.
- Con **0 nodos** el autoguardado no escribe (el archivo no se vacía por error).
- **Abrir un archivo que ya está vinculado** a un espacio no crea otro: se abre ese mismo espacio con el contenido del archivo (conserva su autoguardado) y avisa «Archivo ya vinculado: se abrió su espacio». Si ese espacio es el que ya tienes abierto y **lo único distinto es el título** (o la posición de la vista), se abre sin preguntar y **se mantiene el título actual** (el archivo no se toca hasta que guardes). Si hay más diferencias, pregunta antes de recargar desde el archivo (se perderían los cambios que no estén en él). Un archivo distinto sigue abriéndose como espacio nuevo. Se compara por ruta (Tauri) o por el propio archivo (`isSameEntry`, navegadores Chromium).
- **Peso en la lista de recientes**: cada espacio muestra, junto al tiempo, los nodos y el archivo, su **peso en KB** (en MB a partir de 1024 KB). Es el tamaño de la copia guardada en la app (JSON compacto, imágenes incluidas), que se actualiza en cada guardado; los espacios guardados antes de esta versión lo muestran tras su próximo guardado. El archivo exportado ocupa algo más porque se escribe con sangrías.
- **Enter en el título** confirma el nombre sin empezar a editar el texto del nodo que haya seleccionado.

## Enlaces pegados con sobrenombre

Al **pegar una dirección** (`https://…` o `www.…`) en un nodo de texto en edición, aparece el aviso **«¿Quieres dar un nombre a este enlace?»** con una línea de texto, el botón **Aceptar** y la **X** arriba a la derecha:

- **Enter o Aceptar**: el enlace se muestra en **azul** con el sobrenombre en lugar de la dirección.
- **X, Esc o clic fuera del aviso**: se cancela y la dirección se queda escrita, en azul.
- **Sobrenombre vacío + Aceptar**: el enlace vuelve a mostrar la dirección.
- **Doble clic** sobre el enlace (dirección o sobrenombre): reabre el aviso para reeditarlo.
- Al dejar el ratón sobre un enlace con sobrenombre aparece encima un pequeño rectángulo redondeado con la **dirección real** (colores invertidos respecto al tema).
- El **botón de enlace** del nodo sigue abriendo el navegador en la dirección real, con o sin sobrenombre.
- Tras el aviso se vuelve a la edición del texto con el cursor justo detrás del enlace. El enlace es un bloque (se borra entero con la tecla de borrar).
- Textos de los avisos en español e inglés. Solo se convierte en enlace lo que se **pega** entero como una dirección; las direcciones escritas a mano siguen funcionando con el botón de enlace como siempre.

> 📖 Todas las reglas de plegado, grupos y conexiones con nodos ocultos están reunidas, a modo de manual, en [`MANUAL-JERARQUIA-Y-GRUPOS.md`](MANUAL-JERARQUIA-Y-GRUPOS.md).

## Conexiones con nodos ocultos (tramo con bola)

Si un nodo visible está conectado con un nodo que ahora está oculto (por una rama plegada o un grupo contraído que no es el suyo), la conexión se muestra como un **tramo que sale del nodo visible y llega casi hasta el nodo que lo oculta** (el nodo plegado o el grupo contraído; así se ve la relación directa) y **termina en una bola** (en vez de una punta de flecha): señala que ahí hay nodos ocultos. Si la conexión tenía texto, el texto se mantiene visible en mitad del tramo. Si la flecha apuntaba al nodo visible, conserva su punta en ese extremo. No se dibuja el tramo en la propia rama plegada del nodo (ahí ya está el botón +N), y los tramos hacia varios nodos ocultos del mismo grupo se unifican en uno. Si no se puede saber qué nodo lo oculta, el tramo es corto y apunta hacia donde estaría el oculto. En el reparto de puntos de anclaje de cada lado hay ahora **tres tipos de extremo** (con punta de flecha, sin ella y con bola): cada tipo recibe su propio punto, ordenado según la posición del otro nodo, para que el tramo con bola no se solape con las flechas normales. El tramo en sí es solo visual (no se selecciona), pero **su texto sí se puede editar** con doble clic, como el de cualquier flecha.
