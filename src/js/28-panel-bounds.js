"use strict";
/* =====================  Paneles flotantes limitados al área de trabajo  ===================== */
const stageRect = () => $("#stage").getBoundingClientRect();
const isShown = (el) =>
  !el.hidden && getComputedStyle(el).display !== "none";
// Coloca un panel `fixed` asegurando que quede entero dentro de #stage
function placeFixed(el, left, top) {
  const s = stageRect(),
    w = el.offsetWidth,
    h = el.offsetHeight;
  el.style.left =
    clamp(left, s.left, Math.max(s.left, s.right - w)) + "px";
  el.style.top = clamp(top, s.top, Math.max(s.top, s.bottom - h)) + "px";
  el.style.right = "auto";
  el.style.transform = "none";
}
function reclampFixed(el) {
  if (!isShown(el)) return;
  const r = el.getBoundingClientRect();
  placeFixed(el, r.left, r.top);
}
function dragFixed(el, e, onMove) {
  const r = el.getBoundingClientRect(),
    ox = e.clientX - r.left,
    oy = e.clientY - r.top;
  const mv = (ev) => {
    placeFixed(el, ev.clientX - ox, ev.clientY - oy);
    if (onMove) onMove();
  };
  const up = () => {
    window.removeEventListener("pointermove", mv);
    window.removeEventListener("pointerup", up);
  };
  window.addEventListener("pointermove", mv);
  window.addEventListener("pointerup", up);
}
function layoutPxInsp() {
  const p = $("#pxinsp");
  if (p.hidden) return;
  const s = stageRect();
  p.style.maxHeight = s.height - 20 + "px";
  if (!p.dataset.placed) {
    p.dataset.placed = "1"; // al crear el nodo: a su derecha (o izquierda si no cabe)
    const nn = pxNode(),
      sp = nn ? sideSpot(nn, p.offsetWidth) : { x: s.width - p.offsetWidth - 20, y: 20 };
    placeFixed(p, s.left + sp.x, s.top + sp.y);
  } else reclampFixed(p);
  positionKeys();
}
// Submenú de atajos: desplegable lateral del menú de Pixel art
function positionKeys() {
  const k = $("#keys"),
    p = $("#pxinsp");
  if (k.hidden || p.hidden) return;
  const s = stageRect(),
    r = p.getBoundingClientRect(),
    w = k.offsetWidth,
    h = k.offsetHeight,
    gap = 10;
  const roomR = s.right - r.right - gap,
    roomL = r.left - s.left - gap;
  // Derecha por defecto; izquierda si no cabe a la derecha
  const side = roomR >= w || (roomL < w && roomR >= roomL) ? "r" : "l";
  const left = side === "r" ? r.right + gap : r.left - gap - w;
  k.dataset.side = side;
  k.style.right = "auto";
  k.style.transform = "none";
  k.style.left =
    clamp(left, s.left, Math.max(s.left, s.right - w)) + "px";
  k.style.top = clamp(r.top, s.top, Math.max(s.top, s.bottom - h)) + "px";
}
function closeKeys() {
  $("#keys").hidden = true;
  capTool = null;
}
function reclampPanels() {
  reclampFixed($("#wheel"));
  layoutPxInsp();
  positionInsp();
  positionFmt();
}
window.addEventListener("resize", reclampPanels);
if (window.ResizeObserver)
  new ResizeObserver(reclampPanels).observe($("#stage"));
