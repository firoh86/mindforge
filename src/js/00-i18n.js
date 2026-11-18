"use strict";
/* =====================  Idiomas (EN / ES)  =====================
   La aplicación está escrita en español: los textos en español son las
   "claves" del diccionario. En inglés, todo texto (HTML estático, tooltips,
   toasts, diálogos, menús…) se traduce al vuelo con un MutationObserver, y se
   restaura al volver a español. Idioma por defecto: inglés (primer arranque).
   El idioma elegido se guarda en localStorage "mindforge-ui" → { lang }. */
let LANG = "en";
try {
  if (JSON.parse(localStorage.getItem("mindforge-ui") || "{}").lang === "es") LANG = "es";
} catch (_) {}

/* ---- Diccionario ES → EN (coincidencia exacta, espacios normalizados) ---- */
const EN = {
  /* Barra superior */
  "Arrastra hacia cualquier borde para mover la barra": "Drag towards any edge to move the bar",
  "Cambiar el color de acento de la aplicación": "Change the application accent color",
  "Sin título": "Untitled",
  "Título del espacio de trabajo (clic para editar)": "Workspace title (click to edit)",
  "Espacios de trabajo recientes": "Recent workspaces",
  "Espacios de trabajo": "Workspaces",
  "Recientes": "Recent",
  "Muestras": "Swatches",
  "Muestras de color": "Color swatches",
  "Mostrar todas las muestras": "Show all swatches",
  "Mostrar menos muestras": "Show fewer swatches",
  "Color del tema": "Theme color",
  "Sin relleno": "No fill",
  "Rueda de color": "Color wheel",
  "Eliminar todos los nodos": "Delete all nodes",
  "Cambiar tema": "Toggle theme",
  "Cambiar a modo claro": "Switch to light mode",
  "Cambiar a modo oscuro": "Switch to dark mode",
  "Alejar": "Zoom out",
  "Acercar": "Zoom in",

  /* Flotantes */
  "Imán a la rejilla": "Snap to grid",
  "Imán a la rejilla: activado": "Snap to grid: on",
  "Imán a la rejilla: desactivado": "Snap to grid: off",
  "Deshacer (Ctrl+Z)": "Undo (Ctrl+Z)",
  "Rehacer (Ctrl+Y)": "Redo (Ctrl+Y)",
  "Centrar vista": "Center view",
  "Grosor de las flechas": "Arrow thickness",
  "Historial de cambios": "Change history",
  "Ayuda": "Help",

  /* Ayuda (HTML completo por elemento) */
  "Crear y editar": "Create and edit",
  "<b>Clic derecho</b> (o pulsación larga en táctil) sobre el lienzo: añade globos, textos, comentarios, tareas, imágenes, paletas o pixel art. Sobre un elemento: editar, duplicar, orden y eliminar.":
    "<b>Right-click</b> (or long-press on touch) on the canvas: add bubbles, texts, comments, tasks, images, palettes or pixel art. On an element: edit, duplicate, order and delete.",
  "<b>Doble clic</b> edita el texto, amplía una imagen o pone texto a una conexión.":
    "<b>Double-click</b> edits the text, enlarges an image or adds text to a connection.",
  "<b>Ctrl+V</b> pega imágenes o texto; el texto con enlaces añade un botón ↗.":
    "<b>Ctrl+V</b> pastes images or text; text with links adds a ↗ button.",
  "Conectar y organizar": "Connect and organize",
  "Arrastra desde los <b>puntos laterales</b> de un elemento hasta otro para conectarlos.":
    "Drag from the <b>side dots</b> of an element to another one to connect them.",
  "Las <b>esquinas</b> escalan (un globo no baja del tamaño de su texto). Arriba a la derecha tienes <b>Imán</b> (rejilla), <b>Centrar vista</b>, <b>Minimapa</b>, <b>Exportar vista</b>, <b>Deshacer</b>, <b>Rehacer</b>, <b>Ver principal</b> y <b>Esquivar nodos</b>.":
    "The <b>corners</b> resize (a bubble never gets smaller than its text). At the top right you have <b>Snap</b> (grid), <b>Center view</b>, <b>Minimap</b>, <b>Export view</b>, <b>Undo</b>, <b>Redo</b>, <b>Main only</b> and <b>Avoid nodes</b>.",
  "<b>Minimapa:</b> clic en un punto para ir allí; arrástralo para moverlo y escálalo por las esquinas. <b>Exportar vista</b> guarda un PNG (×0,5, ×1 o ×1,5) del espacio completo o de un recorte.":
    "<b>Minimap:</b> click a point to go there; drag it to move it and resize it from the corners. <b>Export view</b> saves a PNG (×0.5, ×1 or ×1.5) of the whole workspace or of a crop.",
  "<b>Esquivar nodos:</b> las flechas rodean los nodos que se interpongan (pueden cruzarse entre sí).":
    "<b>Avoid nodes:</b> arrows route around nodes in their way (they may still cross each other).",
  "<b>Ctrl + clic</b> suma o quita elementos; <b>clic derecho + arrastrar</b> sobre el fondo selecciona con un recuadro.":
    "<b>Ctrl + click</b> adds or removes elements; <b>right-click + drag</b> on the background selects with a box.",
  "<b>Modo organizar:</b> con más de un elemento seleccionado se cierran los menús, la rueda y los paneles, el pixel art no se edita y las imágenes no se amplían. Clic derecho ofrece solo acciones para el grupo. Sales al borrar, al deseleccionar o al pulsar la barra.":
    "<b>Organize mode:</b> with more than one element selected, menus, the wheel and panels close, pixel art can't be edited and images aren't enlarged. Right-click offers only group actions. You leave it by deleting, deselecting or clicking the bar.",
  "Moverse por el lienzo": "Moving around the canvas",
  "Arrastra el fondo para desplazar; <b>rueda</b> o pellizco para zoom.":
    "Drag the background to pan; <b>wheel</b> or pinch to zoom.",
  "Color": "Color",
  "Elige una muestra para el elemento seleccionado (o el próximo). <b>Rueda de color</b> (en color de acento mientras está abierta) abre el selector avanzado. El botón » muestra todas las muestras.":
    "Pick a swatch for the selected element (or the next one). <b>Color wheel</b> (shown in the accent color while open) opens the advanced picker. The » button shows all swatches.",
  "<b>Shift + clic</b> sobre otro elemento o un chip de paleta copia su color y lo aplica a la selección de una vez.":
    "<b>Shift + click</b> on another element or a palette chip copies its color and applies it to the selection in one go.",
  "Clic derecho (o pulsación larga) en una muestra propia la elimina.":
    "Right-click (or long-press) on one of your own swatches deletes it.",
  "Pixel art": "Pixel art",
  "<b>Varita mágica</b> (W): un clic selecciona los píxeles contiguos del mismo color; <b>Shift + clic</b> suma otra zona. Arrastra la selección para moverla, <b>Ctrl+X</b> o <b>Supr</b> la borran y el clic derecho la quita.":
    "<b>Magic wand</b> (W): one click selects the contiguous pixels of the same color; <b>Shift + click</b> adds another area. Drag the selection to move it, <b>Ctrl+X</b> or <b>Del</b> erase it and right-click clears it.",
  "El botón junto al título abre los espacios recientes: cambia de tablero sin importar a mano, crea uno nuevo o abre un archivo. Cada cambio se guarda solo en la app.":
    "The button next to the title opens recent workspaces: switch boards without importing by hand, create a new one or open a file. Every change is saved automatically in the app.",
  "<b>Guardar</b> (Ctrl+S) escribe el espacio en su archivo; <b>Guardar como…</b> elige otro. Con <b>Autoguardado</b> activo (en color de acento) el archivo se sobrescribe solo en cada cambio, siempre que haya al menos un nodo. Al abrir un espacio vinculado se comprueba el archivo y se avisa si se movió o borró.":
    "<b>Save</b> (Ctrl+S) writes the workspace to its file; <b>Save as…</b> picks another one. With <b>Autosave</b> on (in the accent color) the file is overwritten on every change, as long as there is at least one node. When opening a linked workspace the file is checked and you're warned if it was moved or deleted.",
  "Atajos": "Shortcuts",
  "Plegar rama": "Collapse branch",
  "Sin relleno con borde de color (solo cuadros de texto)": "No fill with a colored border (text boxes only)",
  "Solo funciona con cuadros de texto": "Only works with text boxes",
  "Añadido al grupo (se quitó su conexión con el cuadro)": "Added to the group (its connection to the box was removed)",
  "Añadido al grupo del cuadro de texto": "Added to the text box's group",
  "Crear un grupo": "Create a group",
  "Nodos del grupo": "Group nodes",
  "Mover y plegar": "Move and fold",
  "Eliminar y nombre": "Delete and name",
  "<b>Cuadro de grupo:</b> envía un cuadro de texto al fondo (clic derecho → Enviar al fondo) para usarlo como grupo. <b>Un nodo:</b> arrástralo hasta que su centro quede dentro del cuadro y mantenlo ~1 s; el cuadro late y el nodo entra en el grupo.": "<b>Group box:</b> send a text box to the back (right click → Send to back) to use it as a group. <b>One node:</b> drag it until its center is inside the box and hold ~1 s; the box pulses and the node joins the group.",
  "<b>Varios nodos:</b> selecciónalos y haz lo mismo: entran todos los que estén dentro del cuadro.": "<b>Several nodes:</b> select them and do the same: all the ones inside the box join.",
  "<b>Cuadro enviado atrás:</b> arrastra un cuadro hasta cubrir varios nodos y mantenlo ~1 s: los atrapa a todos. Un nodo solo pertenece a un grupo.": "<b>Box sent to the back:</b> drag a box until it covers several nodes and hold ~1 s: it traps them all. A node belongs to only one group.",
  "<b>Candado:</b> los nodos del grupo muestran un candado arriba a la izquierda. Se pueden activar con un clic, pero no moverse solos.": "<b>Lock:</b> group nodes show a lock at the top left. They can be activated with a click, but cannot be moved on their own.",
  "<b>Siempre encima:</b> un nodo del grupo nunca queda por detrás de su cuadro.": "<b>Always on top:</b> a group node never ends up behind its box.",
  "<b>Liberar:</b> clic en el candado, o mantén pulsado el nodo ~1 s. Con varios seleccionados se liberan todos los bloqueados. Soltar un nodo fuera del cuadro también lo libera. Al redimensionar el cuadro, los nodos que queden fuera se liberan.": "<b>Release:</b> click the lock, or press and hold the node ~1 s. With several selected, all the locked ones are released. Dropping a node outside the box also releases it. Resizing the box releases the nodes left outside it.",
  "<b>Contraer:</b> el botón ⌄ del cuadro (o clic derecho → Contraer grupo) oculta los nodos del grupo y deja el cuadro del ancho de su nombre, con un candado que indica cuántos nodos lleva dentro. Se expande con la misma flecha.": "<b>Collapse:</b> the box's ⌄ button (or right click → Collapse group) hides the group's nodes and shrinks the box to the width of its name, with a lock showing how many nodes it holds. The same arrow expands it.",
  "<b>Mover:</b> al arrastrar el cuadro viajan con él todos los nodos del grupo.": "<b>Move:</b> dragging the box carries all the group's nodes with it.",
  "<b>Plegar:</b> al plegar la rama del padre del cuadro se oculta todo: el cuadro, sus nodos y lo que cuelga de ellos. El botón de plegado del propio cuadro solo oculta las conexiones que salen de él, nunca sus nodos.": "<b>Fold:</b> folding the branch of the box's parent hides everything: the box, its nodes and whatever hangs from them. The box's own fold button only hides the connections leaving it, never its nodes.",
  "<b>Conexiones:</b> un cuadro no se conecta con flechas a los nodos que tiene dentro.": "<b>Connections:</b> a box cannot be connected by arrows to the nodes inside it.",
  "<b>Eliminar el cuadro:</b> pregunta si quieres eliminar todo el grupo o solo el cuadro (los nodos quedan libres).": "<b>Deleting the box:</b> asks whether to delete the whole group or only the box (the nodes are released).",
  "<b>Nombre:</b> un cuadro con grupo solo admite una línea corta de texto, el nombre del grupo (máx. 60 caracteres).": "<b>Name:</b> a box with a group only accepts one short line of text, the group's name (max. 60 characters).",
  "Ayuda de los grupos": "Group help",
  "Fuera del grupo": "Left the group",
  "<b>Espacio</b> centra la vista sobre los elementos seleccionados (como el botón Centrar vista).": "<b>Space</b> centers the view on the selected elements (like the Center view button).",
  "<b>Grupos:</b> usa un cuadro de texto mandándolo atrás (clic derecho → Enviar al fondo) para usarlo como grupo: arrastra nodos encima y mantenlos ~1 s.": "<b>Groups:</b> use a text box by sending it to the back (right click → Send to back) as a group: drag nodes onto it and hold ~1 s.",
  "Contraer grupo": "Collapse group",
  "Expandir grupo": "Expand group",
  "Expandir el grupo": "Expand the group",
  "Contraer el grupo (oculta sus nodos)": "Collapse the group (hides its nodes)",
  "1 nodo en el grupo": "1 node in the group",
  "Contraer o expandir el grupo": "Collapse or expand the group",
  "Liberado del grupo": "Released from the group",
  "Nodos liberados del grupo": "Nodes released from the group",
  "Un nodo de un grupo no puede quedar por detrás de su cuadro de texto": "A node in a group cannot go behind its text box",
  "Nodos atrapados en el grupo del cuadro de texto": "Nodes trapped in the text box's group",
  "Bloqueado en un grupo: clic en el candado (o mantén pulsado el nodo) para liberarlo; se mueve con su cuadro de texto": "Locked in a group: click the lock (or press and hold the node) to release it; it moves with its text box",
  "Este cuadro de texto tiene un grupo de nodos. ¿Eliminar todo el grupo o solo el cuadro de texto (los nodos del grupo quedan libres)?": "This text box has a group of nodes. Delete the whole group or only the text box (the group's nodes are released)?",
  "Eliminar todo el grupo": "Delete the whole group",
  "Solo el cuadro": "Only the box",
  "Un cuadro de texto no puede conectarse con los nodos que tiene dentro": "A text box cannot be connected to the nodes inside it",
  "Borde de color para los próximos cuadros de texto": "Colored border for the next text boxes",
  "Plegar rama (/)": "Collapse branch (/)",
  "Desplegar rama (/)": "Expand branch (/)",
  "＋ Nodo hijo (Tab)": "＋ Child node (Tab)",
  "＋ Nodo hermano (Ctrl+Enter)": "＋ Sibling node (Ctrl+Enter)",
  "<b>Tab</b> crea un nodo hijo conectado · <b>Ctrl+Enter</b> un hermano (mismo padre) · <b>Mayús+Tab</b> sube al padre · <b>Enter</b>, <b>F2</b> o doble clic edita. Editando: <b>Tab</b> hijo, <b>Ctrl+Enter</b> hermano.":
    "<b>Tab</b> creates a connected child node · <b>Ctrl+Enter</b> a sibling (same parent) · <b>Shift+Tab</b> goes up to the parent · <b>Enter</b>, <b>F2</b> or double-click edits. While editing: <b>Tab</b> child, <b>Ctrl+Enter</b> sibling.",
  "<b>/</b> o el botón de la esquina pliega / despliega la rama: oculta todo lo que cuelga del nodo y muestra cuántos quedan ocultos (+N). Una rama plegada se mueve entera.":
    "<b>/</b> or the corner button collapses / expands the branch: it hides everything hanging from the node and shows how many are hidden (+N). A collapsed branch moves as a whole.",
  "<b>Ctrl+Z / Ctrl+Y</b> deshacer / rehacer · <b>Ctrl+D</b> duplicar · <b>Supr</b> eliminar · <b>Esc</b> cierra paneles.":
    "<b>Ctrl+Z / Ctrl+Y</b> undo / redo · <b>Ctrl+D</b> duplicate · <b>Del</b> delete · <b>Esc</b> closes panels.",
  "La barra se acopla arrastrando el asa ⠿. Todo se guarda solo; <b>Exportar / Importar</b> están en Archivo.":
    "The bar docks by dragging the ⠿ handle. Everything is saved automatically; <b>Export / Import</b> are under File.",

  /* Recorte y formato */
  "Recortar: mueve las esquinas · Intro = aplicar · Esc = cancelar": "Crop: move the corners · Enter = apply · Esc = cancel",
  "✓ Aplicar": "✓ Apply",
  "✕ Cancelar": "✕ Cancel",
  "Fuente": "Font",
  "Tamaño de letra (px)": "Font size (px)",
  "Negrita (Ctrl+B)": "Bold (Ctrl+B)",
  "Cursiva (Ctrl+I)": "Italic (Ctrl+I)",
  "Subrayado (Ctrl+U)": "Underline (Ctrl+U)",

  /* Inspector de paletas */
  "Carga paletas de color o genera una en base a los controles de armonía.": "Load color palettes or generate one from the harmony controls.",
  "Paleta de color": "Color palette",
  "Título": "Title",
  "Crear paleta": "Create palette",
  "Carga una paleta desde la biblioteca. Sustituye los colores actuales del nodo.": "Load a palette from the library. Replaces the node's current colors.",
  "Biblioteca de paletas": "Palette library",
  "Regla matemática con la que se calculan los colores a partir del matiz base (análogos, tríada, degradado, etc.).": "Mathematical rule used to compute the colors from the base hue (analogous, triad, gradient, etc.).",
  "Armonías": "Harmonies",
  "Análogos": "Analogous",
  "Monocromática": "Monochromatic",
  "Complementarios": "Complementary",
  "Tríada": "Triad",
  "Tétrada": "Tetrad",
  "Complementario dividido": "Split complementary",
  "Degradado": "Gradient",
  "Arcoíris": "Rainbow",
  "Pastel": "Pastel",
  "Color de partida de la armonía, de 0° a 360° (rojo → amarillo → verde → cian → azul → magenta). Regenera la paleta.": "Starting color of the harmony, from 0° to 360° (red → yellow → green → cyan → blue → magenta). Regenerates the palette.",
  "Matiz base": "Base hue",
  "Intensidad del color base, de 0 (gris) a 100 (color puro). Regenera la paleta.": "Intensity of the base color, from 0 (gray) to 100 (pure color). Regenerates the palette.",
  "Saturación": "Saturation",
  "Luminosidad del color base, de 0 (negro) a 100 (blanco). Regenera la paleta.": "Lightness of the base color, from 0 (black) to 100 (white). Regenerates the palette.",
  "Luminosidad": "Lightness",
  "Cantidad de colores de la paleta, de 2 a 50. Regenera la paleta.": "Number of colors in the palette, from 2 to 50. Regenerates the palette.",
  "Nº de colores (máx. 50)": "No. of colors (max. 50)",
  "Genera una paleta con valores aleatorios. Sustituye la actual.": "Generates a palette with random values. Replaces the current one.",
  "Aleatoria": "Random",
  "Vuelve a generar la paleta con los valores de arriba. Descarta los cambios manuales y los ajustes.": "Regenerates the palette with the values above. Discards manual changes and adjustments.",
  "↻ Regenerar": "↻ Regenerate",
  "Ajustar paleta actual": "Adjust current palette",
  "Desplaza el tono de todos los colores a la vez (-180° a +180°). Funciona con cualquier paleta. Al soltar se confirma y el slider vuelve a 0.": "Shifts the hue of all colors at once (-180° to +180°). Works with any palette. On release it is confirmed and the slider returns to 0.",
  "Tono": "Hue",
  "Sube o baja la saturación de todos los colores a la vez (-100 a +100). Al soltar se confirma y el slider vuelve a 0.": "Raises or lowers the saturation of all colors at once (-100 to +100). On release it is confirmed and the slider returns to 0.",
  "Aclara u oscurece todos los colores a la vez (-50 a +50). Al soltar se confirma y el slider vuelve a 0.": "Lightens or darkens all colors at once (-50 to +50). On release it is confirmed and the slider returns to 0.",
  "Color seleccionado": "Selected color",
  "Copia al portapapeles el código HEX del color marcado.": "Copies the HEX code of the selected color to the clipboard.",
  "⧉ Copiar HEX": "⧉ Copy HEX",
  "Copia al portapapeles todos los colores de la paleta.": "Copies all the palette colors to the clipboard.",
  "⧉ Copiar todos": "⧉ Copy all",
  "Añade un color nuevo a la paleta (máximo 50).": "Adds a new color to the palette (maximum 50).",
  "＋ Añadir": "＋ Add",
  "Elimina de la paleta el color marcado.": "Removes the selected color from the palette.",
  "− Eliminar": "− Delete",
  "Guarda el color marcado en la barra de colores para usarlo en otros elementos.": "Saves the selected color to the color bar to use it on other elements.",
  "＋ A la barra": "＋ To the bar",
  "Aplica el color a los demás elementos seleccionados (Ctrl+clic para seleccionar varios)": "Applies the color to the other selected elements (Ctrl+click to select several)",
  "Aplicar color": "Apply color",
  "Cargar de la biblioteca…": "Load from library…",
  "Consolas clásicas": "Classic consoles",

  /* Inspector de pixel art */
  "Atajos de teclado": "Keyboard shortcuts",
  "Lienzo": "Canvas",
  "Ancho (px)": "Width (px)",
  "Alto (px)": "Height (px)",
  "Aplicar": "Apply",
  "Capas": "Layers",
  "Capa 1 · mostrar fondo (no se exporta)": "Layer 1 · show background (not exported)",
  "Fondo = color actual": "Background = current color",
  "Cuadrícula": "Grid",
  "Limpiar capa de dibujo": "Clear drawing layer",
  "Exportar PNG": "Export PNG",
  "⭳ Exportar PNG": "⭳ Export PNG",
  "Atajos · Pixel art": "Shortcuts · Pixel art",
  "Restablecer": "Reset",
  "Aceptar": "OK",
  "Este archivo ya está abierto en este espacio. ¿Volver a cargarlo desde el archivo? Se perderán los cambios que no hayas guardado en él.": "This file is already open in this workspace. Reload it from the file? Changes you haven't saved to it will be lost.",
  "Archivo ya vinculado: se abrió su espacio": "File already linked: its workspace was opened",
  "¿Quieres dar un nombre a este enlace?": "Do you want to give this link a name?",
  "Cerrar": "Close",
  "Herramientas del nodo": "Node tools",
  "Dibujo": "Drawing",
  "Selección": "Selection",
  "Punta, transparencia y tile": "Tip, transparency and tile",
  "Información extra": "Extra info",
  "<b>Cuadrado</b> <span class=\"tk\" data-k=\"marquee\"></span>: arrastra para seleccionar un recuadro.": "<b>Square</b> <span class=\"tk\" data-k=\"marquee\"></span>: drag to select a box.",
  "<b>Cuentagotas</b> <span class=\"tk\" data-k=\"picker\"></span>: toma el color de un píxel y lo pone como color activo.": "<b>Eyedropper</b> <span class=\"tk\" data-k=\"picker\"></span>: picks a pixel's color and makes it the active color.",
  "Botones y funciones nuevas": "New buttons and features",
  "<b>Cuentagotas</b> <span class=\"tk\" data-k=\"picker\"></span> y <b>Cuadrado</b> <span class=\"tk\" data-k=\"marquee\"></span>: ya tienen botón en el nodo. El cuentagotas toma el color de un píxel; el cuadrado selecciona un recuadro.": "<b>Eyedropper</b> <span class=\"tk\" data-k=\"picker\"></span> and <b>Square</b> <span class=\"tk\" data-k=\"marquee\"></span>: now have a button on the node. The eyedropper picks a pixel's color; the square selects a box.",
  "<b>Punta</b> (junto al tamaño): un botón que alterna entre punta <b>circular</b> (por defecto) y <b>cuadrada</b> para lápiz y goma, tamaños 1–10. Al pasar el ratón por la cuadrícula se ve el contorno de la punta. <b>Ctrl + rueda</b> cambia el tamaño.": "<b>Tip</b> (next to the size): one button that switches between a <b>round</b> (default) and a <b>square</b> tip for pencil and eraser, sizes 1–10. Hovering the grid shows the tip outline. <b>Ctrl + wheel</b> changes the size.",
  "<b>Bolita de fondo:</b> alterna el fondo de la cuadrícula entre sólido y translúcido (40 %) para calcar sobre otros elementos; el cabecero y el pie no cambian.": "<b>Background dot:</b> switches the grid background between solid and translucent (40 %) for tracing over other elements; the header and footer stay the same.",
  "<b>Tile</b> (4 cuadraditos): muestra 8 píxeles repetidos alrededor del lienzo, con degradado. Se desactiva al perder el foco el nodo.": "<b>Tile</b> (4 squares): shows 8 repeated pixels around the canvas, fading out. It turns off when the node loses focus.",
  "<b>Botón central</b> + arrastrar: desplaza todos los píxeles con envoltura, como un tile.": "<b>Middle button</b> + drag: shifts all pixels with wrap-around, like a tile.",
  "<b>Doble clic derecho</b> con cuadrado, lazo o varita: selecciona todo el lienzo. El primer clic sobre un nodo inactivo solo lo activa.": "<b>Double right-click</b> with square, lasso or wand: selects the whole canvas. The first click on an inactive node only activates it.",
  "<b>Lápiz</b> <span class=\"tk\" data-k=\"pencil\"></span>: pinta con el color activo; arrastra para trazar. Clic derecho = borrar. Con una selección, solo pinta dentro de ella.": "<b>Pencil</b> <span class=\"tk\" data-k=\"pencil\"></span>: paints with the active color; drag to draw strokes. Right-click = erase. With a selection, it only paints inside it.",
  "<b>Goma</b> <span class=\"tk\" data-k=\"eraser\"></span>: deja los píxeles transparentes. También respeta la selección.": "<b>Eraser</b> <span class=\"tk\" data-k=\"eraser\"></span>: makes pixels transparent. It also respects the selection.",
  "<b>Cubo</b> <span class=\"tk\" data-k=\"bucket\"></span>: rellena la zona contigua del mismo color con el color activo (dentro de la selección, si la hay).": "<b>Bucket</b> <span class=\"tk\" data-k=\"bucket\"></span>: fills the contiguous area of the same color with the active color (inside the selection, if there is one).",
  "<b>Varita mágica</b> <span class=\"tk\" data-k=\"wand\"></span>: un clic selecciona los píxeles contiguos del mismo color; <b>Shift + clic</b> suma otra zona.": "<b>Magic wand</b> <span class=\"tk\" data-k=\"wand\"></span>: one click selects the contiguous pixels of the same color; <b>Shift + click</b> adds another area.",
  "<b>Lazo</b> <span class=\"tk\" data-k=\"lasso\"></span>: dibuja un contorno a mano alzada y selecciona lo que encierra.": "<b>Lasso</b> <span class=\"tk\" data-k=\"lasso\"></span>: draws a freehand outline and selects what it encloses.",
  "<b>Selección:</b> arrástrala para moverla; <b>Ctrl+X</b> o <b>Supr</b> borran su contenido; clic derecho (con varita o lazo) o <b>Esc</b> la quitan. Se mantiene al cambiar de herramienta o de nodo.": "<b>Selection:</b> drag it to move it; <b>Ctrl+X</b> or <b>Del</b> erase its content; right-click (with wand or lasso) or <b>Esc</b> clears it. It is kept when you change tool or node.",
  "Cancelar": "Cancel",
  "Rueda: zoom · Arrastra: mover · Esc: cerrar": "Wheel: zoom · Drag: move · Esc: close",
  "Plegar / desplegar": "Fold / unfold",
  "Abrir enlace": "Open link",
  "Añadir a la barra": "Add to the bar",
  "Píxel transparente": "Transparent pixel",
  "Lápiz": "Pencil",
  "Goma": "Eraser",
  "Cubo": "Bucket",
  "Cuentagotas": "Eyedropper",
  "Cuadrado": "Square",
  "Lazo": "Lasso",
  "Varita mágica": "Magic wand",

  /* Espacios de trabajo */
  "Nuevo espacio": "New workspace",
  "Abrir archivo…": "Open file…",
  "Guardar": "Save",
  "Guardar como…": "Save as…",
  "Autoguardado": "Autosave",
  "Aún no hay espacios guardados.": "No saved workspaces yet.",
  "Abierto ahora": "Open now",
  "ahora": "just now",
  "Vincular de nuevo a un archivo": "Link to a file again",
  "Quitar de la lista": "Remove from list",
  "Espacio nuevo": "New workspace",
  "Archivo vinculado ✓": "File linked ✓",
  "Guardado ✓": "Saved ✓",
  "Hay cambios que no están guardados en el archivo vinculado. La app los conserva, pero el archivo .json se quedará sin ellos. ¿Guardarlos en el archivo antes de salir?": "Some changes are not saved in the linked file. The app keeps them, but the .json file will stay without them. Save them to the file before leaving?",
  "Guardar y salir": "Save and exit",
  "Salir sin guardar en el archivo": "Exit without saving to the file",
  "Descargado ✓": "Downloaded ✓",
  "Importado ✓": "Imported ✓",
  "Sin permiso para escribir en el archivo": "No permission to write to the file",
  "Sin permiso para leer el archivo: se abre la copia de la app": "No permission to read the file: opening the app's copy",
  "⚠ No hay copia guardada de este espacio": "⚠ There is no saved copy of this workspace",
  "El archivo vinculado ya no existe: elige dónde guardarlo": "The linked file no longer exists: choose where to save it",
  "Tu navegador no puede escribir archivos: usa Chrome o Edge": "Your browser can't write files: use Chrome or Edge",
  "Autoguardado activado": "Autosave enabled",
  "Autoguardado activado: empezará cuando haya al menos un nodo": "Autosave enabled: it will start once there is at least one node",
  "Autoguardado en archivo en pausa: pulsa Guardar en el menú de espacios para reactivarlo": "File autosave paused: press Save in the workspaces menu to resume it",
  "Autoguardado en archivo: no disponible en este navegador (usa Chrome o Edge)": "File autosave: not available in this browser (use Chrome or Edge)",
  "Autoguardado: escribe en un archivo cada vez que cambia algo (solo con al menos un nodo). Se te pedirá elegirlo": "Autosave: writes to a file every time something changes (only with at least one node). You will be asked to choose it",
  "Formato no válido": "Invalid format",
  "IndexedDB no disponible": "IndexedDB not available",
  "sin permiso de escritura": "no write permission",
  "el archivo ya no está vinculado": "the file is no longer linked",
  "sin referencia": "no reference",
  "archivo no encontrado": "file not found",
  "hace {0} min": "{0} min ago",
  "hace {0} h": "{0} h ago",
  "hace {0} d": "{0} d ago",
  "{0} nodos": "{0} nodes",

  /* Menú contextual */
  "Comentario": "Comment",
  "Tarea": "Task",
  "Paleta": "Palette",
  "Texto": "Text",
  "Nuevo nodo": "New node",
  "Sin coincidencias": "No matches",
  "Poner / editar texto": "Add / edit text",
  "Flecha →": "Arrow →",
  "Flecha invertida ←": "Reversed arrow ←",
  "Flecha bidireccional ↔": "Bidirectional arrow ↔",
  "Eliminar conexión": "Delete connection",
  "Duplicar": "Duplicate",
  "Traer al frente": "Bring to front",
  "Enviar al fondo": "Send to back",
  "Editar texto": "Edit text",
  "Ver imagen ampliada": "View enlarged image",
  "Recortar imagen": "Crop image",
  "Restaurar tamaño original": "Restore original size",
  "Restaurar recorte": "Restore crop",
  "Abrir enlace ↗": "Open link ↗",
  "Eliminar": "Delete",
  "＋ Globo": "＋ Bubble",
  "＋ Cuadro de texto": "＋ Text box",
  "＋ Comentario": "＋ Comment",
  "＋ Tarea": "＋ Task",
  "＋ Imagen…": "＋ Image…",
  "＋ Paleta de color": "＋ Color palette",
  "＋ Pixel art": "＋ Pixel art",
  "Seleccionar todo": "Select all",
  "Buscar nodos…": "Search nodes…",
  "Tamaño": "Size",

  /* Tareas */
  "Añadir subtarea": "Add subtask",
  "Eliminar subtarea": "Delete subtask",
  "Subtarea…": "Subtask…",
  "Modo tile": "Tile mode",
  "Modo tile activado — clic para desactivar": "Tile mode on — click to turn off",
  "Modo tile — muestra 8 píxeles repetidos alrededor": "Tile mode — shows 8 repeated pixels around the canvas",
  "Punta circular — clic para cambiar a cuadrada": "Round tip — click to switch to square",
  "Punta cuadrada — clic para cambiar a circular": "Square tip — click to switch to round",
  "Mostrar / ocultar la cuadrícula": "Show / hide the grid",
  "Añadir color": "Add color",
  "Eliminar el último color": "Delete the last color",
  "Paleta aleatoria": "Random palette",
  "Imagen guardada ✓": "Image saved ✓",
  "Imagen PNG": "PNG image",
  "Imagen JPEG": "JPEG image",
  "Ver todo": "Show all",
  "Ver principal": "Main only",
  "Esquivar nodos": "Avoid nodes",
  "Minimapa": "Minimap",
  "Exportar vista (PNG)": "Export view (PNG)",
  "Exportar vista": "Export view",
  "Recorte": "Crop",
  "Elegir una zona": "Pick an area",
  "Espacio de trabajo completo": "Whole workspace",
  "Lo que se ve ahora": "What's visible now",
  "Resolución": "Resolution",
  "Volver": "Back",
  "Continuar": "Continue",
  "Arrastra para elegir la zona": "Drag to choose the area",
  "Vista exportada ✓": "View exported ✓",
  "Esquivar nodos: activado": "Avoid nodes: on",
  "Las flechas esquivan los nodos": "Arrows now route around nodes",
  "Las flechas van en línea recta entre nodos": "Arrows go straight between nodes",
  "Flechas discontinuas ocultas": "Dashed arrows hidden",
  "Flechas discontinuas visibles": "Dashed arrows visible",
  "Ordenar colores": "Sort colors",
  "Ordenar por tono": "Sort by hue",
  "Ordenar por saturación": "Sort by saturation",
  "Ordenar por brillo": "Sort by brightness",
  "Ordenar por luminancia": "Sort by luminance",
  "Ordenar por rojo": "Sort by red",
  "Ordenar por verde": "Sort by green",
  "Ordenar por azul": "Sort by blue",
  "Ascendente": "Ascending",
  "Descendente": "Descending",
  "Eliminar color": "Delete color",
  "Tira": "Strip",
  "Lista": "List",
  "Puntos": "Dots",
  "Archivo": "File",
  "Exportar .gpl": "Export .gpl",
  "Importar .gpl": "Import .gpl",
  "Exportar PNG": "Export PNG",
  "Muestra": "Swatch",
  "Disposición": "Layout",
  "1 px (indexable)": "1 px (indexable)",
  "Tira (1 fila)": "Strip (1 row)",
  "Cuadrícula (8 por fila)": "Grid (8 per row)",
  "Mis paletas": "My palettes",
  "Guardar paleta actual": "Save current palette",
  "Eliminar de Mis paletas": "Delete from My palettes",
  "Clic para cargar en la paleta actual": "Click to load into the current palette",
  "Paleta .gpl exportada ✓": ".gpl palette exported ✓",
  "PNG exportado ✓": "PNG exported ✓",
  "Guardada en Mis paletas ✓": "Saved to My palettes ✓",
  "Color añadido a la barra": "Color added to the bar",
  "⚠ El archivo no contiene colores válidos": "⚠ The file has no valid colors",
  "Exporta la paleta como .gpl (GIMP / Aseprite y otros programas de pixel art). Pregunta dónde guardarla.": "Exports the palette as .gpl (GIMP / Aseprite and other pixel-art tools). Asks where to save it.",
  "Sustituye los colores de esta paleta por los de un archivo .gpl. No se guarda en la biblioteca.": "Replaces this palette's colors with those of a .gpl file. It is not saved to the library.",
  "Lado de cada muestra en el PNG. 1 px = una imagen con un píxel por color, la que leen Aseprite y otros programas de pixel art.": "Side of each swatch in the PNG. 1 px = an image with one pixel per color, the kind Aseprite and other pixel-art tools read.",
  "Cómo se colocan las muestras en la imagen.": "How the swatches are laid out in the image.",
  "Exporta la paleta como imagen PNG. Pregunta dónde guardarla.": "Exports the palette as a PNG image. Asks where to save it.",
  "Guarda esta paleta en la biblioteca de MindForge (máximo 10 paletas propias). Pide confirmación.": "Saves this palette to the MindForge library (up to 10 of your own). Asks for confirmation.",
  "<b>Biblioteca:</b> sustituye los colores por una paleta incluida o de <b>Mis paletas</b>.": "<b>Library:</b> replaces the colors with a built-in palette or one from <b>My palettes</b>.",
  "<b>Armonía, matiz, saturación, luminosidad y nº de colores:</b> generan la paleta con una regla de color. <b>Regenerar</b> la recalcula y descarta los cambios manuales.": "<b>Harmony, hue, saturation, lightness and no. of colors:</b> generate the palette with a color rule. <b>Regenerate</b> recomputes it and discards manual changes.",
  "<b>Tono, saturación y luminosidad:</b> desplazan todos los colores a la vez; al soltar se confirma y el control vuelve a 0.": "<b>Hue, saturation and lightness:</b> shift all colors at once; on release it is applied and the control returns to 0.",
  "<b>.gpl:</b> exporta o importa la paleta (GIMP, Aseprite…). Importar solo sustituye la paleta actual.": "<b>.gpl:</b> exports or imports the palette (GIMP, Aseprite…). Importing only replaces the current palette.",
  "<b>PNG:</b> una imagen con las muestras; con <b>1 px</b> sale un píxel por color (paleta indexable).": "<b>PNG:</b> an image with the swatches; with <b>1 px</b> you get one pixel per color (indexable palette).",
  "Hasta 10 paletas propias en la biblioteca de MindForge: <b>Guardar</b> (con confirmación), clic para cargar, <b>×</b> para eliminar.": "Up to 10 palettes of your own in the MindForge library: <b>Save</b> (with confirmation), click to load, <b>×</b> to remove.",
  "<b>Cabecera</b> (con el nodo activo): vista (su icono anuncia la siguiente), paleta aleatoria, <b>−</b> elimina el último color y <b>＋</b> añade uno.": "<b>Header</b> (with the node active): view (its icon announces the next one), random palette, <b>−</b> deletes the last color and <b>＋</b> adds one.",
  "<b>Chips:</b> clic = color activo y copia el HEX; <b>doble clic</b> = a la barra de colores; <b>Shift + clic</b> = aplica el color a los demás nodos seleccionados; <b>arrastrar</b> sobre otro = intercambiar posiciones; <b>×</b> = quitar.": "<b>Chips:</b> click = active color and copies the HEX; <b>double-click</b> = to the color bar; <b>Shift + click</b> = applies the color to the other selected nodes; <b>drag</b> onto another = swap positions; <b>×</b> = remove.",
  "En el nodo": "On the node",
  "Ayuda del menú de paleta": "Palette menu help",
  "Zoom general: 100 % — clic para 125 %": "Overall zoom: 100% — click for 125%",
  "Zoom general: 125 % — clic para 100 %": "Overall zoom: 125% — click for 100%",
  "El zoom general solo está disponible en la app de escritorio": "Overall zoom is only available in the desktop app",
  "Zoom general": "Overall zoom",
  "Punta cuadrada": "Square tip",
  "Punta circular": "Round tip",
  "Fondo sólido": "Solid background",
  "Fondo sólido — clic para fondo translúcido (calcar)": "Solid background — click for translucent background (tracing)",
  "Fondo translúcido (calcar) — clic para fondo sólido": "Translucent background (tracing) — click for solid background",
  "Pendiente": "Pending",
  "En progreso": "In progress",
  "Completada": "Done",

  /* Avisos y diálogos */
  "Texto de la conexión (vacío = sin texto):": "Connection text (empty = no text):",
  "Escribe tu nota…": "Write your note…",
  "Describe la tarea…": "Describe the task…",
  "¿Eliminar todos los nodos del lienzo? Podrás deshacerlo con Ctrl+Z.": "Delete all nodes from the canvas? You can undo it with Ctrl+Z.",
  "⚠ No se pudo cargar la imagen": "⚠ The image could not be loaded",
  "Tamaño demasiado grande para exportar": "Size too large to export",
  "Esos nodos ya están conectados": "Those nodes are already connected",
  "Color para los próximos elementos": "Color for the next elements",
  "Muestra eliminada": "Swatch removed",
  "Paleta copiada": "Palette copied",
  "Color añadido a la barra": "Color added to the bar",
  "Selecciona otro elemento junto a la paleta (Shift+clic)": "Select another element along with the palette (Shift+click)",
  "No se pudo extraer un color válido de este elemento": "Couldn't extract a valid color from this element",
  "Ese elemento no tiene color": "That element has no color",
  "Color copiado y aplicado": "Color copied and applied",
  "No se pudo aplicar el color": "Couldn't apply the color",
  "La imagen no tiene recorte": "The image has no crop",
  "Recorte restaurado": "Crop restored",
  "Atajos guardados": "Shortcuts saved",
  "Atajos restablecidos": "Shortcuts reset",
  "Cargar de la biblioteca": "Load from library",

  /* Espacio de bienvenida (primer arranque) */
  "¡Bienvenido a MindForge!":
    "Welcome to MindForge!",
  "<b>Doble clic</b> en el fondo: nodo nuevo<div><b>Clic derecho</b>: menú de las cosas</div><div>Haz <b>zoom</b> con la rueda</div><div>Arrastra sobre el fondo para moverte por el tablero</div><div><b>Ctrl+Z / Ctrl+Y</b>: deshacer y rehacer</div><div>Pulsa <b>?</b> para mostrar la ayuda</div>":
    "<b>Double-click</b> the background: new node<div><b>Right-click</b>: menu for each item</div><div><b>Zoom</b> with the wheel</div><div>Drag the background to move around the board</div><div><b>Ctrl+Z / Ctrl+Y</b>: undo and redo</div><div>Press <b>?</b> to show the help</div>",
  "Nodos":
    "Nodes",
  "Conexiones":
    "Connections",
  "Tareas":
    "Tasks",
  "Guardado":
    "Saving",
  "Marca el avance con el punto de color de cada subtarea.":
    "Track progress with the colored dot of each subtask.",
  "Todo se <b>guarda solo</b>. En el botón de espacios de trabajo puedes tener varios tableros, guardarlos como archivo, activar el <b>autoguardado</b> y abrir recientes. La app también hace <b>copias de respaldo</b> para que no pierdas nada.":
    "Everything is <b>saved automatically</b>. With the workspaces button you can keep several boards, save them as files, turn on <b>autosave</b> and open recent ones. The app also makes <b>backup copies</b> so you never lose anything.",
  "Arrastra desde las <b>bolitas</b> de un nodo hasta otro para unirlos. <b>Doble clic</b> en la flecha para escribirle un texto; <b>clic derecho</b> para cambiar su sentido. Con <b>Tab</b> creas un hijo al instante.":
    "Drag from a node's <b>dots</b> to another node to link them. <b>Double-click</b> the arrow to write a label; <b>right-click</b> to change its direction. Press <b>Tab</b> to create a child instantly.",
  "Hay <b>globos</b>, <b>cuadros de texto</b>, <b>comentarios</b> plegables, <b>tareas</b>, <b>paletas de color</b>, <b>imágenes</b> y <b>pixel art</b>. Créalos con clic derecho en el fondo y cámbiales el color desde las muestras de la barra superior.":
    "There are <b>bubbles</b>, <b>text boxes</b>, collapsible <b>comments</b>, <b>tasks</b>, <b>color palettes</b>, <b>images</b> and <b>pixel art</b>. Create them with a right-click on the background and change their color from the swatches in the top bar.",
  "Aquí podrás crear <b>esquemas visuales</b>, <b>flujos de nodos</b> interconectados, <b>listas de tareas</b> y mucho más. Este tablero es un pequeño recorrido: <b>edítalo, muévelo o bórralo</b> cuando quieras.":
    "Here you can create <b>visual diagrams</b>, interconnected <b>node flows</b>, <b>task lists</b> and much more. This board is a short tour: <b>edit it, move it or delete it</b> whenever you like.",
  "Primeros pasos":
    "First steps",
  "Paleta de color de ejemplo":
    "Sample color palette",
  "Leer esta bienvenida":
    "Read this welcome",
  "Crear mi primer nodo":
    "Create my first node",
  "Conectar dos nodos":
    "Connect two nodes",
  "empieza a crear!":
    "start creating!",
  "Bienvenida":
    "Welcome",
  "No hay nodos que borrar": "There are no nodes to delete",
};

/* ---- Patrones con partes variables ---- */
const EN_PAT = [
  [/^(\d+) nodos en el grupo$/, "$1 nodes in the group"],
  [/^Desplegar rama \((\d+) ocultos\)$/, "Expand branch ($1 hidden)"],
  [/^Importados (\d+) colores ✓$/, "Imported $1 colors ✓"],
  [/^Importada \(recortada a (\d+) colores\)$/, "Imported (trimmed to $1 colors)"],
  [/^¿Eliminar «(.*)» de Mis paletas\?$/, (m, n) => "Delete «" + n + "» from My palettes?"],
  [/^Mis paletas está llena \((\d+)\/(\d+)\): quita alguna primero$/, "My palettes is full ($1/$2): remove one first"],
  [/^Cambiar a vista: (.*)$/, (m, a) => "Switch to view: " + t(a)],
  [/^Historial: paso (\d+) de (\d+)$/, "History: step $1 of $2"],
  [/^⚠ No se pudo guardar: (.*)$/, "⚠ Could not save: $1"],
  [/^(.*) — clic para cambiar el estado$/, (m, a) => t(a) + " — click to change the status"],
  [/^Tamaño original: (.*)$/, "Original size: $1"],
  [/^PNG exportado \(x(\d+)\) ✓$/, "PNG exported (x$1) ✓"],
  [/^Color activo (.*) \(copiado\)$/, "Active color $1 (copied)"],
  [/^Eliminar (\d+) elementos$/, "Delete $1 elements"],
  [/^Exportar PNG x(\d+)$/, "Export PNG x$1"],
  [/^Las (\d+) muestras base no se pueden quitar$/, "The $1 base swatches can't be removed"],
  [/^Máximo (\d+) colores por paleta$/, "Maximum $1 colors per palette"],
  [/^Color capturado: (.*)$/, "Color captured: $1"],
  [/^(#[0-9a-fA-F]{3,8}) copiado$/, "$1 copied"],
  [/^hace (\d+) (min|h|d)$/, (m, n, u) => n + (u === "d" ? " d" : u === "h" ? " h" : " min") + " ago"],
  [/^(\d+) nodos$/, "$1 nodes"],
  [/^Espacio abierto: (.*)$/, (m, n) => "Workspace opened: " + t(n)],
  [/^Guardado ✓ (.+)$/, "Saved ✓ $1"],
  [/^⚠ Autoguardado en archivo: (.*)$/, "⚠ File autosave: $1"],
  [/^Autoguardado activo: escribe en (.*) cada vez que cambia algo \(solo con al menos un nodo\)$/, "Autosave on: writes to $1 every time something changes (only with at least one node)"],
  [/^Autoguardado: escribe en (.*) cada vez que cambia algo \(solo con al menos un nodo\)$/, "Autosave: writes to $1 every time something changes (only with at least one node)"],
  [/^No se encontró el archivo «(.*)» \(puede que se haya borrado o movido de carpeta\)\. ¿Abrir la última copia guardada en la app\?$/, "File «$1» was not found (it may have been deleted or moved). Open the last copy saved in the app?"],
  [/^El archivo «(.*)» es más reciente que la copia de la app\. Aceptar: cargar el archivo · ✕: abrir la copia de la app\.$/, "File «$1» is newer than the app's copy. OK: load the file · ✕: open the app's copy."],
  [/^¿Quitar «(.*)» de la lista\? Se elimina su copia guardada en la app \(el archivo en disco no se toca\)\.$/, (m, n) => "Remove «" + t(n) + "» from the list? Its copy saved in the app is deleted (the file on disk is not touched)."],
  [/^(Lápiz|Goma|Cubo|Cuentagotas|Cuadrado|Lazo|Varita mágica) \((.*)\)$/, (m, a, k) => t(a) + " (" + k + ")"],
];

/* Títulos por defecto de los nodos: se guardan en español y se muestran traducidos */
const DEFAULT_TITLES = new Set(["Comentario", "Tarea", "Pixel art", "Paleta", "Paleta de color", "Texto", "Nuevo nodo", "Sin título"]);

const norm = (s) => String(s).replace(/\s+/g, " ").trim();
function lookup(k) {
  if (Object.prototype.hasOwnProperty.call(EN, k)) return EN[k];
  for (const [re, to] of EN_PAT) {
    const m = k.match(re);
    if (m) return typeof to === "function" ? to(...m) : k.replace(re, to);
  }
  return null;
}
/* t("texto", ...params): traduce una clave; {0}, {1}… se sustituyen por los parámetros */
function t(key, ...p) {
  let s = key;
  if (LANG === "en") {
    const r = lookup(norm(key));
    if (r != null) s = r;
  }
  return p.length ? s.replace(/\{(\d+)\}/g, (_, i) => p[i]) : s;
}
/* Valor mostrado en un <input> para un título que puede ser el de por defecto */
const tdef = (s) => (DEFAULT_TITLES.has(s) ? t(s) : s);
/* Inversa: un título escrito en inglés que coincide con uno por defecto vuelve a su clave en español */
const EN_DEF = new Map([...DEFAULT_TITLES].map((k) => [norm(EN[k] || k).toLowerCase(), k]));
const defKey = (s) => (LANG === "en" && EN_DEF.has(norm(s).toLowerCase()) ? EN_DEF.get(norm(s).toLowerCase()) : s);

/* ---- Traducción del DOM ---- */
const I18N_ATTRS = ["title", "placeholder", "aria-label", "label", "alt", "data-ph"];
const TXT = new WeakMap(); // nodo de texto → {en}
const ATT = new WeakMap(); // elemento → {attr: {es, en}}
const HTMLS = new WeakMap(); // elemento [data-i18n-html] → {es, en}
const SKIP = "script,style,textarea,input,.node .content,#fmt [contenteditable]";

function trText(n) {
  const p = n.parentElement;
  if (!p || LANG !== "en" || p.closest(SKIP) || p.closest("[data-i18n-html]")) return;
  const r = TXT.get(n);
  if (r && r.en === n.data) return;
  const k = norm(n.data);
  if (!k || (p.classList.contains("ttl") && !DEFAULT_TITLES.has(k))) return;
  const en = lookup(k);
  if (en == null || en === k) return;
  const out = (n.data.match(/^\s*/)[0] || "") + en + (n.data.match(/\s*$/)[0] || "");
  TXT.set(n, { es: n.data, en: out });
  n.data = out;
}
function trAttr(el, a) {
  if (LANG !== "en" || el.closest("[data-i18n-skip]")) return;
  const v = el.getAttribute(a);
  if (v == null) return;
  const rec = (ATT.get(el) || {})[a];
  if (rec && rec.en === v) return;
  const en = lookup(norm(v));
  if (en == null || en === norm(v)) return;
  const o = ATT.get(el) || {};
  o[a] = { es: v, en };
  ATT.set(el, o);
  el.setAttribute(a, en);
}
function trHtml(el) {
  let r = HTMLS.get(el);
  if (!r) {
    r = { es: el.innerHTML, en: null };
    HTMLS.set(el, r);
    const en = lookup(norm(r.es));
    r.en = en == null ? null : en;
  }
  if (LANG === "en" && r.en != null) el.innerHTML = r.en;
  else el.innerHTML = r.es;
}
function trTree(root) {
  if (root.nodeType === 3) return trText(root);
  if (root.nodeType !== 1) return;
  if (root.matches && root.matches("[data-i18n-html]")) return trHtml(root);
  const list = [root, ...root.querySelectorAll("*")];
  for (const e of list) {
    if (e.hasAttribute("data-i18n-html")) {
      trHtml(e);
      continue;
    }
    for (const a of I18N_ATTRS) if (e.hasAttribute(a)) trAttr(e, a);
  }
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let x;
  while ((x = w.nextNode())) trText(x);
}
function restoreAll() {
  document.querySelectorAll("[data-i18n-html]").forEach(trHtml);
  document.querySelectorAll("*").forEach((e) => {
    const o = ATT.get(e);
    if (!o) return;
    for (const a in o) if (e.getAttribute(a) === o[a].en) e.setAttribute(a, o[a].es);
    ATT.delete(e);
  });
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let x;
  while ((x = w.nextNode())) {
    const r = TXT.get(x);
    if (r && r.en === x.data) x.data = r.es;
  }
}
const mo = new MutationObserver((ms) => {
  if (LANG !== "en") return;
  for (const m of ms) {
    if (m.type === "characterData") trText(m.target);
    else if (m.type === "attributes") trAttr(m.target, m.attributeName);
    else m.addedNodes.forEach((n) => trTree(n));
  }
});
mo.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: I18N_ATTRS });

function applyLang() {
  document.documentElement.lang = LANG;
  if (LANG === "en") trTree(document.body);
  else restoreAll();
  if (!langFlip) {
    const t = document.getElementById("langTxt");
    if (t) t.textContent = LANG.toUpperCase();
  }
}
function setLang(l) {
  if (l === LANG) return;
  LANG = l;
  if (typeof UI !== "undefined") {
    UI.lang = l;
    saveUI();
  }
  applyLang();
  for (const f of ["updateInspector", "renderWs"]) {
    try {
      if (typeof globalThis[f] === "function") globalThis[f]();
    } catch (_) {}
  }
}
/* Botón EN/ES: un solo botón que intercambia el texto con un pequeño giro */
let langFlip = false;
const langBtn = document.getElementById("langBtn");
if (langBtn)
  langBtn.onclick = () => {
    const t = document.getElementById("langTxt"), next = LANG === "en" ? "es" : "en";
    if (langFlip) return;
    langFlip = true;
    setLang(next);
    const done = () => {
      langFlip = false;
      t.textContent = LANG.toUpperCase();
    };
    if (!t.animate) return done();
    t.animate([{ transform: "rotateX(0)", opacity: 1 }, { transform: "rotateX(90deg)", opacity: 0.2, offset: 0.5 }, { transform: "rotateX(0)", opacity: 1 }], { duration: 320, easing: "ease-in-out" });
    setTimeout(() => (t.textContent = next.toUpperCase()), 160);
    setTimeout(done, 330);
  };
/* Se aplica ya (el DOM estático existe) para que no haya parpadeo en español */
applyLang();
