"use strict";
/* =====================  Árbol: ramas plegables y nodos hijo / hermano  =====================
   La jerarquía sale de las conexiones: los hijos de un nodo son los destinos de sus conexiones
   (from → to) y su padre es el origen de la conexión que le llega. Un nodo plegado (n.fold)
   oculta todo lo que cuelga de él; el botón de su esquina muestra cuántos nodos quedan ocultos. */
const TREE_GAP_X = 80,
  TREE_GAP_Y = 20;
let HBY = new Map(), // nodo oculto → nodo que lo oculta (el plegado o el grupo contraído)
  HID = new Set(), // nodos ocultos por una rama plegada
  HCOUNT = new Map(), // nodo plegado → nº de nodos ocultos
  FCOUNT = new Map(); // nodo → nº de nodos que quedarían ocultos al plegarlo (0 = no tiene rama propia: sin botón)
const isVis = (n) => !HID.has(n.id);
const visNodes = () => board.nodes.filter(isVis);
// padre e hijo de una conexión: la flecha apunta al hijo (con la flecha invertida ← el hijo es el nodo de origen)
const ePar = (e) => (e.dir === "rev" ? e.to : e.from),
  eChi = (e) => (e.dir === "rev" ? e.from : e.to);
function treeMaps() {
  const out = new Map(),
    inn = new Map();
  let outR; // solo conexiones reales (sin los miembros de un grupo): lo que cuelga "por flecha" de cada nodo
  for (const e of board.edges) {
    if (!get(e.from) || !get(e.to) || e.from === e.to || e.dir === "both") continue; // las flechas dobles unen pares: no son jerarquía
    const P = ePar(e),
      C = eChi(e);
    if (!out.has(P)) out.set(P, []);
    if (!inn.has(C)) inn.set(C, []);
    if (!out.get(P).includes(C)) out.get(P).push(C);
    if (!inn.get(C).includes(P)) inn.get(C).push(P);
  }
  outR = new Map([...out].map(([k, v]) => [k, v.slice()]));
  for (const n of board.nodes) {
    // grupo de un cuadro de texto: sus miembros cuelgan del cuadro (se ocultan con la rama de su padre,
    // pero plegar el propio cuadro nunca los oculta: no cuenta en outR)
    if (!n.grp || n.grp === n.id || !get(n.grp)) continue;
    if (!out.has(n.grp)) out.set(n.grp, []);
    if (!inn.has(n.id)) inn.set(n.id, []);
    if (!out.get(n.grp).includes(n.id)) out.get(n.grp).push(n.id);
    if (!inn.get(n.id).includes(n.grp)) inn.get(n.id).push(n.grp);
  }
  return { out, inn, outR };
}
// todo lo que cuelga de id (sin incluirlo a él)
function descendants(id, out, outR) {
  const seen = new Set([id]),
    st = [id],
    res = new Set();
  while (st.length) {
    const x = st.pop();
    // el nodo plegado solo oculta lo que cuelga de sus conexiones: sus miembros de grupo no (outR)
    for (const c of (x === id && outR ? outR : out).get(x) || [])
      if (!seen.has(c)) {
        seen.add(c);
        res.add(c);
        st.push(c);
      }
  }
  return res;
}
// quita de `hid` los nodos con otro padre visible (y no plegado): no son rama directa del nodo plegado
function rescue(hid, inn, folded) {
  let ch = true;
  while (ch) {
    ch = false;
    for (const id of [...hid])
      if ((inn.get(id) || []).some((p) => !hid.has(p) && !folded(p))) {
        hid.delete(id);
        ch = true;
      }
  }
}
function treeCompute() {
  const { out, inn, outR } = treeMaps(),
    hid = new Set(),
    folded = board.nodes.filter((n) => n.fold && (outR.get(n.id) || []).length);
  const per = new Map();
  const by = new Map();
  folded.forEach((n) => {
    const d = descendants(n.id, out, outR);
    per.set(n.id, d);
    d.forEach((i) => (hid.add(i), !by.has(i) && by.set(i, n.id)));
  });
  rescue(hid, inn, (p) => get(p).fold);
  // grupo contraído: oculta sus nodos y lo que cuelga de ellos (salvo lo que tenga otro padre visible)
  const forced = new Set();
  board.nodes.forEach((b) => b.gcol && isGroupBox(b) && groupAll(b.id).forEach((m) => forced.add(m)));
  if (forced.size) {
    const D = new Set();
    forced.forEach((m) => descendants(m, out).forEach((d) => !forced.has(d) && D.add(d)));
    // lo que cuelga de un miembro se oculta con él, salvo que tenga otro padre visible (y no plegado)
    for (let ch = true; ch; ) {
      ch = false;
      for (const id of [...D])
        if ((inn.get(id) || []).some((p) => !hid.has(p) && !forced.has(p) && !D.has(p) && !get(p).fold)) {
          D.delete(id);
          ch = true;
        }
    }
    board.nodes.forEach((b) => b.gcol && isGroupBox(b) && groupAll(b.id).forEach((m) => !by.has(m) && by.set(m, b.id)));
    D.forEach((d) => {
      if (!by.has(d)) {
        const bx = [...forced].find((m) => descendants(m, out).has(d));
        by.set(d, (bx && get(bx).grp) || d);
      }
    });
    forced.forEach((m) => hid.add(m));
    D.forEach((d) => hid.add(d));
  }
  // los miembros de un cuadro oculto se ocultan siempre con él, y con ellos lo que cuelga solo de ellos
  // (salvo lo que tenga otro padre visible y sin plegar)
  for (let again = true; again; ) {
    again = false;
    const news = [];
    [...hid].forEach((id) => groupAll(id).forEach((m) => !hid.has(m) && (hid.add(m), by.set(m, by.get(id) || id), news.push(m))));
    if (!news.length) break;
    const D = new Set();
    news.forEach((m) => descendants(m, out).forEach((d) => !hid.has(d) && D.add(d)));
    for (let ch = true; ch; ) {
      ch = false;
      for (const id of [...D])
        if ((inn.get(id) || []).some((p) => !hid.has(p) && !D.has(p) && !get(p).fold)) {
          D.delete(id);
          ch = true;
        }
    }
    D.forEach((d) => (hid.add(d), by.set(d, by.get(news[0]) || news[0]), (again = true)));
    if (news.length) again = true;
  }
  HID = hid;
  HBY = by;
  HCOUNT = new Map();
  FCOUNT = new Map();
  per.forEach((d, id) => {
    const c = [...d].filter((i) => hid.has(i)).length;
    HCOUNT.set(id, c);
    FCOUNT.set(id, c);
  });
  // nodos aún sin plegar: ¿cuántos se ocultarían al plegarlos solos?
  board.nodes.forEach((n) => {
    if (n.fold || !(outR.get(n.id) || []).length) return;
    const d = descendants(n.id, out, outR),
      h2 = new Set([...hid, ...d]);
    rescue(h2, inn, (p) => p === n.id || get(p).fold);
    FCOUNT.set(n.id, [...d].filter((i) => h2.has(i) && !hid.has(i)).length);
  });
  return { out, inn, outR };
}
function foldBtnText(n, kids) {
  return n.fold ? "+" + (HCOUNT.get(n.id) || kids) : "−";
}
// recalcula qué nodos se ven y pinta los botones de plegado
function treeRefresh() {
  const { outR: out } = treeCompute(); // el botón de plegar cuenta solo conexiones reales (no los miembros de un grupo)
  board.nodes.forEach((n) => {
    const el = els.get(n.id);
    if (!el) return;
    el.classList.toggle("fhid", HID.has(n.id));
    const kids = (out.get(n.id) || []).length;
    let b = el.querySelector(":scope > .fbtn");
    // sin rama propia (todos sus hijos tienen otro padre visible): no se muestra el marcador
    if (!kids || !FCOUNT.get(n.id)) {
      if (b) b.remove();
      el.classList.remove("folded");
      return;
    }
    if (!b) {
      b = document.createElement("button");
      b.type = "button";
      b.className = "fbtn";
      b.tabIndex = -1;
      el.appendChild(b);
    }
    el.classList.toggle("folded", !!n.fold);
    b.textContent = foldBtnText(n, kids);
    b.title = n.fold
      ? `Desplegar rama (${HCOUNT.get(n.id) || kids} ocultos)`
      : "Plegar rama";
  });
  HID.forEach((id) => sel.delete(id));
  if (selEdge) {
    const e = board.edges.find((x) => x.id === selEdge);
    if (!e || HID.has(e.from) || HID.has(e.to)) selEdge = null;
  }
}
// ¿tiene una rama propia que se pueda plegar?
function hasKids(n) {
  return (FCOUNT.get(n.id) || 0) > 0;
}
function setFold(ids, on) {
  const ns = ids.map(get).filter((n) => n && hasKids(n));
  if (!ns.length) return;
  ns.forEach((n) => (n.fold = on));
  setSel([...sel]); // la selección no cambia (los ocultos se quitan solos al refrescar)
  commit();
}
function toggleFold(id) {
  const n = get(id);
  if (n && hasKids(n)) setFold([id], !n.fold);
}
// ids + (si están plegados) sus nodos ocultos: así una rama plegada se mueve entera
function branchIds(ids) {
  const res = new Set(ids),
    { out, outR } = treeMaps();
  // cierre: grupo del cuadro (siempre), rama de los plegados y lo que cuelga de los miembros de un grupo contraído (ocultos)
  for (let ch = true; ch; ) {
    const n0 = res.size;
    [...res].forEach((id) => {
      const n = get(id);
      if (!n) return;
      if (n.fold) descendants(id, out, outR).forEach((d) => res.add(d));
      groupAll(id).forEach((m) => {
        res.add(m);
        if (n.gcol) descendants(m, out).forEach((d) => res.add(d));
      });
    });
    ch = res.size > n0;
  }
  return res;
}
/* ---------- crear hijos y hermanos ---------- */
function parentOf(n) {
  const e = board.edges.find((x) => eChi(x) === n.id && ePar(x) !== n.id && x.dir !== "both" && get(ePar(x)));
  return e ? get(ePar(e)) : null;
}
function childrenOf(n) {
  return board.edges
    .filter((e) => ePar(e) === n.id && eChi(e) !== n.id && e.dir !== "both" && get(eChi(e)))
    .map((e) => get(eChi(e)))
    .filter((c, i, a) => a.indexOf(c) === i);
}
// primer hueco libre para una tarjeta w × h: baja (dir "y") o se desplaza a la derecha (dir "x")
function freeSpot(x, y, w, h, dir = "y") {
  x = snap(x);
  y = snap(y);
  for (let i = 0; i < 300; i++) {
    const hit = visNodes().find(
      (n) => n.x < x + w + 10 && n.x + n.w > x - 10 && n.y < y + h + 10 && n.y + nh(n) > y - 10,
    );
    if (!hit) break;
    if (dir === "x") x = snap(hit.x + hit.w + TREE_GAP_X / 2);
    else y = snap(hit.y + nh(hit) + TREE_GAP_Y);
  }
  return { x, y };
}
function ensureVisible(n) {
  const v = board.view,
    r = canvas.getBoundingClientRect(),
    m = 60,
    l = n.x * v.k + v.x,
    rr = (n.x + n.w) * v.k + v.x,
    t = n.y * v.k + v.y,
    b = (n.y + nh(n)) * v.k + v.y;
  let dx = 0,
    dy = 0;
  if (l < m) dx = m - l;
  else if (rr > r.width - m) dx = r.width - m - rr;
  if (t < m) dy = m - t;
  else if (b > r.height - m) dy = r.height - m - b;
  if (dx || dy) {
    v.x += dx;
    v.y += dy;
    applyView();
    scheduleSave();
  }
}
function nodeKind(src) {
  return COLORABLE.includes(src.type) ? src.type : "bubble";
}
function inheritExtra(src, extra) {
  if (COLORABLE.includes(src.type) && src.color && src.color !== "transparent") {
    extra.color = src.color;
    if (src.bc) extra.bc = src.bc;
  }
  return extra;
}
/* Disposición: el primer hijo va DEBAJO del padre (centrado) y los hermanos se añaden AL LADO (a la derecha
   del último). Para un pixel art se cuenta su altura activa (barra de herramientas y pie), así ni el panel
   del inspector ni la propia tarjeta al ganar el foco tapan al hijo. */
function belowY(p) {
  return p.y + (p.type === "pixel" ? p.h : nh(p)) + TREE_GAP_Y * 3;
}
// Tab: nuevo nodo conectado como hijo
function addChild(p) {
  if (!p) return;
  if (p.fold) p.fold = false;
  const type = nodeKind(p),
    [w, h] = SIZE[type],
    kids = childrenOf(p).filter(isVis),
    last = kids[kids.length - 1],
    spot = last
      ? freeSpot(last.x + last.w + TREE_GAP_X / 2, last.y, w, h, "x")
      : freeSpot(p.x + (p.w - w) / 2, belowY(p), w, h);
  const n = addNode(type, spot.x + w / 2, spot.y + h / 2, inheritExtra(p, { parent: p.id }));
  ensureVisible(n);
  return n;
}
// Ctrl+Enter: nuevo nodo hermano (mismo padre). Sin padre —o si ya está unido a su par con flecha doble— aparece a su
// derecha unido con él por una flecha en ambos sentidos, de modo que se puede encadenar
function addSibling(n) {
  if (!n) return;
  const pe = board.edges.find((x) => eChi(x) === n.id && ePar(x) !== n.id && get(ePar(x))),
    par = pe && get(ePar(pe));
  if (par && pe.dir !== "both") return addChild(par);
  const type = nodeKind(n),
    [w, h] = SIZE[type],
    spot = freeSpot(n.x + n.w + TREE_GAP_X / 2, n.y, w, h, "x"),
    s = addNode(type, spot.x + w / 2, spot.y + h / 2, inheritExtra(n, { parent: n.id, parentDir: "both" }));
  ensureVisible(s);
  return s;
}
/* botón de plegado de la esquina del nodo */
canvas.addEventListener("click", (e) => {
  const b = e.target.closest && e.target.closest(".fbtn");
  if (!b) return;
  e.stopPropagation();
  toggleFold(b.closest(".node").dataset.id);
});

// nodo visible que acaba ocultando a n (siguiendo la cadena de plegados): hacia él apuntan los tramos con bola
function hiderOf(id) {
  let h = id,
    k = 0;
  while (h && HID.has(h) && k++ < 50) h = HBY.get(h);
  return h && !HID.has(h) && h !== id ? get(h) : null;
}
