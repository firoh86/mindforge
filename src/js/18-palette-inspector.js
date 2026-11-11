"use strict";
/* =====================  Inspector de paletas  ===================== */
let adjBase = null;
const pal = () =>
  [...sel].map(get).find((n) => n && n.type === "palette");
const setRange = (id, v) => {
  const r = $("#" + id);
  r.value = v;
  r.parentElement.querySelector("b").textContent = v;
};
document
  .querySelectorAll("#insp input[type=range], #pxinsp input[type=range]")
  .forEach((r) =>
    r.addEventListener("input", () => {
      r.parentElement.querySelector("b").textContent = r.value;
    }),
  );
function resetAdj() {
  adjBase = null;
  ["dH", "dS", "dL"].forEach((id) => setRange(id, 0));
}
function updatePal() {
  const n = pal(),
    box = $("#insp");
  if (!n) {
    box.hidden = true;
    adjBase = null;
    return;
  }
  box.hidden = false;
  resetAdj();
  queuePos();
  $("#pTitle").value = tdef(n.title || "");
  $("#pMode").value = n.gen.mode;
  $("#pLib").value = n.lib || "";
  setRange("pH", Math.round(n.gen.h));
  setRange("pS", n.gen.s);
  setRange("pL", n.gen.l);
  setRange("pN", n.colors.length);
  n.selChip = clamp(n.selChip || 0, 0, n.colors.length - 1);
}
function regen(n) {
  const g = n.gen;
  g.h = +$("#pH").value;
  g.s = +$("#pS").value;
  g.l = +$("#pL").value;
  g.n = +$("#pN").value;
  g.mode = $("#pMode").value;
  n.colors = genPalette(g);
  n.selChip = Math.min(n.selChip || 0, n.colors.length - 1);
  n.lib = "";
  $("#pLib").value = "";
  resetAdj();
  renderPalette(n);
}
function fitPaletteNode(n) {
  const m = palMins(n);
  n.w = Math.max(n.w, m.w);
  n.h = Math.max(n.h, Math.ceil(m.h / (n.view === "dots" || n.view === "list" ? 1 : GRID)) * (n.view === "dots" || n.view === "list" ? 1 : GRID));
  if ((n.view || "grid") === "dots") n.h = palAutoSize(n, "dots").h; // los puntos siempre ajustan su altura
  applyNode(n);
  renderEdges();
}
// tamaño automático del nodo para una vista (se usa al cambiar de vista la primera vez)
function palAutoSize(n, v) {
  const len = n.colors.length,
    m = palMins({ colors: n.colors, view: v }, n.w);
  if (v === "dots") {
    const g = len > 24 || n.w - 20 < 260 ? 2 : 4,
      cols = Math.max(1, Math.floor((n.w - 20 + g) / (22 + g))),
      rows = Math.ceil(len / cols);
    return { w: Math.max(n.w, m.w), h: Math.max(m.h, CH + 10 + rows * 22 + (rows - 1) * g + 4) };
  }
  if (v === "list") return { w: Math.max(n.w, m.w), h: CH + 10 + Math.min(len, 10) * 24 };
  if (v === "strip") return { w: Math.max(n.w, m.w), h: CH + 10 + 80 };
  return { w: Math.max(n.w, m.w, 300), h: Math.max(m.h, 260) };
}
// cambia de vista recordando el tamaño que tenía cada una
function palSetView(n, v) {
  (n.vs = n.vs || {})[n.view || "grid"] = [n.w, n.h];
  n.view = v;
  const sv = n.vs[v],
    sz = sv ? { w: sv[0], h: sv[1] } : palAutoSize(n, v);
  n.w = sz.w;
  n.h = sz.h;
  fitPaletteNode(n);
  renderPalette(n);
  commit();
}
// añadir / quitar / mover colores directamente desde el nodo
function palAdd(n) {
  if (n.colors.length >= MAXCOL) {
    toast(`Máximo ${MAXCOL} colores por paleta`);
    return;
  }
  const [h, s, l] = hex2hsl(n.colors[n.colors.length - 1]);
  n.colors.push(hsl2hex(h + 30, s, l));
  n.selChip = n.colors.length - 1;
  n.gen.n = n.colors.length;
  fitPaletteNode(n);
  renderPalette(n);
  updateInspector();
  commit();
}
function palRand(n) {
  const modes = [...$("#pMode").options].map((o) => o.value),
    g = n.gen;
  g.h = Math.round(Math.random() * 360);
  g.s = 55 + Math.round(Math.random() * 35);
  g.l = 45 + Math.round(Math.random() * 20);
  g.mode = modes[Math.floor(Math.random() * modes.length)];
  g.n = n.colors.length;
  n.colors = genPalette(g);
  n.selChip = Math.min(n.selChip || 0, n.colors.length - 1);
  n.lib = "";
  renderPalette(n);
  updateInspector();
  commit();
}
function palDel(n, i) {
  if (n.colors.length <= 1) return;
  n.colors.splice(i, 1);
  fitPaletteNode(n);
  if (n.selChip > i || n.selChip >= n.colors.length) n.selChip = Math.max(0, n.selChip - 1);
  n.gen.n = n.colors.length;
  renderPalette(n);
  updateInspector();
  commit();
}
// intercambia las posiciones de dos chips; el chip activo sigue a su color
function palMove(n, from, to) {
  const idx = n.colors.map((_, k) => k);
  [idx[from], idx[to]] = [idx[to], idx[from]];
  n.colors = idx.map((k) => n.colors[k]);
  n.selChip = idx.indexOf(n.selChip);
  renderPalette(n);
  updateInspector();
  commit();
}
["pH", "pS", "pL", "pN"].forEach((id) => {
  $("#" + id).addEventListener("input", () => {
    const n = pal();
    if (n) regen(n);
  });
  $("#" + id).addEventListener("change", () => {
    const n = pal();
    if (n && id === "pN") {
      fitPaletteNode(n);
      renderPalette(n);
    }
    commit();
  });
});
$("#pMode").addEventListener("change", () => {
  const n = pal();
  if (n) {
    regen(n);
    commit();
  }
});
$("#pGen").onclick = () => {
  const n = pal();
  if (n) {
    regen(n);
    commit();
  }
};
$("#pLib").addEventListener("change", (e) => {
  const n = pal(),
    lib = libByName(e.target.value);
  if (!n || !lib) return;
  n.colors = lib.c.slice(0, MAXCOL);
  n.title = lib.name;
  n.lib = lib.name;
  n.gen.n = n.colors.length;
  n.selChip = 0;
  fitPaletteNode(n);
  renderPalette(n);
  updateInspector();
  commit();
});
$("#pTitle").addEventListener("input", (e) => {
  const n = pal();
  if (n) {
    n.title = e.target.value;
    renderPalette(n);
  }
});
$("#pTitle").addEventListener("change", () => commit());
["dH", "dS", "dL"].forEach((id) => {
  $("#" + id).addEventListener("input", () => {
    const n = pal();
    if (!n) return;
    if (!adjBase) adjBase = n.colors.slice();
    const dh = +$("#dH").value,
      ds = +$("#dS").value,
      dl = +$("#dL").value;
    n.colors = adjBase.map((c) => {
      const [h, s, l] = hex2hsl(c);
      return hsl2hex(h + dh, s + ds, l + dl);
    });
    renderPalette(n);
  });
  $("#" + id).addEventListener("change", () => {
    const n = pal();
    if (n) {
      commit();
      resetAdj();
    }
  });
});

/* ---------- ordenar los chips de la paleta (botón ▾ de la cabecera) ---------- */
const PSORTS = [
  ["Ordenar por tono", (c) => hex2hsl(c)[0]],
  ["Ordenar por saturación", (c) => hex2hsl(c)[1]],
  ["Ordenar por brillo", (c) => Math.max(...hexRGB(c))],
  ["Ordenar por luminancia", (c) => lum(c)],
  ["Ordenar por rojo", (c) => hexRGB(c)[0]],
  ["Ordenar por verde", (c) => hexRGB(c)[1]],
  ["Ordenar por azul", (c) => hexRGB(c)[2]],
];
let sortDesc = false,
  sortNode = null,
  sortBtn = null,
  sortTimer = 0;
function palSort(n, fn) {
  const cur = n.colors[n.selChip],
    keyed = n.colors.map((c, i) => ({ c, i, k: fn(c) }));
  keyed.sort((a, b) => (a.k - b.k || a.i - b.i) * (sortDesc ? -1 : 1));
  n.colors = keyed.map((x) => x.c);
  n.selChip = Math.max(0, keyed.findIndex((x) => x.i === n.selChip));
  renderPalette(n);
  updateInspector();
  commit();
}
function sortMenuClose() {
  clearTimeout(sortTimer);
  const m = $("#sortMenu");
  if (m) m.classList.remove("open");
}
function palSortMenu(n, btn) {
  let m = $("#sortMenu");
  if (!m) {
    m = document.createElement("div");
    m.id = "sortMenu";
    document.body.appendChild(m);
    const arm = () => {
      clearTimeout(sortTimer);
      sortTimer = setTimeout(sortMenuClose, 280);
    };
    m.addEventListener("mouseenter", () => clearTimeout(sortTimer));
    m.addEventListener("mouseleave", arm);
    document.addEventListener("pointerdown", (e) => {
      if (!e.target.closest("#sortMenu, .psort")) sortMenuClose();
    });
    document.addEventListener("keydown", (e) => e.key === "Escape" && sortMenuClose());
    m._arm = arm;
  }
  if (m.classList.contains("open") && sortBtn === btn) return sortMenuClose();
  sortNode = n;
  sortBtn = btn;
  const draw = () => {
    m.innerHTML = "";
    const add = (label, fn) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.onclick = fn;
      m.appendChild(b);
    };
    PSORTS.forEach(([lab, fn]) => add(t(lab), () => palSort(sortNode, fn)));
    const sep = document.createElement("div");
    sep.className = "msep";
    m.appendChild(sep);
    add((sortDesc ? "\u2003" : "\u2713 ") + t("Ascendente"), () => ((sortDesc = false), draw()));
    add((sortDesc ? "\u2713 " : "\u2003") + t("Descendente"), () => ((sortDesc = true), draw()));
  };
  draw();
  m.style.setProperty("--dd-from", "4px");
  m.style.visibility = "hidden";
  m.classList.add("open");
  // siempre fuera de los chips: encima del nodo; si arriba no cabe, a su derecha o a su izquierda
  const r = btn.getBoundingClientRect(),
    nr = btn.closest(".node").getBoundingClientRect(),
    w = m.offsetWidth,
    h = m.offsetHeight;
  let top = nr.top - h - 4,
    left = r.left;
  if (top < 8) {
    m.style.setProperty("--dd-from", "0px");
    top = Math.max(8, Math.min(r.top, innerHeight - h - 8));
    left = nr.right + 6 + w <= innerWidth - 8 ? nr.right + 6 : nr.left - w - 6;
    if (left < 8) {
      top = Math.min(nr.top - h - 4 < 8 ? 8 : nr.top - h - 4, innerHeight - h - 8); // sin sitio: pegado arriba
      left = r.left;
    }
  }
  m.style.top = top + "px";
  m.style.left = Math.max(8, Math.min(left, innerWidth - w - 8)) + "px";
  m.style.visibility = "";
  btn.onmouseleave = m._arm;
  btn.onmouseenter = () => clearTimeout(sortTimer);
}
