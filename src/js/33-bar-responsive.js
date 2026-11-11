"use strict";
/* =====================  Responsive Bar Dropdowns Rubi  =====================
   En vez de un ancho fijo, se prueba con la barra real: se colapsan
   los grupos (Edición primero, luego Sistema) solo si la barra se
   rompería en dos filas. */
const barEl = document.querySelector("#bar");
/* Las muestras son lo primero en colapsar: pasan a un desplegable */
const swGrpEl = document.querySelector("#swGrp");
function setSwCollapsed(c) {
  if (barEl.classList.contains("c-sw") === c) return;
  barEl.classList.toggle("c-sw", c);
  const sw = document.querySelector("#swatches");
  if (c) document.querySelector("#swHost").appendChild(sw);
  else {
    swGrpEl.insertBefore(sw, document.querySelector("#swToggle"));
    document.querySelector("#dropSw").classList.remove("open");
    measureSwMore();
  }
}
function setSwFolded(f) {
  // estado "plegado a 5 sin botón" eliminado (dejaba sin acceso al resto): siempre se quita
  barEl.classList.remove("c-swfold");
}
function barWraps() {
  const rows = Array.from(barEl.children).filter(
    (c) => !c.classList.contains("sp") && c.offsetParent !== null,
  );
  if (rows.length < 2) return false;
  const rects = rows.map((c) => c.getBoundingClientRect());
  const minBottom = Math.min(...rects.map((r) => r.bottom));
  return rects.some((r) => r.top >= minBottom - 1);
}
// último recurso: si aun con las muestras plegadas la barra se parte en dos filas (título largo en
// una ventana estrecha), se acorta el título (solo visualmente, con puntos suspensivos)
function fitBarTitle() {
  const t = document.querySelector("#boardTitle");
  if (!t) return;
  t.style.maxWidth = "";
  if (barEl.classList.contains("v") || !barWraps()) return;
  let w = t.offsetWidth;
  while (w > 70 && barWraps()) {
    w -= 10;
    t.style.maxWidth = w + "px";
  }
}
let barBusy = false,
  lockT = 0;
function checkBarResponsive() {
  if (barBusy) return;
  // si las muestras se están animando por un clic, se espera a que acaben para medir
  const wait = swLock - performance.now();
  if (wait > 0) {
    clearTimeout(lockT);
    lockT = setTimeout(scheduleBarCheck, wait + 30);
    return;
  }
  barBusy = true;
  // Se mide SIN transiciones: antes se medía a mitad de animación, la barra
  // "cabía" y "no cabía" alternativamente y se creaba un bucle plegar-desplegar.
  barEl.classList.add("no-anim");
  try {
    if (barEl.classList.contains("v")) {
      setSwFolded(false);
      setSwCollapsed(false);
      return;
    }
    // orden de colapso: la fila de muestras pasa a un desplegable cuando no cabe
    // El primer paso se mide con las muestras DESPLEGADAS aunque ahora estén cerradas: el botón de
    // desplegar solo existe si la fila completa cabe. Así, al pulsarlo nunca se abre para volver a
    // cerrarse sola (antes: cabía cerrada, al abrir no cabía y se plegaba de golpe).
    const wasOpen = swGrpEl.classList.contains("sws-open");
    // (ya no hay estado intermedio "plegado a 5 sin botón": dejaba sin acceso al resto de muestras;
    //  si la fila completa no cabe, TODAS las muestras pasan al desplegable)
    for (const [fold, sw] of [
      [false, false],
      [false, true],
    ]) {
      setSwFolded(fold);
      setSwCollapsed(sw);
      if (!fold) swGrpEl.classList.add("sws-open");
      else swGrpEl.classList.toggle("sws-open", wasOpen);
      const wraps = barWraps();
      if (!wraps) break;
    }
    swGrpEl.classList.toggle("sws-open", wasOpen);
    fitBarTitle();
  } finally {
    void barEl.offsetWidth; // fija el estado final antes de reactivar las transiciones
    barEl.classList.remove("no-anim");
    barBusy = false;
  }
}
let barRaf = 0;
const scheduleBarCheck = () => {
  cancelAnimationFrame(barRaf);
  barRaf = requestAnimationFrame(checkBarResponsive);
};
window.addEventListener("resize", () => {
  scheduleBarCheck();
  document
    .querySelectorAll(".bar-dropdown.open")
    .forEach((d) => d.classList.remove("open"));
});
if (window.ResizeObserver) {
  const ro = new ResizeObserver(scheduleBarCheck);
  ["#bar", "#swGrp", "#boardTitle", "#zl"].forEach((q) => {
    const el = document.querySelector(q);
    if (el) ro.observe(el);
  });
}
// cambio de acople (vertical <-> horizontal)
let lastV = barEl.classList.contains("v");
new MutationObserver(() => {
  const v = barEl.classList.contains("v");
  if (v !== lastV) {
    lastV = v;
    scheduleBarCheck();
  }
}).observe(barEl, { attributes: true, attributeFilter: ["class"] });
document.fonts && document.fonts.ready.then(scheduleBarCheck);

/* Menú desplegable: siempre dentro de la ventana, hacia arriba si
   la barra está abajo y no cabe debajo */
function placeMenu(dd) {
  const btn = dd.querySelector(".bar-dropdown-btn");
  const menu = dd.querySelector(".bar-dropdown-menu");
  const M = 8,
    gap = 6;
  const br = btn.getBoundingClientRect();
  const mw = menu.offsetWidth,
    mh = menu.offsetHeight;
  let left = Math.min(br.left, innerWidth - mw - M);
  left = Math.max(M, left);
  const below = innerHeight - br.bottom - gap - M;
  const above = br.top - gap - M;
  let top;
  if (mh <= below || below >= above) {
    top = br.bottom + gap;
    menu.style.setProperty("--dd-from", "-4px");
  } else {
    top = br.top - gap - mh;
    menu.style.setProperty("--dd-from", "4px");
  }
  top = Math.max(M, Math.min(top, innerHeight - mh - M));
  menu.style.left = left + "px";
  menu.style.top = top + "px";
}
document.addEventListener("click", (e) => {
  if (e.target.closest("#modal")) return; // los diálogos no cierran el desplegable que los abrió
  const dropdown = e.target.closest(".bar-dropdown");
  const onBtn = e.target.closest(".bar-dropdown-btn");
  const onItem = e.target.closest(".bar-dropdown-menu .btn:not([data-keep])");
  document.querySelectorAll(".bar-dropdown").forEach((d) => {
    if (d !== dropdown) d.classList.remove("open");
  });
  if (!dropdown) return;
  if (onBtn) {
    if (organizing()) exitOrganize();
    dropdown.classList.toggle("open");
    if (dropdown.classList.contains("open")) {
      if (dropdown.id === "dropWs") renderWs();
      placeMenu(dropdown);
    }
  } else if (onItem) dropdown.classList.remove("open");
});

// Llamada inicial
checkBarResponsive();
