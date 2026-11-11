"use strict";
/* =====================  Constantes y estado  ===================== */
const GRID = 20,
  CH = 40,
  MINW = 60,
  PXMINW = 260, // ancho mínimo del pixel art (cabecero y pie no desbordan)
  MINH = 40,
  MAXCOL = 50,
  PXF = 32,
  PXH = 64, // cabecero del pixel art: 2 filas (título + herramientas)
  TILEM = 8; // modo tile: píxeles extra por lado
const EDGE_SEL = ".hit, .elab, .elabbg";
const TAURI = window.__TAURI__;
const invoke = TAURI && TAURI.core ? TAURI.core.invoke : null;
const $ = (s) => document.querySelector(s);
const canvas = $("#canvas"),
  world = $("#world");
// 20 muestras base fijas (mínimo) + hasta 10 propias (máximo total: 30)
const PALETTE = [
  "#0d1117",
  "#27313e",
  "#64748b",
  "#94a3b8",
  "#e6edf3",
  "#ffffff",
  "#ef4444",
  "#f87171",
  "#fb923c",
  "#fbbf24",
  "#a3e635",
  "#34d399",
  "#2dd4bf",
  "#38bdf8",
  "#60a5fa",
  "#6366f1",
  "#a78bfa",
  "#c084fc",
  "#f472b6",
  "#fb7185",
];
const DEF = { bubble: "auto", text: "transparent", comment: "auto", task: "auto" };
const SIZE = {
  bubble: [240, 64],
  text: [280, 100],
  comment: [320, 160],
  task: [320, 150],
  palette: [400, 160],
  image: [300, 200],
  pixel: [320, 360],
};
const COLORABLE = ["bubble", "text", "comment", "task"];
const FONTS = {
  Inter: "'Inter',system-ui,sans-serif",
  "Playfair Display": "'Playfair Display',Georgia,serif",
  Montserrat: "'Montserrat','Segoe UI',sans-serif",
  Nunito: "'Nunito','Segoe UI',sans-serif",
  "JetBrains Mono": "'JetBrains Mono',Consolas,monospace",
};
const DEFFS = { bubble: 15, text: 18, comment: 14, task: 14 };
/* Tarjeta de tareas: estados con icono visible incluso plegada */
const TASK_ORDER = ["todo", "doing", "done"];
const TASK_ST = {
  todo: {
    label: "Pendiente",
    icon: '<circle cx="12" cy="12" r="9"/>',
  },
  doing: {
    label: "En progreso",
    icon: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
  },
  done: {
    label: "Completada",
    icon: '<circle cx="12" cy="12" r="9" fill="currentColor"/><path d="M7.8 12.4l3 3 5.4-6" stroke="#fff"/>',
  },
};

/* ---- Biblioteca de paletas (hex sin #) ---- */
const LIBS = [];
const L = (group, name, hex) =>
  LIBS.push({
    group,
    name,
    c: hex
      .trim()
      .split(/\s+/)
      .map((h) => "#" + h),
  });
L(
  "Lospec",
  "Pear36",
  "5e315b 8c3f5d ba6156 f2a65e ffe478 cfff70 8fde5d 3ca370 3d6e70 323e4f 322947 473b78 4b5bab 4da6ff 66ffe3 ffffeb c2c2d1 7e7e8f 606070 43434f 272736 3e2347 57294b 964253 e36956 ffb570 ff9166 eb564b b0305c 73275c 422445 5a265e 80366b bd4882 ff6b97 ffb5b5",
);
L(
  "Lospec",
  "Endesga 32",
  "be4a2f d77643 ead4aa e4a672 b86f50 733e39 3e2731 a22633 e43b44 f77622 feae34 fee761 63c74d 3e8948 265c42 193c3e 124e89 0099db 2ce8f5 ffffff c0cbdc 8b9bb4 5a6988 3a4466 262b44 181425 ff0044 68386c b55088 f6757a e8b796 c28569",
);
L(
  "Lospec",
  "Sweetie 16",
  "1a1c2c 5d275d b13e53 ef7d57 ffcd75 a7f070 38b764 257179 29366f 3b5dc9 41a6f6 73eff7 f4f4f4 94b0c2 566c86 333c57",
);
L(
  "Lospec",
  "PICO-8",
  "000000 1d2b53 7e2553 008751 ab5236 5f574f c2c3c7 fff1e8 ff004d ffa300 ffec27 00e436 29adff 83769c ff77a8 ffccaa",
);
L(
  "Lospec",
  "Apollo",
  "172038 253a5e 3c5e8b 4f8fba 73bed3 a4dddb 19332d 25562e 468232 75a743 a8ca58 d0da91 4d2b32 7a4841 ad7757 c09473 d7b594 e7d5b3 341c27 602c2c 884b2b be772b de9e41 e8c170 241527 411d31 752438 a53030 cf573c da863e 1e1d39 402751 7a367b a23e8c c65197 df84a5 090a14 10141f 151d28 202e37 394a50 577277 819796 a8b5b2 c7cfcc ebede9",
);
L(
  "Lospec",
  "DawnBringer 32",
  "000000 222034 45283c 663931 8f563b df7126 d9a066 eec39a fbf236 99e550 6abe30 37946e 4b692f 524b24 323c39 3f3f74 306082 5b6ee1 639bff 5fcde4 cbdbfc ffffff 9badb7 847e87 696a6a 595652 76428a ac3232 d95763 d77bba 8f974a 8a6f30",
);
L(
  "Lospec",
  "DawnBringer 16",
  "140c1c 442434 30346d 4e4a4e 854c30 346524 d04648 757161 597dce d27d2c 8595a1 6daa2c d2aa99 6dc2ca dad45e deeed6",
);
L(
  "Lospec",
  "Vinik24",
  "000000 6f6776 9a9a97 c5ccb8 8b5580 c38890 a593a5 666092 9a4f50 c28d75 7ca1c0 416aa3 8d6268 be955c 68aca9 387080 6e6962 93a167 6eaa78 557064 9d9f7f 7e9e99 5d6872 433455",
);
L(
  "Lospec",
  "Arne 16",
  "000000 493c2b be2633 e06f8b 9d9d9d a46422 eb8931 f7e26b ffffff 1b2632 2f484e 44891a a3ce27 005784 31a2f2 b2dcef",
);
L(
  "Lospec",
  "Na16",
  "8c8fae 584563 3e2137 9a6348 d79b7d f5edba c0c741 647d34 e4943a 9d303b d26471 70377f 7ec4c1 34859d 17434b 1f0e1c",
);
L(
  "Lospec",
  "Bubblegum 16",
  "16171a 7f0622 d62411 ff8426 ffd100 fafdff ff80a4 ff2674 94216a 430067 234975 68aed4 bfff3c 10d275 007899 002859",
);
L(
  "Lospec",
  "SLSO8",
  "0d2b45 203c56 544e68 8d697a d08159 ffaa5e ffd4a3 ffecd6",
);
L(
  "Lospec",
  "NYX8",
  "08141e 0f2a3f 20394f f6d6bd c3a38a 997577 816271 4e495f",
);
L(
  "Lospec",
  "Ammo-8",
  "040c06 112318 1e3a29 305d42 4d8061 89a257 bedc7f eeffcc",
);
L("Lospec", "Oil 6", "fbf5ef f2d3ab c9a18d 8b6d9c 494d7e 272744");
L("Lospec", "Kirokaze Gameboy", "332c50 46878f 94e344 e2f3e4");
L("Consolas clásicas", "Game Boy DMG", "0f380f 306230 8bac0f 9bbc0f");
L("Consolas clásicas", "Game Boy Pocket", "181818 4a4a4a 8c8c8c c8c8c8");
L("Consolas clásicas", "Game Boy Light", "00b581 009a71 00694a 00382c");
L(
  "Consolas clásicas",
  "CGA 16",
  "000000 0000aa 00aa00 00aaaa aa0000 aa00aa aa5500 aaaaaa 555555 5555ff 55ff55 55ffff ff5555 ff55ff ffff55 ffffff",
);
L(
  "Consolas clásicas",
  "Commodore 64",
  "000000 ffffff 68372b 70a4b2 6f3d86 588d43 352879 b8c76f 6f4f25 433900 9a6759 444444 6c6c6c 9ae29b 6c5eb5 959595",
);
L(
  "Consolas clásicas",
  "ZX Spectrum",
  "000000 0000d7 d70000 d700d7 00d700 00d7d7 d7d700 d7d7d7 0000ff ff0000 ff00ff 00ff00 00ffff ffff00 ffffff",
);
L(
  "Consolas clásicas",
  "VGA / Windows 16",
  "000000 800000 008000 808000 000080 800080 008080 c0c0c0 808080 ff0000 00ff00 ffff00 0000ff ff00ff 00ffff ffffff",
);
const MAX_USER_PALS = 10;
const userPals = () => (Array.isArray(UI.pals) ? UI.pals : []);
const libByName = (n) => LIBS.find((l) => l.name === n) || userPals().find((l) => l.name === n);
function libOptions(sel, placeholder) {
  const groups = [...new Set(LIBS.map((l) => l.group))],
    up = userPals(),
    opt = (l) => `<option value="${esc(l.name)}">${esc(l.name)} (${l.c.length})</option>`;
  sel.innerHTML =
    (placeholder ? `<option value="">${placeholder}</option>` : "") +
    (up.length ? `<optgroup label="Mis paletas">` + up.map(opt).join("") + `</optgroup>` : "") +
    groups
      .map((g) => `<optgroup label="${g}">` + LIBS.filter((l) => l.group === g).map(opt).join("") + `</optgroup>`)
      .join("");
}

function refreshLibs() {
  [["#pLib", "Cargar de la biblioteca…"], ["#xLib", ""]].forEach(([q, ph]) => {
    const el = document.querySelector(q);
    if (!el) return;
    const v = el.value;
    libOptions(el, ph);
    el.value = v;
  });
}

let board = {
  v: 3,
  title: "",
  nodes: [],
  edges: [],
  images: {},
  view: { x: 0, y: 0, k: 1 },
};
let sel = new Set(),
  selEdge = null,
  snapOn = true,
  nextColor = null,
  mouse = null,
  justMoved = false;
const els = new Map();
const uid = () => Math.random().toString(36).slice(2, 9);
const snap = (v) =>
  snapOn ? Math.round(v / GRID) * GRID : Math.round(v);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const get = (id) => board.nodes.find((n) => n.id === id);
// altura según el texto: comentarios/tareas desplegados y cuadros de texto
const autoH = (n) =>
  n.type === "text" || ((n.type === "comment" || n.type === "task") && !n.collapsed);
// un pixel art solo está "activo" (con herramientas, pie y panel) cuando es el único nodo seleccionado
const pxActive = (n) => n.type === "pixel" && sel.size === 1 && sel.has(n.id);
const nh = (n) =>
  (n.type === "comment" || n.type === "task") && n.collapsed
    ? CH
    : n.type === "pixel" && !pxActive(n)
      ? n.h - (PXH - CH) - PXF // pixel art fuera de foco: solo cabecero de una fila, sin pie
      : n.h;
const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

/* preferencias de interfaz (barra acoplada, colores propios, acento) */
const MAX_CUSTOM = 10;
let UI = { dock: "top", custom: [], accent: "#f56565" };
try {
  Object.assign(
    UI,
    JSON.parse(localStorage.getItem("mindforge-ui") || "{}"),
  );
} catch (_) {}
const saveUI = () => {
  try {
    localStorage.setItem("mindforge-ui", JSON.stringify(UI));
  } catch (_) {}
};
UI.custom = (UI.custom || [])
  .filter((c) => !PALETTE.includes(c))
  .slice(0, MAX_CUSTOM);
// tema claro/oscuro recordado entre sesiones (el oscuro es el de inicio)
if (UI.theme === "light") document.documentElement.classList.remove("dark");
/* memoria del último formato de texto usado */
let LF = Object.assign(
  { font: "Inter", fs: null, b: false, i: false, u: false },
  UI.lastFmt || {},
);
function rememberFmt(p) {
  Object.assign(LF, p);
  UI.lastFmt = LF;
  saveUI();
}
let posQ = false;
function queuePos() {
  if (posQ) return;
  posQ = true;
  requestAnimationFrame(() => {
    posQ = false;
    positionFmt();
    positionInsp();
  });
}
