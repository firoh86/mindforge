"use strict";
/* =====================  Minimapa  =====================
   Panel flotante sobre el espacio de trabajo (botón «Minimapa» de la segunda fila de botones, arriba a la derecha).
   Dibuja una versión mínima de todos los nodos visibles (forma según el tipo, relleno = su color actual) y de sus
   conexiones principales (las continuas), más el recuadro de lo que se ve ahora.
   · clic (sin arrastrar) en un punto: la vista se centra en ese punto del tablero
   · arrastrar dentro: mueve el panel · arrastrar desde una esquina: lo escala (con tamaño mínimo)
   Preferencias en UI (localStorage): mmOn (visible) y mm = { x, y, w, h } en píxeles del área de trabajo. */
const MM_MINW = 140,
  MM_MINH = 100,
  MM_PAD = 0.06; // margen alrededor de los nodos (fracción del tamaño)
const mmEl = $("#minimap");
let mmQ = false,
  mmMap = null; // { x0, y0, s, ox, oy }: paso entre coordenadas del tablero y del panel
function mmGeom() {
  const st = $("#stage").getBoundingClientRect(),
    g = Object.assign({ w: 240, h: 160 }, UI.mm || {});
  g.w = clamp(g.w, MM_MINW, Math.max(MM_MINW, st.width - 12));
  g.h = clamp(g.h, MM_MINH, Math.max(MM_MINH, st.height - 12));
  if (g.x === undefined || g.y === undefined) {
    g.x = st.width - g.w - 12; // por defecto, abajo a la derecha
    g.y = st.height - g.h - 40; // deja libre el pie con el correo
  }
  g.x = clamp(g.x, 0, Math.max(0, st.width - g.w));
  g.y = clamp(g.y, 0, Math.max(0, st.height - g.h));
  return g;
}
function mmApply() {
  mmEl.hidden = !UI.mmOn;
  $("#mmBtn").classList.toggle("on", !!UI.mmOn);
  if (!UI.mmOn) return;
  const g = mmGeom();
  Object.assign(mmEl.style, { left: g.x + "px", top: g.y + "px", width: g.w + "px", height: g.h + "px" });
  mmQueue();
}
function mmQueue() {
  if (mmQ || !UI.mmOn) return;
  mmQ = true;
  requestAnimationFrame(() => {
    mmQ = false;
    mmRender();
  });
}
// relleno de un nodo en el minimapa: su color actual (auto = tarjeta; transparente/borde = sin relleno)
function mmFill(n) {
  if (!COLORABLE.includes(n.type)) return "var(--muted-foreground)";
  if (n.color === "auto") return "var(--card)";
  if (n.color === "outline" || n.color === "transparent") return "none";
  return n.color;
}
function mmRender() {
  if (!UI.mmOn) return;
  const W = mmEl.clientWidth,
    H = mmEl.clientHeight,
    svg = mmEl.querySelector("svg");
  const ns = visNodes();
  if (!ns.length || W < 10 || H < 10) {
    svg.innerHTML = "";
    mmMap = null;
    return;
  }
  const R = new Map(ns.map((n) => [n.id, nodeRect(n)]));
  let x0 = 1e9,
    y0 = 1e9,
    x1 = -1e9,
    y1 = -1e9;
  R.forEach((r) => {
    x0 = Math.min(x0, r.x1);
    y0 = Math.min(y0, r.y1);
    x1 = Math.max(x1, r.x2);
    y1 = Math.max(y1, r.y2);
  });
  const px = Math.max(40, (x1 - x0) * MM_PAD),
    py = Math.max(40, (y1 - y0) * MM_PAD);
  x0 -= px;
  x1 += px;
  y0 -= py;
  y1 += py;
  const s = Math.min(W / (x1 - x0), H / (y1 - y0)),
    ox = (W - (x1 - x0) * s) / 2,
    oy = (H - (y1 - y0) * s) / 2;
  mmMap = { x0, y0, s, ox, oy };
  const X = (v) => ((v - x0) * s + ox).toFixed(1),
    Y = (v) => ((v - y0) * s + oy).toFixed(1);
  let h = "";
  // conexiones principales (las continuas, entre nodos visibles): mismo trazado que las reales (salen por el lado que
  // toca, esquinas redondeadas, reparto de anclajes y esquivar nodos si está activo) y con su punta de flecha
  const offs = edgeOffsets(),
    rr = clamp(14 * s, 1.5, 7);
  h += '<defs><marker id="mmArr" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z"/></marker></defs>';
  for (const e of board.edges) {
    const a = get(e.from),
      b = get(e.to);
    if (!a || !b || !R.has(e.from) || !R.has(e.to) || a === b) continue;
    if (DASH_TYPES.includes(a.type) || DASH_TYPES.includes(b.type)) continue;
    const [sa, sb] = edgeSideKeys(a, b),
      p1 = sidePoint(a, sa, offs.get(e.id + "|s") || 0),
      p2 = sidePoint(b, sb, offs.get(e.id + "|t") || 0),
      pts = route(p1, p2, { A: a, B: b }).map(([px, py]) => [+X(px), +Y(py)]),
      dir = e.dir || "fwd",
      ms = dir === "rev" || dir === "both" ? ' marker-start="url(#mmArr)"' : "",
      me = dir === "fwd" || dir === "both" ? ' marker-end="url(#mmArr)"' : "";
    h += `<path class="mme" d="${rounded(pts, rr)}"${ms}${me}/>`;
  }
  const MIN = 3; // tamaño mínimo en el panel para que ningún nodo desaparezca
  for (const n of ns) {
    const r = R.get(n.id),
      w = Math.max(MIN, (r.x2 - r.x1) * s),
      hh = Math.max(MIN, (r.y2 - r.y1) * s),
      x = +X(r.x1),
      y = +Y(r.y1),
      f = mmFill(n),
      ghost = f === "none";
    const cls = `mmn${ghost ? " mmg" : ""}`;
    const wf = w.toFixed(1),
      hf = hh.toFixed(1),
      cx = x + w / 2,
      cy = y + hh / 2,
      big = w >= 12 && hh >= 12, // con menos tamaño solo se dibuja la forma
      u = Math.min(w, hh);
    if (n.type === "bubble") h += `<rect class="${cls}" x="${x}" y="${y}" width="${wf}" height="${hf}" rx="${(hh / 2).toFixed(1)}" style="fill:${f}"/>`;
    else if (n.type === "palette") {
      // cuadrícula 2×2 con los cuatro primeros colores de la paleta
      const cs = n.colors || [],
        cw = w / 2,
        ch = hh / 2;
      h += `<rect class="mmn" x="${x}" y="${y}" width="${wf}" height="${hf}" rx="2" style="fill:var(--card)"/>`;
      for (let i = 0; i < 4; i++) h += `<rect x="${(x + (i % 2) * cw).toFixed(1)}" y="${(y + (i >> 1) * ch).toFixed(1)}" width="${cw.toFixed(1)}" height="${ch.toFixed(1)}" style="fill:${cs[i % Math.max(1, cs.length)] || "#888"}"/>`;
      h += `<rect class="mmo" x="${x}" y="${y}" width="${wf}" height="${hf}" rx="2"/>`;
    } else if (n.type === "pixel") {
      // un cuadrado con dos píxeles en diagonal
      h += `<rect class="mmn" x="${x}" y="${y}" width="${wf}" height="${hf}" rx="1" style="fill:var(--card)"/>`;
      if (big) {
        const q = Math.max(2, u * 0.3);
        h += `<rect x="${(x + w * 0.2).toFixed(1)}" y="${(y + hh * 0.2).toFixed(1)}" width="${q.toFixed(1)}" height="${q.toFixed(1)}" style="fill:var(--foreground)"/><rect x="${(x + w * 0.8 - q).toFixed(1)}" y="${(y + hh * 0.8 - q).toFixed(1)}" width="${q.toFixed(1)}" height="${q.toFixed(1)}" style="fill:var(--foreground)"/>`;
      }
    } else if (n.type === "image") {
      // imagen mínima: un marco con una carita sonriente
      h += `<rect class="mmn" x="${x}" y="${y}" width="${wf}" height="${hf}" rx="2" style="fill:var(--card)"/>`;
      if (big) {
        const r = u * 0.34,
          e = Math.max(1, u * 0.05);
        h += `<circle class="mmi" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}"/><circle cx="${(cx - r * 0.38).toFixed(1)}" cy="${(cy - r * 0.25).toFixed(1)}" r="${e.toFixed(1)}" style="fill:var(--foreground)"/><circle cx="${(cx + r * 0.38).toFixed(1)}" cy="${(cy - r * 0.25).toFixed(1)}" r="${e.toFixed(1)}" style="fill:var(--foreground)"/><path class="mmi" d="M${(cx - r * 0.5).toFixed(1)} ${(cy + r * 0.2).toFixed(1)}Q${cx.toFixed(1)} ${(cy + r * 0.75).toFixed(1)} ${(cx + r * 0.5).toFixed(1)} ${(cy + r * 0.2).toFixed(1)}"/>`;
      }
    } else if (n.type === "task") {
      // tres filas y un tick verde
      h += `<rect class="${cls}" x="${x}" y="${y}" width="${wf}" height="${hf}" rx="2.5" style="fill:${f}"/>`;
      if (big) {
        const lx = x + w * 0.12,
          lw = w * 0.5;
        for (let i = 0; i < 3; i++) h += `<line class="mml" x1="${lx.toFixed(1)}" y1="${(y + hh * (0.25 + i * 0.25)).toFixed(1)}" x2="${(lx + lw).toFixed(1)}" y2="${(y + hh * (0.25 + i * 0.25)).toFixed(1)}"/>`;
        const tx = x + w * 0.8,
          t = Math.min(w * 0.14, hh * 0.22);
        h += `<path class="mmt" d="M${(tx - t).toFixed(1)} ${(cy).toFixed(1)}l${(t * 0.8).toFixed(1)} ${(t * 0.8).toFixed(1)} ${(t * 1.4).toFixed(1)} ${(-t * 1.6).toFixed(1)}"/>`;
      }
    } else h += `<rect class="${cls}" x="${x}" y="${y}" width="${wf}" height="${hf}" rx="2.5" style="fill:${f}"/>`;
  }
  // lo que se ve ahora en el lienzo
  const v = board.view,
    cr = canvas.getBoundingClientRect(),
    vx = (-v.x) / v.k,
    vy = (-v.y) / v.k;
  h += `<rect class="mmv" x="${X(vx)}" y="${Y(vy)}" width="${((cr.width / v.k) * s).toFixed(1)}" height="${((cr.height / v.k) * s).toFixed(1)}"/>`;
  svg.innerHTML = h;
}
// clic en el panel → centra la vista en ese punto del tablero
function mmGoto(cx, cy) {
  if (!mmMap) return;
  const r = mmEl.getBoundingClientRect(),
    m = mmMap,
    wx = m.x0 + (cx - r.left - m.ox) / m.s,
    wy = m.y0 + (cy - r.top - m.oy) / m.s,
    v = board.view,
    cr = canvas.getBoundingClientRect();
  v.x = cr.width / 2 - wx * v.k;
  v.y = cr.height / 2 - wy * v.k;
  applyView();
  scheduleSave();
}
let mmDrag = null;
mmEl.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  const g = mmGeom(),
    hd = e.target.closest && e.target.closest(".mmh");
  mmDrag = { x: e.clientX, y: e.clientY, g, c: hd ? hd.dataset.c : null, moved: false };
  mmEl.setPointerCapture(e.pointerId);
});
mmEl.addEventListener("pointermove", (e) => {
  const d = mmDrag;
  if (!d) return;
  const dx = e.clientX - d.x,
    dy = e.clientY - d.y;
  if (!d.moved && Math.hypot(dx, dy) < 4) return;
  d.moved = true;
  const st = $("#stage").getBoundingClientRect(),
    g = Object.assign({}, d.g);
  if (!d.c) {
    g.x = clamp(d.g.x + dx, 0, Math.max(0, st.width - g.w));
    g.y = clamp(d.g.y + dy, 0, Math.max(0, st.height - g.h));
  } else {
    // esquinas: el lado opuesto queda fijo; tamaño mínimo y dentro del área de trabajo
    let L = d.g.x,
      T = d.g.y,
      Rr = d.g.x + d.g.w,
      B = d.g.y + d.g.h;
    if (d.c.includes("w")) L = clamp(L + dx, 0, Rr - MM_MINW);
    if (d.c.includes("e")) Rr = clamp(Rr + dx, L + MM_MINW, st.width);
    if (d.c.includes("n")) T = clamp(T + dy, 0, B - MM_MINH);
    if (d.c.includes("s")) B = clamp(B + dy, T + MM_MINH, st.height);
    Object.assign(g, { x: L, y: T, w: Rr - L, h: B - T });
  }
  UI.mm = g;
  mmApply();
  mmRender(); // sin esperar al siguiente fotograma: el contenido sigue al tamaño
});
const mmEnd = (e) => {
  const d = mmDrag;
  mmDrag = null;
  if (!d) return;
  if (e.type === "pointerup") {
    if (!d.moved && !d.c) mmGoto(e.clientX, e.clientY);
    else if (d.moved) saveUI();
  }
};
mmEl.addEventListener("pointerup", mmEnd);
mmEl.addEventListener("pointercancel", mmEnd);
mmEl.addEventListener("contextmenu", (e) => e.preventDefault());
$("#mmBtn").onclick = () => {
  UI.mmOn = !UI.mmOn;
  saveUI();
  mmApply();
};
window.addEventListener("resize", mmApply);
mmApply();
