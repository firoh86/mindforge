"use strict";
/* =====================  Crear / borrar  ===================== */
function addNode(type, x, y, extra = {}) {
  const { noEdit, parent, parentDir, ...rest } = extra;
  const w = rest.w ?? SIZE[type][0],
    h = rest.h ?? SIZE[type][1];
  if (x == null) {
    const c = viewCenter(),
      off = (board.nodes.length % 6) * GRID;
    x = c.x - w / 2 + off;
    y = c.y - h / 2 + off;
  } else {
    x -= w / 2;
    y -= h / 2;
  }
  const n = {
    id: uid(),
    type,
    x: snap(x),
    y: snap(y),
    w,
    h,
    color: nextColor && !(nextColor === "outline" && type !== "text") ? nextColor : DEF[type],
    html:
      type === "comment"
        ? t("Escribe tu nota…")
        : type === "task"
          ? t("Describe la tarea…")
          : type === "text"
          ? t("Texto")
          : t("Nuevo nodo"),
    title: "Comentario",
    collapsed: false,
    ...(COLORABLE.includes(type)
      ? {
          font: LF.font,
          fs: LF.fs || undefined,
          b: LF.b,
          i: LF.i,
          u: LF.u,
        }
      : { font: "Inter" }),
    ...rest,
  };
  if (type === "task") {
    if (!rest.title) n.title = "Tarea";
    n.status = rest.status || "todo";
  }
  if (type === "palette") {
    n.title = "Paleta";
    n.color = "auto";
    n.gen = {
      h: Math.round(Math.random() * 360),
      s: 70,
      l: 55,
      mode: "analog",
      n: 5,
    };
    n.colors = genPalette(n.gen);
    n.selChip = 0;
  }
  if (type === "pixel") {
    n.title = "Pixel art";
    n.color = "auto";
    n.pw = 16;
    n.ph = 16;
    n.rle = [256, 0];
    n.bgOn = false;
    n.bgColor = "#ffffff";
    n.h = PXH + PXF + Math.round((n.w * n.ph) / n.pw);
  }
  if (type === "palette") inspPos = null; // cada nodo nuevo recoloca su panel
  if (type === "pixel") delete $("#pxinsp").dataset.placed;
  board.nodes.push(n);
  if (parent) board.edges.push({ id: uid(), from: parent, to: n.id, ...(parentDir ? { dir: parentDir } : {}) }); // hijo: conexión desde el padre
  mkNode(n);
  setSel([n.id]);
  commit();
  if (!noEdit && COLORABLE.includes(type))
    setTimeout(() => startEdit(n, "content"), 30);
  return n;
}
async function deleteSelection() {
  if (selEdge) {
    board.edges = board.edges.filter((e) => e.id !== selEdge);
    selEdge = null;
    renderEdges();
    commit();
    return;
  }
  if (!sel.size) return;
  const del = new Set(sel);
  // cuadros de texto con grupo: ¿borrar todo el grupo o solo el cuadro (liberando los nodos)?
  const boxes = [...sel].map(get).filter((n) => n && members(n.id).some((m) => !sel.has(m.id)));
  if (boxes.length) {
    const r = await dialog("Este cuadro de texto tiene un grupo de nodos. ¿Eliminar todo el grupo o solo el cuadro de texto (los nodos del grupo quedan libres)?", {
      yes: "Eliminar todo el grupo",
      alt: "Solo el cuadro",
    });
    if (!r) return;
    if (r === true) boxes.forEach((b) => groupAll(b.id).forEach((i) => del.add(i)));
    else boxes.forEach((b) => members(b.id).forEach((m) => (b.grp ? (m.grp = b.grp) : delete m.grp))); // quedan libres (o pasan al grupo superior)
  }
  board.nodes = board.nodes.filter((n) => {
    if (del.has(n.id)) {
      els.get(n.id).remove();
      els.delete(n.id);
      PX.delete(n.id);
      return false;
    }
    return true;
  });
  board.edges = board.edges.filter(
    (e) => !del.has(e.from) && !del.has(e.to),
  );
  sel.clear();
  board.nodes.forEach(applyNode);
  renderEdges();
  commit();
  updateInspector();
}
async function clearAll() {
  if (!board.nodes.length) return toast(t("No hay nodos que borrar"));
  if (
    !(await dialog(
      "¿Eliminar todos los nodos del lienzo? Podrás deshacerlo con Ctrl+Z.",
    ))
  )
    return;
  board.nodes = [];
  board.edges = [];
  sel.clear();
  selEdge = null;
  renderAll();
  commit();
}
function duplicate() {
  if (!sel.size) return;
  const map = new Map(),
    news = [];
  sel.forEach((id) => {
    const n = JSON.parse(JSON.stringify(get(id)));
    n.id = uid();
    delete n.fold;
    n.x += GRID * 2;
    n.y += GRID * 2;
    map.set(id, n.id);
    news.push(n);
  });
  news.forEach((n) => (map.has(n.grp) ? (n.grp = map.get(n.grp)) : delete n.grp)); // el grupo se conserva si se copia entero
  board.nodes.push(...news);
  news.forEach(mkNode);
  board.edges
    .filter((e) => map.has(e.from) && map.has(e.to))
    .forEach((e) =>
      board.edges.push({
        id: uid(),
        from: map.get(e.from),
        to: map.get(e.to),
        label: e.label,
        ...(e.dir ? { dir: e.dir } : {}),
      }),
    );
  setSel(news.map((n) => n.id));
  commit();
}
function toFront(n) {
  board.nodes = board.nodes.filter((x) => x !== n);
  board.nodes.push(n);
  delete n.back;
  world.appendChild(els.get(n.id));
  applyNode(n);
  fixGroupOrder();
  renderEdges();
  commit();
}
function toBack(n) {
  board.nodes = board.nodes.filter((x) => x !== n);
  board.nodes.unshift(n);
  n.back = true;
  world.insertBefore(els.get(n.id), world.querySelector(".node"));
  applyNode(n);
  if (fixGroupOrder()) toast("Un nodo de un grupo no puede quedar por detrás de su cuadro de texto");
  renderEdges();
  commit();
}
