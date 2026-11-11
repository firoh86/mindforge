"use strict";
/* =====================  Pixel art: iconos, atajos, sincronía  ===================== */
const PICONS = {
  pencil:
    '<path d="M4 20l1.2-4.8L16.5 3.9a2 2 0 0 1 2.8 0l.8.8a2 2 0 0 1 0 2.8L8.8 18.8z"/><path d="M14.5 6l3.5 3.5"/>',
  eraser:
    '<path d="M20 20H9L3.6 14.6a2 2 0 0 1 0-2.8l8.2-8.2a2 2 0 0 1 2.8 0l5.8 5.8a2 2 0 0 1 0 2.8L12 19"/><path d="M7 11l6 6"/>',
  bucket:
    '<path d="M4 12l7-7 8 8-7 7z"/><path d="M20.5 16c1 1.4 1.5 2.2 1.5 3a1.6 1.6 0 0 1-3.2 0c0-.8.7-1.6 1.7-3z"/>',
  lasso:
    '<ellipse cx="11" cy="9" rx="8" ry="5" stroke-dasharray="3 2.5"/><path d="M7.5 13c-1.2 3 0 6 3.5 6.5"/>',
  wand:
    '<path d="M4.5 19.5L13 11"/><path d="M16 3.5l1.1 2.4 2.4 1.1-2.4 1.1L16 10.5l-1.1-2.4-2.4-1.1 2.4-1.1z"/><path d="M19.5 14v3M18 15.5h3M6 4v3M4.5 5.5h3"/>',
  marquee:
    '<rect x="4" y="5" width="16" height="14" rx="1" stroke-dasharray="3 2.5"/>',
  picker:
    '<path d="M15.5 3.5l5 5-3 3-5-5z"/><path d="M12.5 7.5L4 16v4h4l8.5-8.5"/>',
};
const ptoolsHtml = () =>
  ["pencil", "eraser", "bucket", "picker", "marquee", "lasso", "wand"]
    .map(
      (t) =>
        `<button data-tool="${t}"><svg viewBox="0 0 24 24">${PICONS[t]}</svg></button>`,
    )
    .join("");
const PXKEYS_DEF = {
  pencil: "b",
  eraser: "e",
  bucket: "g",
  picker: "i",
  marquee: "m",
  lasso: "l",
  wand: "w",
};
const TOOLNAME = {
  pencil: "Lápiz",
  eraser: "Goma",
  bucket: "Cubo",
  picker: "Cuentagotas",
  marquee: "Cuadrado",
  lasso: "Lazo",
  wand: "Varita mágica",
};
let pxKeys = Object.assign({}, PXKEYS_DEF, UI.pxKeys || {});
const keyTool = (k) => Object.keys(pxKeys).find((t) => pxKeys[t] === k);
function pxFoot(n) {
  const i = els.get(n.id).querySelector(".pinfo");
  if (i) i.textContent = `${n.pw} × ${n.ph} px`;
}
function pxSyncAll() {
  document.body.classList.toggle("picking", px.tool === "picker");
  document
    .querySelectorAll(".pixel .ptools button")
    .forEach((b) => b.classList.toggle("on", b.dataset.tool === px.tool));
  document.querySelectorAll(".pixel .psl input").forEach((i) => {
    i.value = px.size;
  });
  pxCursor();
  document.querySelectorAll(".pgrid").forEach((b) => b.classList.toggle("on", px.grid));
  document.querySelectorAll(".pixel .ptip button").forEach((b) => {
    b.dataset.tip = px.tip;
    b.title = px.tip === "circle" ? "Punta circular — clic para cambiar a cuadrada" : "Punta cuadrada — clic para cambiar a circular";
    b.firstElementChild.innerHTML = px.tip === "circle" ? '<circle cx="12" cy="12" r="10"/>' : '<rect x="3.5" y="3.5" width="17" height="17"/>';
  });
  document.querySelectorAll(".pixel .psl b").forEach((b) => {
    b.textContent = px.size;
  });
  document.querySelectorAll("[data-tool]").forEach((b) => {
    b.title = `${TOOLNAME[b.dataset.tool]} (${(pxKeys[b.dataset.tool] || "").toUpperCase()})`;
  });
}
/* panel de atajos */
let tmpKeys = null,
  capTool = null;
function renderKeys() {
  $("#keyrows").innerHTML = Object.keys(TOOLNAME)
    .map(
      (t) =>
        `<div class="krow"><span><svg class="kic" viewBox="0 0 24 24">${PICONS[t] || ""}</svg>${TOOLNAME[t]}</span><button class="btn${capTool === t ? " on" : ""}" data-t="${t}">${capTool === t ? "Pulsa una tecla…" : tmpKeys[t].toUpperCase()}</button></div>`,
    )
    .join("");
}
/* panel de atajos: desplegable lateral del menú de Pixel art */
$("#kClose").onclick = () => closeKeys();
$("#xKeys").onclick = () => {
  const p = $("#keys");
  if (!p.hidden) {
    closeKeys();
    return;
  }
  tmpKeys = { ...pxKeys };
  capTool = null;
  renderKeys();
  p.hidden = false;
  positionKeys();
};
$("#keyrows").addEventListener("click", (e) => {
  const b = e.target.closest("[data-t]");
  if (b) {
    capTool = b.dataset.t;
    renderKeys();
  }
});
window.addEventListener(
  "keydown",
  (e) => {
    if (!capTool) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === "Escape") {
      capTool = null;
      renderKeys();
      return;
    }
    if (e.key.length !== 1 || !/\S/.test(e.key)) return;
    const k = e.key.toLowerCase(),
      other = Object.keys(tmpKeys).find(
        (t) => t !== capTool && tmpKeys[t] === k,
      );
    if (other) {
      toast(`"${k.toUpperCase()}" ya es el atajo de ${TOOLNAME[other]}`);
      return;
    }
    tmpKeys[capTool] = k;
    capTool = null;
    renderKeys();
  },
  true,
);
$("#kOk").onclick = () => {
  pxKeys = { ...tmpKeys };
  UI.pxKeys = pxKeys;
  saveUI();
  closeKeys();
  pxSyncAll();
  toast("Atajos guardados");
};
$("#kReset").onclick = () => {
  tmpKeys = { ...PXKEYS_DEF };
  pxKeys = { ...PXKEYS_DEF };
  UI.pxKeys = pxKeys;
  saveUI();
  capTool = null;
  renderKeys();
  pxSyncAll();
  toast("Atajos restablecidos");
};

/* Botón de atajos: en color de acento mientras el panel de atajos está abierto */
new MutationObserver(() => $("#xKeys").classList.toggle("on", !$("#keys").hidden)).observe($("#keys"), { attributes: true, attributeFilter: ["hidden"] });

/* Ayuda de herramientas: aparece tras dejar el ratón ~0,8 s sobre el botón (i) de la tarjeta */
hoverTip($("#xInfo"), $("#pxTip"), (tip) => {
  // atajos vigentes (los personalizados), no los de fábrica
  tip.querySelectorAll(".tk").forEach((s) => (s.textContent = "(" + (pxKeys[s.dataset.k] || "–").toUpperCase() + ")"));
});
