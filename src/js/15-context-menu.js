"use strict";
/* =====================  Menú contextual  ===================== */
const menuEl = $("#menu");
/* Buscador de nodos: resalta coincidencias al escribir; Enter las selecciona y centra la vista */
const normTxt = (t) => String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
function nodeTitle(n) {
  const def = { comment: "Comentario", task: "Tarea", pixel: "Pixel art", palette: "Paleta de color" };
  if (def[n.type]) return n.title || def[n.type];
  if (n.type === "image") return n.name || "";
  const d = document.createElement("div");
  d.innerHTML = n.html || "";
  return d.textContent;
}
function clearSearch() {
  world.classList.remove("searching");
  els.forEach((e) => e.classList.remove("found"));
}
function searchNodes(q) {
  clearSearch();
  q = normTxt(q);
  if (!q) return [];
  const ids = visNodes().filter((n) => normTxt(nodeTitle(n)).includes(q)).map((n) => n.id);
  world.classList.add("searching");
  ids.forEach((id) => els.get(id) && els.get(id).classList.add("found"));
  return ids;
}
function showMenu(x, y, items) {
  menuEl.innerHTML = "";
  items.forEach((it) => {
    if (it !== "-" && it.search === true) {
      const w = document.createElement("div");
      w.className = "msearch";
      w.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input type="text" placeholder="Buscar nodos…" spellcheck="false">';
      const inp = w.querySelector("input");
      inp.oninput = () => searchNodes(inp.value);
      inp.onkeydown = (e) => {
        e.stopPropagation();
        if (e.key === "Escape") hideMenu();
        if (e.key !== "Enter") return;
        e.preventDefault();
        const ids = searchNodes(inp.value);
        if (!ids.length) return toast("Sin coincidencias");
        hideMenu();
        setSel(ids);
        fit();
      };
      menuEl.appendChild(w);
      setTimeout(() => inp.focus(), 0);
      return;
    }
    if (it === "-") {
      const s = document.createElement("div");
      s.className = "msep";
      menuEl.appendChild(s);
      return;
    }
    const b = document.createElement("button");
    b.textContent = it.label;
    b.onclick = () => {
      hideMenu();
      it.fn();
    };
    menuEl.appendChild(b);
  });
  menuEl.style.display = "block";
  menuEl.style.left =
    Math.min(x, innerWidth - menuEl.offsetWidth - 6) + "px";
  menuEl.style.top =
    Math.min(y, innerHeight - menuEl.offsetHeight - 6) + "px";
}
const hideMenu = () => {
  clearLinkMenu();
  clearSearch();
  menuEl.style.display = "none";
};
window.addEventListener(
  "pointerdown",
  (e) => {
    if (!e.target.closest("#menu")) hideMenu();
  },
  true,
);
/* Clic derecho sobre una bolita de conexión: menú rápido para propagar un nodo hijo. Mientras está abierto se ve la
   flecha de puntos desde la bolita hasta el punto elegido; al crear el nodo queda como una conexión normal, y si el ratón
   sale del menú (o se cierra de cualquier otra forma) se cancela todo. */
let linkMenuOn = false,
  linkMenuTimer = 0;
function clearLinkMenu() {
  if (!linkMenuOn) return;
  linkMenuOn = false;
  clearTimeout(linkMenuTimer);
  menuEl.onmouseenter = menuEl.onmouseleave = null;
  const t = $("#tmp");
  t.classList.remove("dots");
  t.setAttribute("d", "");
}
function linkMenu(id, side, e) {
  const a = get(id),
    p = toWorld(e.clientX, e.clientY),
    mk = (type) => () => addNode(type, p.x, p.y, { parent: id });
  showMenu(e.clientX - 12, e.clientY - 12, [
    { label: "＋ Globo", fn: mk("bubble") },
    { label: "＋ Cuadro de texto", fn: mk("text") },
    { label: "＋ Comentario", fn: mk("comment") },
    { label: "＋ Tarea", fn: mk("task") },
    { label: "＋ Imagen…", fn: () => pickImages(p, id) },
    { label: "＋ Paleta de color", fn: mk("palette") },
    { label: "＋ Pixel art", fn: mk("pixel") },
  ]);
  linkMenuOn = true; // la flecha de puntos (#tmp.dots) se queda hasta el punto de suelta mientras el menú esté abierto
  const t = $("#tmp");
  t.classList.add("dots");
  t.setAttribute("d", rounded(route(sideP(a, side), p)));
  menuEl.onmouseenter = () => clearTimeout(linkMenuTimer);
  menuEl.onmouseleave = () => {
    clearTimeout(linkMenuTimer);
    linkMenuTimer = setTimeout(hideMenu, 120);
  };
}
canvas.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  if (e.target.closest(".ch")) return; // el menú de la bolita lo abre el arrastre con clic derecho (al soltar)
  if (performance.now() - rcMarqAt < 500) return; // acaba de terminar un recuadro con clic derecho
  if (drag && drag.rc) {
    // macOS/Linux lanzan el menú al pulsar: se aplaza hasta soltar, por si el clic derecho era el inicio de un recuadro
    drag.ctx = { t: e.target, x: e.clientX, y: e.clientY };
    return;
  }
  if (e.target.closest(".pxwrap") && !organizing()) return; // en el lienzo de pixel art el clic derecho dibuja/borra
  const p = toWorld(e.clientX, e.clientY),
    nodeEl = e.target.closest(".node"),
    edgeEl = e.target.closest(EDGE_SEL);
  if (edgeEl) {
    const id = edgeEl.getAttribute("data-e");
    setSel([], id);
    const ed = board.edges.find((x) => x.id === id),
      cur = (ed && ed.dir) || "fwd",
      setDir = (v) => {
        if (!ed) return;
        if (v === "fwd") delete ed.dir;
        else ed.dir = v;
        renderEdges();
        commit();
      },
      chk = (v) => (cur === v ? "✓ " : "\u2003");
    showMenu(e.clientX, e.clientY, [
      { label: "Poner / editar texto", fn: () => editEdgeLabel(id) },
      "-",
      { label: chk("fwd") + "Flecha →", fn: () => setDir("fwd") },
      { label: chk("rev") + "Flecha invertida ←", fn: () => setDir("rev") },
      { label: chk("both") + "Flecha bidireccional ↔", fn: () => setDir("both") },
      "-",
      { label: "Eliminar conexión", fn: deleteSelection },
    ]);
  } else if (nodeEl) {
    const n = get(nodeEl.dataset.id);
    if (!sel.has(n.id)) setSel([n.id]);
    if (sel.size > 1) {
      const grp = board.nodes.filter((x) => sel.has(x.id));
      showMenu(e.clientX, e.clientY, [
        { label: "Duplicar", fn: duplicate },
        {
          label: "Traer al frente",
          fn: () => {
            grp.forEach((x) => {
              board.nodes = board.nodes.filter((y) => y !== x);
              board.nodes.push(x);
              delete x.back;
              world.appendChild(els.get(x.id));
            });
            fixGroupOrder();
            board.nodes.forEach(applyNode);
            renderEdges();
            commit();
          },
        },
        {
          label: "Enviar al fondo",
          fn: () => {
            [...grp].reverse().forEach((x) => {
              board.nodes = board.nodes.filter((y) => y !== x);
              board.nodes.unshift(x);
              x.back = true;
              world.insertBefore(els.get(x.id), world.querySelector(".node"));
            });
            fixGroupOrder();
            board.nodes.forEach(applyNode);
            renderEdges();
            commit();
          },
        },
        "-",
        { label: `Eliminar ${sel.size} elementos`, fn: deleteSelection },
      ]);
      return;
    }
    const items = [];
    if (COLORABLE.includes(n.type))
      items.push({
        label: "Editar texto",
        fn: () => startEdit(n, "content"),
      });
    const base = items.length; // Editar texto y Duplicar / orden van juntos; solo se separan si hay acciones propias del tipo en medio
    if (n.type === "task") items.push({ label: "Añadir subtarea", fn: () => addSub(n) });
    if (n.type === "task" && !hasSubs(n))
      TASK_ORDER.forEach((k) =>
        items.push({
          label: (n.status === k || (!n.status && k === "todo") ? "✓ " : "\u2003") + TASK_ST[k].label,
          fn: () => setTaskStatus(n, k),
        }),
      );
    if (n.type === "task") items.push("-");
    if (n.type === "image") {
      items.push({
        label: "Ver imagen ampliada",
        fn: () => openLightbox(board.images[n.img]),
      });
      items.push({ label: "Recortar imagen", fn: () => startCrop(n) });
      const ow = n.nw ? Math.round(n.nw * (n.crop ? n.crop.w : 1)) : null,
        oh = n.nw ? Math.round(n.nh * (n.crop ? n.crop.h : 1)) : null;
      if (ow == null || Math.abs(n.w - ow) >= 1 || Math.abs(n.h - oh) >= 1)
        items.push({
          label: "Restaurar tamaño original",
          fn: () => restoreImage(n),
        });
      if (n.crop)
        items.push({
          label: "Restaurar recorte",
          fn: () => restoreCrop(n),
        });
      items.push("-", { label: "Guardar como…", fn: () => exportImage(n) });
    }
    if (n.type === "pixel")
      [1, 8, 32].forEach((s) =>
        items.push({
          label: `Exportar PNG x${s}`,
          fn: () => exportPixel(n, s),
        }),
      );
    if (nodeEl.dataset.url)
      items.push({
        label: "Abrir enlace ↗",
        fn: () => openUrl(nodeEl.dataset.url),
      });
    if (items.length > base && items[items.length - 1] !== "-") items.push("-");
    items.push(
      { label: "Duplicar", fn: duplicate },
      ...(isGroupBox(n) ? [{ label: n.gcol ? "Expandir grupo" : "Contraer grupo", fn: () => toggleGroupCollapse(n) }] : []),
      { label: "Traer al frente", fn: () => toFront(n) },
      { label: "Enviar al fondo", fn: () => toBack(n) },
      "-",
      { label: "＋ Nodo hijo (Tab)", fn: () => addChild(n) },
      { label: "＋ Nodo hermano (Ctrl+Enter)", fn: () => addSibling(n) },
    );
    if (hasKids(n))
      items.push({ label: n.fold ? "Desplegar rama (/)" : "Plegar rama (/)", fn: () => toggleFold(n.id) });
    items.push("-", { label: "Eliminar", fn: deleteSelection });
    showMenu(e.clientX, e.clientY, items);
  } else {
    showMenu(e.clientX, e.clientY, [
      { search: true },
      "-",
      { label: "＋ Globo", fn: () => addNode("bubble", p.x, p.y) },
      {
        label: "＋ Cuadro de texto",
        fn: () => addNode("text", p.x, p.y),
      },
      { label: "＋ Comentario", fn: () => addNode("comment", p.x, p.y) },
      { label: "＋ Tarea", fn: () => addNode("task", p.x, p.y) },
      { label: "＋ Imagen…", fn: () => pickImages(p) },
      {
        label: "＋ Paleta de color",
        fn: () => addNode("palette", p.x, p.y),
      },
      { label: "＋ Pixel art", fn: () => addNode("pixel", p.x, p.y) },
      "-",
      {
        label: "Seleccionar todo",
        fn: () => setSel(visNodes().map((n) => n.id)),
      },
      { label: "Centrar vista", fn: fit },
      { label: board.mainOnly ? "Ver todo" : "Ver principal", fn: toggleMainOnly },
    ]);
  }
});
document.addEventListener("contextmenu", (e) => {
  if (
    e.target.closest("#canvas") ||
    e.target.isContentEditable ||
    /^(INPUT|TEXTAREA)$/.test(e.target.tagName)
  )
    return;
  e.preventDefault();
});
