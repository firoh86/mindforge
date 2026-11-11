"use strict";
/* =====================  Barra acoplable, tema y acento  ===================== */
function applyDock() {
  $("#app").className = "dock-" + UI.dock;
  $("#bar").classList.toggle(
    "v",
    UI.dock === "left" || UI.dock === "right",
  );
}
$("#grip").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  const z = $("#dockzone");
  z.style.display = "block";
  let pick = UI.dock;
  const mv = (ev) => {
    const d = {
      top: ev.clientY,
      bottom: innerHeight - ev.clientY,
      left: ev.clientX,
      right: innerWidth - ev.clientX,
    };
    pick = Object.keys(d).sort((a, b) => d[a] - d[b])[0];
    z.className = "z-" + pick;
  };
  mv(e);
  const up = () => {
    window.removeEventListener("pointermove", mv);
    window.removeEventListener("pointerup", up);
    z.style.display = "none";
    if (pick !== UI.dock) {
      UI.dock = pick;
      saveUI();
      applyDock();
    }
  };
  window.addEventListener("pointermove", mv);
  window.addEventListener("pointerup", up);
});
function setAccent(c, save = true) {
  const r = document.documentElement.style;
  r.setProperty("--acc", c);
  r.setProperty("--acc-fg", lum(c) > 0.45 ? "#1a1a1a" : "#ffffff");
  UI.accent = c;
  if (save) saveUI();
  $("#accIn").value = c;
  board.nodes.forEach((n) => {
    if (n.type === "pixel" && PX.get(n.id)) pxOverlay(n);
  });
}
$("#accIn").addEventListener("input", (e) => setAccent(e.target.value));
// el botón ofrece el modo contrario al actual (el de inicio es el oscuro)
function syncThemeBtn() {
  const dark = document.documentElement.classList.contains("dark");
  // el icono ofrece el modo contrario al actual
  $("#themeBtn").innerHTML = `<svg class="ic" viewBox="0 0 24 24">${IC[dark ? "sun" : "moon"]}</svg>`;
  $("#themeBtn").title = dark
    ? "Cambiar a modo claro"
    : "Cambiar a modo oscuro";
}
$("#themeBtn").onclick = () => {
  document.documentElement.classList.toggle("dark");
  UI.theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
  saveUI();
  syncThemeBtn();
};
let footT;
$("#foot").addEventListener("click", async () => {
  await copyText("firohh.as@gmail.com");
  const f = $("#foot"),
    old = "firohh.as@gmail.com";
  f.textContent = "¡Copiado!";
  f.classList.add("ok");
  clearTimeout(footT);
  footT = setTimeout(() => {
    f.textContent = old;
    f.classList.remove("ok");
  }, 1300);
});
