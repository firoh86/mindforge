"use strict";
/* =====================  Importar / exportar  ===================== */
function loadBoard(d) {
  if (!d || !Array.isArray(d.nodes) || !Array.isArray(d.edges))
    throw new Error("Formato no válido");
  if (!d.v || d.v < 3) {
    // migración: el color de los elementos ahora es el color de fondo real
    d.nodes.forEach((n) => {
      if (n.type === "text") n.color = "transparent";
      else if (n.type === "bubble" && (!n.color || n.color === "#0d1117"))
        n.color = "auto";
      else if (
        n.type === "comment" &&
        (!n.color || n.color === "#27313e")
      )
        n.color = "auto";
      else if (n.type === "palette") n.color = "auto";
    });
  }
  if (!d.v || d.v < 4)
    d.nodes.forEach((n) => {
      if (n.type === "pixel") n.h += PXF;
    }); // nuevo pie de pixel art
  if (!d.v || d.v < 5)
    d.nodes.forEach((n) => {
      if (n.type === "pixel") n.h += PXH - CH; // cabecero de dos filas
    });
  d.nodes.forEach((n) => {
    if (n.type === "task") {
      const ok = Array.isArray(n.subs)
        ? n.subs
            .filter((s) => s && typeof s === "object")
            .map((s) => ({ id: s.id || uid(), t: String(s.t || ""), s: SUB_ORDER.includes(s.s) ? s.s : "todo" }))
        : [];
      if (ok.length) n.subs = ok;
      else delete n.subs;
    }
  });
  d.nodes.forEach((n) => {
    if (n.collapsed && !n.fw && (n.type === "comment" || n.type === "task")) n.fw = n.w;
  });
  board = {
    v: 5,
    wsId: d.wsId || newWsId(),
    edgeW: d.edgeW,
    mainOnly: !!d.mainOnly,
    avoid: !!d.avoid,
    title: typeof d.title === "string" ? d.title : "",
    nodes: d.nodes,
    edges: d.edges,
    images: d.images || {},
    view: d.view || { x: 0, y: 0, k: 1 },
  };
  syncBoardTitle();
  board.nodes.forEach((n) => {
    if (typeof n.title === "string") n.title = cleanTitle(n.title);
  });
  sel.clear();
  selEdge = null;
  renderAll();
  hist = [];
  hi = -1;
  commit();
}
/* Título del espacio de trabajo (se guarda dentro de board.title) */
const titleIn = $("#boardTitle");
let titleBefore = "";
const fileBase = () =>
  (board.title || "").trim().replace(/[\\/:*?"<>|]+/g, "").slice(0, 60) ||
  "esquema";
function fitTitle() {
  titleIn.style.width =
    clamp((titleIn.value || titleIn.placeholder).length + 3, 8, 40) + "ch";
}
function syncBoardTitle() {
  titleIn.value = board.title || "";
  fitTitle();
  document.title = board.title ? board.title + " · MindForge" : "MindForge";
}
titleIn.addEventListener("focus", () => {
  titleBefore = board.title || "";
  titleIn.select();
});
titleIn.addEventListener("input", () => {
  board.title = titleIn.value;
  fitTitle();
  document.title = board.title ? board.title + " · MindForge" : "MindForge";
  scheduleSave();
});
titleIn.addEventListener("change", () => {
  board.title = titleIn.value.trim();
  syncBoardTitle();
  scheduleSave();
});
titleIn.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    titleIn.blur();
  } else if (e.key === "Escape") {
    e.preventDefault();
    board.title = titleBefore;
    syncBoardTitle();
    scheduleSave();
    titleIn.blur();
  }
});
