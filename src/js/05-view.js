"use strict";
/* =====================  Vista (zoom / pan)  ===================== */
function applyView() {
  const v = board.view;
  world.style.transform = `translate(${v.x}px,${v.y}px) scale(${v.k})`;
  world.style.setProperty("--iz", 1 / v.k);
  let s = GRID * v.k;
  if (s < 9) s *= 4;
  canvas.style.backgroundSize = `${s}px ${s}px`;
  canvas.style.backgroundPosition = `${v.x - s / 2}px ${v.y - s / 2}px`;
  $("#zl").textContent = Math.round(v.k * 100) + "%";
  queuePos();
  if (typeof mmQueue === "function") mmQueue(); // el recuadro del minimapa sigue a la vista
}
function zoomAt(cx, cy, f) {
  const v = board.view,
    r = canvas.getBoundingClientRect(),
    k = clamp(v.k * f, 0.1, 8),
    px_ = cx - r.left,
    py = cy - r.top;
  v.x = px_ - (px_ - v.x) * (k / v.k);
  v.y = py - (py - v.y) * (k / v.k);
  v.k = k;
  applyView();
  scheduleSave();
}
function zoomCenter(f) {
  const r = canvas.getBoundingClientRect();
  zoomAt(r.left + r.width / 2, r.top + r.height / 2, f);
}
function fit() {
  const v = board.view,
    r = canvas.getBoundingClientRect();
  if (!visNodes().length) {
    v.x = 0;
    v.y = 0;
    v.k = 1;
    applyView();
    return;
  }
  let x0 = 1e9,
    y0 = 1e9,
    x1 = -1e9,
    y1 = -1e9;
  // con elementos seleccionados se centra sobre ellos; si no, sobre todo el conjunto
  (sel.size ? visNodes().filter((n) => sel.has(n.id)) : visNodes()).forEach((n) => {
    x0 = Math.min(x0, n.x);
    y0 = Math.min(y0, n.y);
    x1 = Math.max(x1, n.x + n.w);
    y1 = Math.max(y1, n.y + (n.type === "text" ? boxH(n) : nh(n)));
  });
  const pad = 80,
    k = clamp(
      Math.min(
        (r.width - pad * 2) / (x1 - x0),
        (r.height - pad * 2) / (y1 - y0),
      ),
      0.1,
      1.5,
    );
  v.k = k;
  v.x = (r.width - (x1 - x0) * k) / 2 - x0 * k;
  v.y = (r.height - (y1 - y0) * k) / 2 - y0 * k;
  applyView();
  scheduleSave();
}
canvas.addEventListener(
  "wheel",
  (e) => {
    const c =
      e.target.closest &&
      e.target.closest(".comment .content, .text .content");
    if (c && c.scrollHeight > c.clientHeight + 1 && !e.ctrlKey) return;
    // Ctrl + rueda con un pixel art seleccionado y lápiz/goma: cambia el tamaño de la punta en vez del zoom
    if (e.ctrlKey && sel.size === 1 && (px.tool === "pencil" || px.tool === "eraser")) {
      const pn = get([...sel][0]);
      if (pn && pn.type === "pixel") {
        e.preventDefault();
        const d = e.deltaY < 0 ? 1 : e.deltaY > 0 ? -1 : 0,
          s = clamp(px.size + d, 1, 10);
        if (s !== px.size) {
          px.size = s;
          pxSyncAll();
        }
        return;
      }
    }
    e.preventDefault();
    zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015));
  },
  { passive: false },
);
