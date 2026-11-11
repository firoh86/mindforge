"use strict";
/* =====================  Inspector de Pixel art  ===================== */
const pxNode = () =>
  [...sel].map(get).find((n) => n && n.type === "pixel");
function renderPxColors() {
  const sw = (list, box) => {
    box.innerHTML = list
      .map(
        (c) =>
          `<i data-c="${c}" style="background:${c}" title="${c.toUpperCase()}" class="${c.toLowerCase() === px.color.toLowerCase() ? "cur" : ""}"></i>`,
      )
      .join("");
  };
  const lib = libByName(px.lib);
  sw(lib ? lib.c : [], $("#xSw"));
  sw(px.recent, $("#xRecent"));
}
function updatePxInsp() {
  pxSyncAll();
  const n = pxNode(),
    box = $("#pxinsp");
  if (!n) {
    box.hidden = true;
    closeKeys(); // la tarjeta de pixel art perdió el foco: el panel de atajos se cierra siempre
    return;
  }
  box.hidden = false;
  layoutPxInsp();
  $("#xTitle").value = tdef(n.title || "");
  $("#xW").value = n.pw;
  $("#xH").value = n.ph;
  $("#xBgOn").checked = !!n.bgOn;
  $("#xBgCol").value = n.bgColor || "#ffffff";
  $("#xLib").value = px.lib;
  document
    .querySelectorAll("#xScale .btn")
    .forEach((b) => b.classList.toggle("on", +b.dataset.s === px.scale));
  renderPxColors();
}
function updateInspector() {
  updatePal();
  updatePxInsp();
  updateFmt();
}
$("#xTitle").addEventListener("input", (e) => {
  const n = pxNode();
  if (n) {
    n.title = e.target.value;
    els.get(n.id).querySelector(".ttl").textContent =
      n.title || "Pixel art";
  }
});
$("#xTitle").addEventListener("change", () => commit());
$("#xApply").onclick = () => {
  const n = pxNode();
  if (n) pxResize(n, +$("#xW").value, +$("#xH").value);
};
document.querySelectorAll("[data-sz]").forEach((b) =>
  b.addEventListener("click", () => {
    const n = pxNode();
    if (n) pxResize(n, +b.dataset.sz, +b.dataset.sz);
  }),
);
$("#xLib").addEventListener("change", (e) => {
  px.lib = e.target.value;
  renderPxColors();
});
["#xSw", "#xRecent"].forEach((s) =>
  $(s).addEventListener("click", (e) => {
    const i = e.target.closest("i");
    if (i) setPxColor(i.dataset.c);
  }),
);
$("#xBgOn").addEventListener("change", (e) => {
  const n = pxNode();
  if (n) {
    n.bgOn = e.target.checked;
    pxBg(n);
    commit();
  }
});
$("#xBgCol").addEventListener("input", (e) => {
  const n = pxNode();
  if (n) {
    n.bgColor = e.target.value;
    pxBg(n);
  }
});
$("#xBgCol").addEventListener("change", () => commit());
$("#xBgFill").onclick = () => {
  const n = pxNode();
  if (n) {
    n.bgColor = px.color;
    n.bgOn = true;
    $("#xBgCol").value = px.color;
    $("#xBgOn").checked = true;
    pxBg(n);
    commit();
  }
};
function setPxGrid(on) {
  px.grid = !!on;
  world.classList.toggle("nogrid", !px.grid);
  document.querySelectorAll(".pgrid").forEach((b) => b.classList.toggle("on", px.grid));
}
$("#xClear").onclick = () => {
  const n = pxNode();
  if (!n) return;
  const st = PX.get(n.id);
  st.buf.fill(0);
  pxRender(n);
  pxCommit(n);
};
$("#xScale").addEventListener("click", (e) => {
  const b = e.target.closest("[data-s]");
  if (b) {
    px.scale = +b.dataset.s;
    updatePxInsp();
  }
});
$("#xExport").onclick = () => {
  const n = pxNode();
  if (n) exportPixel(n);
};

// Arrastrar el panel flotante de Pixel Art desde su cabecera (.phead); limitado al área de trabajo.
// El submenú de atajos lo sigue y se recoloca a un lado u otro según el espacio.
$("#pxinsp .phead").addEventListener("pointerdown", (e) => {
  if (e.target.closest("button")) return;
  e.preventDefault();
  dragFixed($("#pxinsp"), e, positionKeys);
});
