"use strict";
/* =====================  Inicio: espacio de bienvenida  =====================
   Se carga solo la primera vez (sin tablero guardado) o si el guardado falla.
   Es un tablero exportado desde la propia app (Bienvenida.json) con los textos
   envueltos en t() para traducirlos (EN en js/00-i18n.js) y negritas con <b>.
   Para cambiarlo: edita el tablero en la app, expórtalo y regenera este bloque. */
function seed() {
  return {
    v: 5,
    title: t("Bienvenida"),
    view: { x: -1100, y: -250, k: 0.7 },
    images: {},
    nodes: [
      { id: "kbsf4yw", type: "bubble", x: 2260, y: 460, w: 320, h: 120, color: "auto", html: t("¡Bienvenido a MindForge!"), font: "Inter", fs: 18, b: false, i: false, u: false },
      { id: "o92b09p", type: "comment", x: 1780, y: 440, w: 400, h: 168, color: "auto", html: t("<b>Doble clic</b> en el fondo: nodo nuevo<div><b>Clic derecho</b>: menú de las cosas</div><div>Haz <b>zoom</b> con la rueda</div><div>Arrastra sobre el fondo para moverte por el tablero</div><div><b>Ctrl+Z / Ctrl+Y</b>: deshacer y rehacer</div><div>Pulsa <b>?</b> para mostrar la ayuda</div>"), title: t("Primeros pasos"), collapsed: false, font: "Inter", fs: 14, b: false, i: false, u: false },
      { id: "uan9cvq", type: "bubble", x: 1680, y: 840, w: 240, h: 64, color: "#e6edf3", html: t("Nodos"), font: "Inter", fs: 18, b: false, i: false, u: false },
      { id: "479wfif", type: "bubble", x: 2120, y: 840, w: 240, h: 64, color: "#34d399", html: t("Conexiones"), font: "Inter", fs: 18, b: false, i: false, u: false },
      { id: "5gw34nh", type: "task", x: 2480, y: 980, w: 320, h: 236, color: "auto", html: t("Marca el avance con el punto de color de cada subtarea."), title: "Tarea", collapsed: false, font: "Inter", fs: 18, b: false, i: false, u: false, status: "doing", subs: [{ id: "j1pul8c", t: t("Leer esta bienvenida"), s: "done" }, { id: "7qkscdl", t: t("Crear mi primer nodo"), s: "doing" }, { id: "yti7ora", t: t("Conectar dos nodos"), s: "todo" }] },
      { id: "xmqcskl", type: "bubble", x: 2520, y: 840, w: 240, h: 64, color: "#fbbf24", html: t("Tareas"), font: "Inter", fs: 18, b: false, i: false, u: false },
      { id: "nukjjbm", type: "bubble", x: 2920, y: 840, w: 240, h: 64, color: "#6366f1", html: t("Guardado"), font: "Inter", fs: 18, b: false, i: false, u: false },
      { id: "et3s86d", type: "text", x: 2860, y: 1000, w: 360, h: 184, color: "transparent", html: t("Todo se <b>guarda solo</b>. En el botón de espacios de trabajo puedes tener varios tableros, guardarlos como archivo, activar el <b>autoguardado</b> y abrir recientes. La app también hace <b>copias de respaldo</b> para que no pierdas nada."), font: "Inter", fs: 18, b: false, i: false, u: false, uh: 184 },
      { id: "t48bvig", type: "text", x: 2060, y: 1000, w: 360, h: 160, color: "transparent", html: t("Arrastra desde las <b>bolitas</b> de un nodo hasta otro para unirlos. <b>Doble clic</b> en la flecha para escribirle un texto; <b>clic derecho</b> para cambiar su sentido. Con <b>Tab</b> creas un hijo al instante."), font: "Inter", fs: 18, b: false, i: false, u: false, uh: 160 },
      { id: "frcggwu", type: "text", x: 1620, y: 1000, w: 360, h: 200, color: "transparent", html: t("Hay <b>globos</b>, <b>cuadros de texto</b>, <b>comentarios</b> plegables, <b>tareas</b>, <b>paletas de color</b>, <b>imágenes</b> y <b>pixel art</b>. Créalos con clic derecho en el fondo y cámbiales el color desde las muestras de la barra superior."), font: "Inter", fs: 18, b: false, i: false, u: false, uh: 200 },
      { id: "mx1vtyf", type: "text", x: 2680, y: 460, w: 360, h: 120, color: "outline", html: t("Aquí podrás crear <b>esquemas visuales</b>, <b>flujos de nodos</b> interconectados, <b>listas de tareas</b> y mucho más. Este tablero es un pequeño recorrido: <b>edítalo, muévelo o bórralo</b> cuando quieras."), font: "Inter", fs: 14, b: false, i: false, u: false, uh: 120, bc: "#e6edf3" },
      { id: "w4e3wjp", type: "palette", x: 3100, y: 600, w: 300, h: 180, color: "auto", html: "Nuevo nodo", title: t("Paleta de color de ejemplo"), collapsed: false, font: "Inter", gen: {"h": 68, "s": 70, "l": 55, "mode": "analog", "n": 8}, colors: ["#d4257d", "#e1565b", "#d47125", "#e1d356", "#94d425", "#6de156", "#25d45a", "#56e1c1"], selChip: 0 },
    ],
    edges: [
      { id: "ajo9u5g", from: "kbsf4yw", to: "uan9cvq", label: t("empieza a crear!") },
      { id: "h4mumf9", from: "kbsf4yw", to: "479wfif" },
      { id: "rw3skep", from: "uan9cvq", to: "479wfif", dir: "both" },
      { id: "yndi7g3", from: "kbsf4yw", to: "xmqcskl" },
      { id: "xejr29z", from: "xmqcskl", to: "5gw34nh" },
      { id: "22l1n9u", from: "kbsf4yw", to: "nukjjbm" },
      { id: "d22t32p", from: "nukjjbm", to: "et3s86d" },
      { id: "in8fe40", from: "479wfif", to: "t48bvig" },
      { id: "rq8naci", from: "uan9cvq", to: "frcggwu" },
      { id: "j2h4bch", from: "kbsf4yw", to: "mx1vtyf" },
    ],
  };
}
