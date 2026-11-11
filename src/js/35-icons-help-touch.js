"use strict";
/* =====================  Iconos, lazo, ayuda y táctil  ===================== */
const IC = {
  grid: '<path d="M4 4h16v16H4zM4 12h16M12 4v16"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>',
  redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 000 12h3"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 119.5 4a6.5 6.5 0 0010.5 10.5z"/>',
  wheel: '<path fill="currentColor" stroke="none" fill-rule="evenodd" transform="scale(.046875)" d="M256 32C132 32 32 124 32 240c0 110 88 192 182 192 34 0 50-22 42-48-8-26 8-50 40-50h54c70 0 130-48 130-108C480 124 380 32 256 32zM256 128a32 32 0 1 1 0 64 32 32 0 0 1 0-64zM160 192a32 32 0 1 1 0 64 32 32 0 0 1 0-64zM352 192a32 32 0 1 1 0 64 32 32 0 0 1 0-64z"/>',
  eraser: '<path d="M20 20H9L3.6 14.6a2 2 0 010-2.8l8.2-8.2a2 2 0 012.8 0l5.8 5.8a2 2 0 010 2.8L12 19"/><path d="M7 11l6 6"/>',
  minus: '<path d="M5 12h14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  avoid: '<rect x="9" y="11" width="6" height="8" rx="1"/><path d="M2 14h3a2 2 0 002-2V7a2 2 0 012-2h6a2 2 0 012 2v5a2 2 0 002 2h3"/>',
  map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  img: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M21 16l-5-5-8 8"/>',
  main: '<circle cx="5" cy="5" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="5" cy="19" r="2"/><path d="M7 5h5a3 3 0 013 3v1"/><path stroke-dasharray="2 2.5" d="M7 19h5a3 3 0 003-3v-1"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  out: '<path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14"/>',
  inn: '<path d="M12 15V4m0 0L8 8m4-4l4 4M5 20h14"/>',
  file: '<path d="M4 6a2 2 0 012-2h4l2 3h6a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2z"/>',
};
const setIcon = (q, ic, label) =>
  ($(q).innerHTML = `<svg class="ic" viewBox="0 0 24 24">${IC[ic]}</svg>${label}`);
setIcon("#snapBtn", "grid", "");
setIcon("#undoBtn", "undo", "");
setIcon("#redoBtn", "redo", "");
setIcon("#fitBtn", "fit", "");
setIcon("#mainBtn", "main", "");
setIcon("#avoidBtn", "avoid", "");
setIcon("#mmBtn", "map", "");
setIcon("#expBtn", "img", "");
$("#edgeW").min = EDGE_W_MIN;
$("#edgeW").max = EDGE_W_MAX;
$("#edgeW").oninput = (e) => {
  board.edgeW = +e.target.value;
  applyEdgeW();
  renderEdges(); // el texto de las flechas escala con el grosor: se recalculan sus huecos
};
$("#edgeW").onchange = scheduleSave;
setIcon("#zOut", "minus", "");
// icono de la rueda de color (assets/icons/palette.svg): ocupa todo el botón, como el icono del acento
$("#wheelBtn").innerHTML = '<svg class="wsvg" viewBox="0 0 52 52" aria-hidden="true"><path fill="currentColor" d="M35.4350288,9.49390335 L42.5060967,16.5649712 L42.5077201,16.5633477 C44.0698172,18.1254449 44.0698172,20.6581048 42.5077201,22.220202 L42.5060957,22.2218254 L24,40.7034386 L24,15.2639687 L29.7768418,9.49256991 L29.7781746,9.49390397 C31.340487,7.93306359 33.8721188,7.93366021 35.4336954,9.49523678 L35.4350288,9.49390335 Z M50,36 L50,46 C50,48.209139 48.209139,50 46,50 L21,50 L39,32 L46,32 C48.209139,32 50,33.790861 50,36 Z M2.00011396,41.0457762 L2.00011879,41.0462543 C2.00003963,41.0310054 2,41.0155876 2,41 L2,6 C2,3.790861 3.790861,2 6,2 L16,2 C18.209139,2 20,3.790861 20,6 L20,41 C20,41.0155876 19.9999604,41.0310054 19.999886,41.0457762 C19.9752374,45.9952784 15.9552951,50 11,50 C6.04470488,50 2.0247626,45.9952784 2.00011396,41.0457762 Z M11,45 C13.209139,45 15,43.209139 15,41 C15,38.790861 13.209139,37 11,37 C8.790861,37 7,38.790861 7,41 C7,43.209139 8.790861,45 11,45 Z"/></svg>';
setIcon("#clearBtn", "eraser", "");
$("#zoomBtn").innerHTML = '<svg class="ic" viewBox="0 0 256 256" aria-hidden="true"><path fill="currentColor" stroke="none" d="M247.31055,124.75061c-.35157-.79-8.81934-19.57617-27.65332-38.41113C194.57324,61.25256,162.87793,47.99182,128,47.99182S61.42676,61.25256,36.34277,86.33948c-18.834,18.835-27.30175,37.62109-27.65332,38.41113a8.00282,8.00282,0,0,0,0,6.49805c.35157.791,8.82032,19.57226,27.6543,38.40429C61.42773,194.734,93.12207,207.99182,128,207.99182S194.57227,194.734,219.65625,169.653c18.834-18.832,27.30273-37.61328,27.6543-38.40429A8.00282,8.00282,0,0,0,247.31055,124.75061ZM128,92.00061a36,36,0,1,1-36,36A36.04061,36.04061,0,0,1,128,92.00061Z"/></svg>'; // ojo relleno (assets/icons/eye.svg)
syncThemeBtn();
setIcon("#wsBtn", "layers", "▾");
setIcon("#zIn", "plus", "");
// panel de ayuda
const helpBtn = $("#helpBtn"), helpPanel = $("#helpPanel");
const setHelp = (o) => {
  helpPanel.classList.toggle("open", o);
  helpBtn.classList.toggle("open", o);
  helpBtn.setAttribute("aria-expanded", o);
};
helpBtn.onclick = () => {
  if (organizing()) exitOrganize();
  setHelp(!helpPanel.classList.contains("open"));
};
window.addEventListener("pointerdown", (e) => {
  if (organizing() && e.target.closest("#bar, #helpBtn") && !e.target.closest("#swGrp")) exitOrganize();
}, true);
document.addEventListener("pointerdown", (e) => {
  if (!e.target.closest("#helpPanel, #helpBtn")) setHelp(false);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if ($("#modal").style.display === "flex") $("#mNo").click();
    setHelp(false);
    document.querySelectorAll(".bar-dropdown.open").forEach((d) => d.classList.remove("open"));
  }
});
/* Táctil: pulsación larga = clic derecho, pellizco = zoom + desplazar */
const tch = new Map();
let lpT = null, pinch = null, lastLP = 0;
window.addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "touch" || !e.target.closest("#canvas, #swatches")) return;
  tch.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY });
  clearTimeout(lpT);
  if (tch.size === 2) {
    drag = null;
    canvas.classList.remove("panning");
    const [a, b] = [...tch.values()];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
    e.stopImmediatePropagation();
  } else if (tch.size === 1) {
    const t = e.target, x = e.clientX, y = e.clientY;
    lpT = setTimeout(() => {
      if (drag && ["resize", "link", "px", "crop"].includes(drag.type)) return;
      drag = null;
      canvas.classList.remove("panning");
      lastLP = Date.now();
      t.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 2 }));
      navigator.vibrate && navigator.vibrate(15);
    }, 500);
  }
}, true);
window.addEventListener("pointermove", (e) => {
  const t = tch.get(e.pointerId);
  if (e.pointerType !== "touch" || !t) return;
  if (Math.hypot(e.clientX - t.sx, e.clientY - t.sy) > 8) clearTimeout(lpT);
  t.x = e.clientX;
  t.y = e.clientY;
  if (pinch && tch.size >= 2) {
    const [a, b] = [...tch.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    board.view.x += cx - pinch.cx;
    board.view.y += cy - pinch.cy;
    zoomAt(cx, cy, d / pinch.d);
    Object.assign(pinch, { d, cx, cy });
    e.stopImmediatePropagation();
  }
}, true);
const tEnd = (e) => {
  tch.delete(e.pointerId);
  clearTimeout(lpT);
  if (tch.size < 2) pinch = null;
};
window.addEventListener("pointerup", tEnd, true);
window.addEventListener("pointercancel", tEnd, true);
// evita el menú nativo duplicado y que la muestra se aplique al soltar tras la pulsación larga
window.addEventListener("contextmenu", (e) => {
  if (e.isTrusted && Date.now() - lastLP < 1200) e.stopImmediatePropagation();
}, true);
window.addEventListener("click", (e) => {
  if (Date.now() - lastLP < 1200 && e.target.closest("#swatches")) {
    e.stopPropagation();
    e.preventDefault();
  }
}, true);
scheduleBarCheck();

(async function init() {
  $("#fFont").innerHTML = Object.keys(FONTS).map((f) => `<option value="${f}">${f}</option>`).join("");
  libOptions($("#pLib"), "Cargar de la biblioteca…");
  libOptions($("#xLib"));
  setAccent(UI.accent || "#f56565", false);
  applyDock();
  buildSwatches();
  if (UI.swOpen) setSwOpen(true);
  const saved = await loadSaved();
  try {
    loadBoard(saved && saved.nodes ? saved : seed());
  } catch (e) {
    console.error(e);
    loadBoard(seed());
  }
  persist().then(wsCheckAuto); // registra el espacio actual en recientes
  if (document.fonts && document.fonts.ready)
    document.fonts.ready.then(() => renderEdges());
})();
