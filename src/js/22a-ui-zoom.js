"use strict";
/* =====================  Zoom general de la interfaz (ojo 100 % ↔ 125 %)  =====================
   Usa el zoom nativo del webview de la app (todo escala igual y las coordenadas del lienzo no cambian).
   El zoom manual del navegador (Ctrl + / − / 0 y Ctrl + rueda) queda bloqueado fuera del espacio de trabajo. */
const UI_ZOOM = 1.25;
function syncZoomBtn() {
  const on = !!UI.zoom125,
    b = $("#zoomBtn");
  b.classList.toggle("on", on);
  b.setAttribute("aria-pressed", on);
  b.title = on ? "Zoom general: 125 % — clic para 100 %" : "Zoom general: 100 % — clic para 125 %";
}
async function setUiZoom(on, silent) {
  try {
    const wv = TAURI && TAURI.webview && TAURI.webview.getCurrentWebview && TAURI.webview.getCurrentWebview();
    if (!wv || !wv.setZoom) throw new Error("sin webview");
    await wv.setZoom(on ? UI_ZOOM : 1);
  } catch (e) {
    if (!silent) toast("El zoom general solo está disponible en la app de escritorio");
    return false;
  }
  UI.zoom125 = !!on;
  saveUI();
  syncZoomBtn();
  if (typeof scheduleBarCheck === "function") scheduleBarCheck();
  return true;
}
$("#zoomBtn").onclick = () => setUiZoom(!UI.zoom125);
syncZoomBtn();
if (UI.zoom125) setUiZoom(true, true).then((ok) => ok || ((UI.zoom125 = false), syncZoomBtn()));

// sin zoom manual fuera del espacio de trabajo (el lienzo tiene su propio zoom con Ctrl + rueda y Ctrl + / −)
window.addEventListener(
  "wheel",
  (e) => {
    if (e.ctrlKey && !(e.target.closest && e.target.closest("#canvas"))) e.preventDefault();
  },
  { passive: false, capture: true },
);
window.addEventListener(
  "keydown",
  (e) => {
    if ((e.ctrlKey || e.metaKey) && ["+", "-", "=", "_", "0"].includes(e.key)) e.preventDefault();
  },
  true,
);
