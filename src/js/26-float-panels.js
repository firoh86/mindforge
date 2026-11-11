"use strict";
/* =====================  Paneles flotantes junto al elemento  ===================== */
function positionFmt() {
  const box = $("#fmt");
  if (box.hidden) return;
  const ns = textNodes();
  if (!ns.length) return;
  const v = board.view,
    st = $("#stage").getBoundingClientRect();
  let x0 = 1e9,
    x1 = -1e9,
    y0 = 1e9,
    y1 = -1e9;
  ns.forEach((n) => {
    x0 = Math.min(x0, n.x);
    x1 = Math.max(x1, n.x + n.w);
    y0 = Math.min(y0, n.y);
    y1 = Math.max(y1, n.y + nh(n));
  });
  const bw = box.offsetWidth,
    bh = box.offsetHeight,
    cx = v.x + ((x0 + x1) / 2) * v.k;
  let T = v.y + y0 * v.k - bh - 22; // encima del elemento (por encima de los tiradores)
  if (T < 6) T = v.y + y1 * v.k + 22; // si no cabe, debajo
  box.style.left =
    clamp(cx, bw / 2 + 6, Math.max(bw / 2 + 6, st.width - bw / 2 - 6)) +
    "px";
  box.style.top = clamp(T, 6, Math.max(6, st.height - bh - 6)) + "px";
}
/* Menú de paleta: independiente de la tarjeta, arrastrable y limitado al área de trabajo */
// Posición inicial común: a la derecha del elemento; si no cabe, a la izquierda
function sideSpot(n, bw) {
  const st = $("#stage").getBoundingClientRect(),
    v = board.view;
  let L = v.x + (n.x + n.w) * v.k + 18;
  const T = v.y + n.y * v.k;
  if (L + bw > st.width - 8) {
    const L2 = v.x + n.x * v.k - bw - 18;
    L = L2 > 8 ? L2 : st.width - bw - 8;
  }
  return { x: L, y: T };
}
let inspPos = null; // {x, y} relativos a #stage; null = aún sin colocar
function positionInsp() {
  const box = $("#insp");
  if (box.hidden) return;
  const st = $("#stage").getBoundingClientRect();
  box.style.maxHeight = st.height - 20 + "px";
  const bw = box.offsetWidth,
    bh = Math.min(box.scrollHeight, st.height - 20);
  if (!inspPos) {
    // Colocación inicial: junto a la paleta activa (solo la primera vez)
    const n = pal();
    if (!n) return;
    inspPos = sideSpot(n, bw);
  }
  inspPos.x = clamp(inspPos.x, 0, Math.max(0, st.width - bw));
  inspPos.y = clamp(inspPos.y, 0, Math.max(0, st.height - bh));
  box.style.left = inspPos.x + "px";
  box.style.top = inspPos.y + "px";
}
$("#inspHead").addEventListener("pointerdown", (e) => {
  if (e.target.closest("button")) return;
  e.preventDefault();
  const box = $("#insp"),
    r = box.getBoundingClientRect(),
    ox = e.clientX - r.left,
    oy = e.clientY - r.top;
  const mv = (ev) => {
    const st = $("#stage").getBoundingClientRect();
    inspPos = {
      x: ev.clientX - ox - st.left,
      y: ev.clientY - oy - st.top,
    };
    positionInsp();
  };
  const up = () => {
    window.removeEventListener("pointermove", mv);
    window.removeEventListener("pointerup", up);
  };
  window.addEventListener("pointermove", mv);
  window.addEventListener("pointerup", up);
});
window.addEventListener("resize", queuePos);
