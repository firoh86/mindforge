"use strict";
/* =====================  Color de la barra  ===================== */
function buildSwatches() {
  const custom = UI.custom.filter((c) => !PALETTE.includes(c));
  const items = [
    `<button class="sw auto" data-c="auto" title="Color del tema"></button>`,
    `<button class="sw outline" data-c="outline" title="Sin relleno con borde de color (solo cuadros de texto)"></button>`,
    `<button class="sw none" data-c="transparent" title="Sin relleno"></button>`,
  ].concat(
    PALETTE.map((c) => `<button class="sw" data-c="${c}" style="background:${c}" title="${c}"></button>`),
    // separador entre las muestras de fábrica y las añadidas por el usuario
    custom.length ? ['<span class="sw-sep" aria-hidden="true"></span>'] : [],
    custom.map((c) => `<button class="sw" data-c="${c}" style="background:${c}" title="${c}"></button>`),
  );
  const first = items.slice(0, SW_VISIBLE).join("");
  const rest = items.slice(SW_VISIBLE).join("");
  $("#swatches").innerHTML =
    first + (rest ? `<span class="sw-more">${rest}</span>` : "");
  measureSwMore();
  $("#swToggle").style.display = rest ? "" : "none";
  syncSwatches();
  if (typeof checkBarResponsive === "function") checkBarResponsive();
}
// ancho que necesitan las muestras extra para animar el despliegue. Se calcula a partir de los
// propios elementos (no de la maquetación actual), así no depende de si la barra está en vertical,
// plegada o en el desplegable cuando se mide.
function measureSwMore() {
  const more = $("#swatches .sw-more");
  if (!more) return;
  const kids = [...more.children];
  const gap = parseFloat(getComputedStyle(more).columnGap) || 6;
  let w = 6 + 8; // relleno del contenedor + margen de seguridad
  kids.forEach((k) => (w += k.classList.contains("sw-sep") ? 5 : k.offsetWidth || 20)); // el separador mide 1 px + 2×2 de margen en horizontal
  w += gap * Math.max(0, kids.length - 1);
  $("#swGrp").style.setProperty("--sw-more-w", Math.ceil(w) + "px");
}
let swLock = 0; // instante hasta el que la animación de muestras bloquea la medición
const SW_VISIBLE = 6; // muestras visibles cuando está plegado
function setSwOpen(open) {
  $("#swGrp").classList.toggle("sws-open", open);
  $("#swToggle").setAttribute("aria-expanded", open);
  $("#swToggle").title = open
    ? "Mostrar menos muestras"
    : "Mostrar todas las muestras";
  UI.swOpen = open;
  swLock = performance.now() + 450;
  saveUI();
}
$("#swToggle").addEventListener("click", () => {
  // si la ventana se acaba de estrechar y aún no se había re-medido la barra, se mide ya: si las muestras
  // ya no caben en línea, pasan al desplegable y este clic no abre nada
  if (typeof checkBarResponsive === "function") checkBarResponsive();
  if ($("#bar").classList.contains("c-sw")) return;
  setSwOpen(!$("#swGrp").classList.contains("sws-open"));
});
/* Aplica un color a un nodo con texto. El chip «borde» (c = "outline") solo vale para cuadros de texto: los deja
   sin relleno y, mientras estén en ese modo, el color que se elija cambia el BORDE (n.bc) y no el relleno. */
function applyColorTo(n, c) {
  if (c === "outline") {
    if (n.type !== "text") return false;
    if (n.color !== "outline") {
      if (!n.bc && /^#/.test(n.color)) n.bc = n.color; // el borde arranca con el color de relleno que tuviera
      n.color = "outline";
    }
    return true;
  }
  if (n.type === "text" && n.color === "outline" && /^#/.test(c)) {
    n.bc = c;
    return true;
  }
  n.color = c;
  return true;
}
/* Regla: un cuadro de texto (grupo) no puede conectarse con flechas a los nodos que están dentro de él
   (centro del nodo dentro del rectángulo del cuadro), ni al revés. */
function insideBox(n, box) {
  if (!box || box.type !== "text" || n.id === box.id) return false;
  const cx = n.x + n.w / 2,
    cy = n.y + nh(n) / 2;
  return cx >= box.x && cx <= box.x + box.w && cy >= box.y && cy <= box.y + Math.max(nh(box), box.uh || 0);
}
const linkOK = (a, b) => !insideBox(a, b) && !insideBox(b, a);
function setColor(c, noCommit) {
  const tg = [...sel]
    .map(get)
    .filter((n) => n && COLORABLE.includes(n.type));
  if (tg.length) {
    let did = false;
    tg.forEach((n) => {
      if (applyColorTo(n, c)) {
        applyNode(n);
        did = true;
      }
    });
    if (!did) toast("Solo funciona con cuadros de texto");
    else if (!noCommit) commit();
  } else {
    nextColor = c;
    toast(c === "outline" ? "Borde de color para los próximos cuadros de texto" : "Color para los próximos elementos");
  }
  syncSwatches();
}
function syncSwatches() {
  const f = [...sel]
      .map(get)
      .find((n) => n && COLORABLE.includes(n.type)),
    cur = f ? f.color : nextColor,
    ot = [...sel].map(get).find((n) => n && n.type === "text" && n.color === "outline");
  // el chip «borde» muestra el color del borde del cuadro de texto seleccionado
  document.querySelectorAll(".sw.outline").forEach((b) => {
    if (ot && ot.bc) b.style.setProperty("--swb", ot.bc);
    else b.style.removeProperty("--swb");
  });
  document.querySelectorAll(".sw.mirror").forEach((m) => m.remove());
  document
    .querySelectorAll(".sw")
    .forEach((b) => b.classList.toggle("act", b.dataset.c === cur));
  const hid = document.querySelector(".sw-more .sw.act");
  if (hid) {
    const m = hid.cloneNode();
    m.classList.add("mirror");
    hid.closest(".sw-more").before(m);
  }
  // el desplegable de muestras refleja el color activo
  const act = document.querySelector("#swatches .sw.act:not(.mirror)"),
    dot = document.querySelector("#swDot");
  if (act && dot) {
    dot.className = "sw" + (act.classList.contains("auto") ? " auto" : "") + (act.classList.contains("none") ? " none" : "") + (act.classList.contains("outline") ? " outline" : "");
    dot.style.background = act.style.background;
    dot.style.setProperty("--swb", act.style.getPropertyValue("--swb"));
  }
}
function addCustom(c) {
  if (!PALETTE.includes(c) && !UI.custom.includes(c)) {
    UI.custom.unshift(c);
    UI.custom = UI.custom.slice(0, MAX_CUSTOM);
    saveUI();
    buildSwatches();
  }
}
$("#swatches").addEventListener("click", (e) => {
  const b = e.target.closest(".sw");
  if (b) setColor(b.dataset.c);
});
$("#swatches").addEventListener("contextmenu", (e) => {
  const b = e.target.closest(".sw");
  if (!b) return;
  e.preventDefault();
  const c = b.dataset.c;
  if (UI.custom.includes(c)) {
    UI.custom = UI.custom.filter((x) => x !== c);
    saveUI();
    buildSwatches();
    toast("Muestra eliminada");
  } else toast(`Las ${PALETTE.length} muestras base no se pueden quitar`);
});
function setColorLive(c) {
  const tg = textNodes();
  if (tg.length)
    tg.forEach((n) => {
      applyColorTo(n, c);
      applyNode(n);
    });
  else nextColor = c;
  syncSwatches();
}
