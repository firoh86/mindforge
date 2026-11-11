"use strict";
/* =====================  Grupos de cuadro de texto  =====================
   Un nodo cuyo centro queda dentro (y por delante) de un cuadro de texto durante GROUP_DWELL ms mientras
   se arrastra pasa a formar parte de su grupo (n.grp = id del cuadro). Los miembros:
   · se mueven con el cuadro (branchIds), · se ocultan con la rama del cuadro (treeMaps los cuenta como hijos),
   · salen del grupo si se sueltan fuera del cuadro, · al borrar el cuadro se pregunta qué hacer con ellos. */
const GROUP_DWELL = 1200,
  GROUP_UNLOCK = 1200; // mantener pulsado un nodo bloqueado este tiempo lo libera del grupo
const GROUP_TITLE_MAX = 60; // un cuadro con grupo solo lleva su nombre: una línea de este largo máximo
const isGroupBox = (n) => !!n && n.type === "text" && board.nodes.some((m) => m.grp === n.id);
// al convertirse en grupo, el texto del cuadro se reduce a una sola línea (la primera) de longitud limitada
function normGroupBox(box) {
  const d = document.createElement("div");
  d.innerHTML = box.html || "";
  d.querySelectorAll("br,div,p").forEach((x) => x.before("\n"));
  const lines = d.textContent.split("\n").map((s) => s.trim()).filter(Boolean);
  if (lines.length <= 1 && (lines[0] || "").length <= GROUP_TITLE_MAX) return;
  box.html = esc((lines[0] || "").slice(0, GROUP_TITLE_MAX));
  const c = els.get(box.id) && els.get(box.id).querySelector(".content");
  if (c) c.innerHTML = box.html;
}
// tras cambiar la pertenencia a grupos: los cuadros de texto se repintan (botones, una línea, contraer… solo si siguen siendo grupo)
function refreshBoxes() {
  board.nodes.forEach((b) => b.type === "text" && applyNode(b));
}
const GLOCK_SVG =
  '<svg viewBox="0 0 24 24" fill="none"><path fill="currentColor" fill-rule="evenodd" d="M3 12a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-7zm10 2a1 1 0 1 0-2 0v3a1 1 0 1 0 2 0v-3z" clip-rule="evenodd"/><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10V7a4 4 0 0 1 4-4v0a4 4 0 0 1 4 4v3"/></svg>';
// (clic directo en el candado = liberar al instante; mantener pulsado el nodo ~GROUP_UNLOCK ms también)
// ¿está n bloqueado (su cuadro existe)? solo se mueve con el cuadro
const isLocked = (n) => !!n && !!n.grp && !!get(n.grp);
// al soltar: los miembros que quedan fuera de su cuadro (y que no viajaban con él) salen del grupo
function releaseOutside(d) {
  let any = false;
  d.starts.forEach((_, id) => {
    const n = get(id),
      box = n && n.grp ? get(n.grp) : null;
    if (n && box && !d.starts.has(box.id) && !centerIn(n, box)) {
      delete n.grp;
      applyNode(n);
      any = true;
    }
  });
  if (any) {
    refreshBoxes();
  renderEdges();
    toast("Fuera del grupo");
  }
}
// contraer / expandir un cuadro con grupo: contraído solo muestra su cabecera (el nombre); los nodos del grupo siguen visibles
function toggleGroupCollapse(n) {
  const el = els.get(n.id);
  if (n.gcol) {
    delete n.gcol;
    if (n.fw) {
      n.w = n.fw; // recupera el ancho que tenía
      delete n.fw;
    }
  } else {
    n.fw = n.w;
    n.gcol = true;
  }
  applyNode(n);
  if (n.gcol) n.w = el.offsetWidth; // contraído: solo el ancho del nombre + candado, flecha e (i)
  else {
    refitGroup(n);
    n.h = el.offsetHeight;
  }
  renderEdges();
  commit();
}
// al expandir: recalcula el cuadro para que vuelva a abarcar a todos sus miembros (por si no se guardó su tamaño o cambió)
function refitGroup(box) {
  const ms = members(box.id);
  if (!ms.length) return;
  const PAD = 24,
    TOP = 52; // la cabecera con el nombre queda libre
  let L = box.x,
    T = box.y,
    R = box.x + box.w,
    B = box.y + boxH(box);
  ms.forEach((m) => {
    L = Math.min(L, m.x - PAD);
    T = Math.min(T, m.y - TOP);
    R = Math.max(R, m.x + m.w + PAD);
    B = Math.max(B, m.y + nh(m) + PAD);
  });
  box.x = snap(L);
  box.y = snap(T);
  box.w = Math.ceil(R - box.x);
  box.uh = Math.ceil(B - box.y);
  applyNode(box);
}
document.addEventListener("click", (e) => {
  const b = e.target.closest && e.target.closest(".gtog");
  if (b) toggleGroupCollapse(get(b.closest(".node").dataset.id));
});
// al redimensionar un cuadro: los miembros que quedan fuera de él se liberan
function releaseResized(box) {
  if (box.gcol) return;
  const out = members(box.id).filter((m) => !centerIn(m, box));
  if (!out.length) return;
  out.forEach((m) => {
    delete m.grp;
    applyNode(m);
  });
  applyNode(box);
  refreshBoxes();
  renderEdges();
  toast(out.length > 1 ? "Nodos liberados del grupo" : "Fuera del grupo");
}
// nodos bloqueados a liberar: con selección múltiple, todos los seleccionados que estén bloqueados (y no viajen con su cuadro)
function lockTargets(n, d) {
  const all = sel.has(n.id) && sel.size > 1 ? [...sel].map(get) : [n];
  return all.filter((m) => isLocked(m) && !(d && d.starts.has(m.id)));
}
function releaseLocked(list) {
  list.forEach((m) => {
    delete m.grp;
    applyNode(m);
  });
  refreshBoxes();
  renderEdges();
  commit();
  toast(list.length > 1 ? "Nodos liberados del grupo" : "Liberado del grupo");
}
function lockStart(d, n) {
  const els_ = lockTargets(n, d).map((m) => els.get(m.id));
  els_.forEach((el) => el && el.classList.add("unlocking"));
  d.lockT = setTimeout(() => {
    d.lockT = 0;
    els_.forEach((el) => el && el.classList.remove("unlocking"));
    const list = lockTargets(n, d);
    if (!d.moved && list.length) releaseLocked(list);
  }, GROUP_UNLOCK);
}
// un nodo de un grupo nunca queda por detrás de su cuadro (se perdería si el cuadro tiene fondo): reordena y quita «al fondo»
function fixGroupOrder() {
  let any = false;
  for (let k = 0; k < board.nodes.length + 1; k++) {
    let ch = false;
    for (const m of board.nodes.slice()) {
      const box = m.grp && get(m.grp);
      if (!box) continue;
      if (m.back) {
        delete m.back;
        applyNode(m);
        ch = true;
      }
      const bi = board.nodes.indexOf(box);
      if (board.nodes.indexOf(m) < bi) {
        board.nodes.splice(board.nodes.indexOf(m), 1);
        board.nodes.splice(board.nodes.indexOf(box) + 1, 0, m);
        world.insertBefore(els.get(m.id), els.get(box.id).nextSibling);
        ch = true;
      }
    }
    if (!ch) break;
    any = true;
  }
  return any;
}
function lockCancel(d) {
  if (!d || !d.lockT) return;
  clearTimeout(d.lockT);
  d.lockT = 0;
  document.querySelectorAll(".node.unlocking").forEach((e) => e.classList.remove("unlocking"));
}
const members = (id) => board.nodes.filter((n) => n.grp === id);
// miembros del grupo de `id`, también los de grupos anidados
function groupAll(id) {
  const res = new Set(),
    st = [id];
  while (st.length) {
    const x = st.pop();
    board.nodes.forEach((n) => {
      if (n.grp === x && n.id !== id && !res.has(n.id)) {
        res.add(n.id);
        st.push(n.id);
      }
    });
  }
  return res;
}
const centerIn = (n, box) => {
  const cx = n.x + n.w / 2,
    cy = n.y + (n.type === "text" ? boxH(n) : nh(n)) / 2;
  return cx >= box.x && cx <= box.x + box.w && cy >= box.y && cy <= box.y + boxH(box);
};
// cuadro de texto más alto que contiene a n y queda por detrás de él (o enviado al fondo)
// Un grupo nunca anida otro grupo: un cuadro que ya tiene miembros no puede bloquearse dentro de otro, y un nodo que es
// miembro de un cuadro no puede convertirse a su vez en cuadro de grupo (un cuadro de texto «vacío» sí puede ser miembro).
const nestOK = (m, box) => !box.grp && !members(m.id).length;
function groupBoxFor(n) {
  const idx = board.nodes.indexOf(n),
    own = groupAll(n.id);
  if (members(n.id).length) return null;
  for (let i = board.nodes.length - 1; i >= 0; i--) {
    const m = board.nodes[i];
    if (m === n || m.type !== "text" || !isVis(m) || own.has(m.id) || m.grp) continue;
    if (!(m.back || i < idx)) continue;
    if (centerIn(n, m)) return m;
  }
  return null;
}
function joinGroup(n, box) {
  if (n.grp === box.id) return;
  n.grp = box.id;
  const before = board.edges.length;
  board.edges = board.edges.filter((e) => !((e.from === n.id && e.to === box.id) || (e.from === box.id && e.to === n.id)));
  fixGroupOrder();
  normGroupBox(box);
  applyNode(n);
  applyNode(box);
  refreshBoxes();
  renderEdges();
  toast(board.edges.length < before ? "Añadido al grupo (se quitó su conexión con el cuadro)" : "Añadido al grupo del cuadro de texto");
}
function leaveGroup(n) {
  delete n.grp;
  applyNode(n);
  refreshBoxes();
  renderEdges();
}
function clearDwell(d) {
  clearTimeout(d.dwT);
  d.dwT = 0;
  (d.dwIds || []).forEach((id) => els.get(id) && els.get(id).classList.remove("gdrop"));
  d.dwIds = [];
  d.dwKey = "";
}
// nodos libres que un cuadro de texto atrapa si se queda sobre ellos: los que tiene dentro y por delante de él
function captureCands(box, d) {
  const idx = board.nodes.indexOf(box),
    own = groupAll(box.id);
  if (box.grp) return []; // un miembro no puede capturar nodos: sería un grupo dentro de un grupo
  return board.nodes.filter(
    (m, i) =>
      m !== box && !m.grp && !members(m.id).length && isVis(m) && !own.has(m.id) && !d.starts.has(m.id) && (box.back || i > idx) && !groupAll(m.id).has(box.id) && centerIn(m, box),
  );
}
// ¿puede m entrar en el grupo de box? (dentro, por delante, sin ciclos)
function canJoin(m, box) {
  return nestOK(m, box) && m !== box && m.grp !== box.id && !groupAll(m.id).has(box.id) && (box.back || board.nodes.indexOf(m) > board.nodes.indexOf(box)) && centerIn(m, box);
}
function captureGroup(box, list) {
  let cut = 0;
  list.forEach((m) => {
    m.grp = box.id;
    const n0 = board.edges.length;
    board.edges = board.edges.filter((e) => !((e.from === m.id && e.to === box.id) || (e.from === box.id && e.to === m.id)));
    cut += n0 - board.edges.length;
    applyNode(m);
  });
  fixGroupOrder();
  normGroupBox(box);
  applyNode(box);
  refreshBoxes();
  renderEdges();
  toast(list.length === 1 ? "Añadido al grupo del cuadro de texto" : "Nodos atrapados en el grupo del cuadro de texto");
}
// durante el arrastre: si el nodo principal es un cuadro de texto que queda tras otros nodos, o un nodo sobre un cuadro,
// y se mantiene GROUP_DWELL ms, atrapa a los nodos de dentro / se une al cuadro
function dwellCheck(d) {
  const n = d.pid && get(d.pid);
  if (!n || !d.moved || !d.starts.has(n.id)) return; // un nodo bloqueado no se mueve ni cambia de grupo
  let kind = "",
    ids = [];
  if (n.type === "text") {
    ids = captureCands(n, d).map((m) => m.id);
    if (ids.length) kind = "cap";
  }
  if (!kind) {
    const box = d.starts.has(n.grp) ? null : groupBoxFor(n); // si su cuadro viaja con él, no cambia de grupo
    if (box && box.grp !== n.id && n.grp !== box.id) {
      kind = "join";
      ids = [box.id];
    }
  }
  const key = kind + ":" + ids.join(",");
  if (key === d.dwKey) return;
  clearDwell(d);
  if (!kind) return;
  d.dwKey = key;
  d.dwIds = ids;
  ids.forEach((id) => els.get(id).classList.add("gdrop"));
  d.dwT = setTimeout(() => {
    if (drag !== d) return clearDwell(d);
    if (kind === "join") {
      const b = get(ids[0]);
      clearDwell(d);
      if (!b) return;
      // selección múltiple: se unen todos los seleccionados que estén dentro (y por delante) del cuadro
      const many = sel.size > 1 ? [...sel].map(get).filter((m) => m && d.starts.has(m.id) && !d.starts.has(m.grp) && canJoin(m, b)) : [];
      if (many.length > 1) captureGroup(b, many);
      else joinGroup(n, b);
    } else {
      const list = captureCands(n, d); // vuelve a calcular: lo que siga dentro en este momento
      clearDwell(d);
      if (list.length) captureGroup(n, list);
    }
  }, GROUP_DWELL);
}
