"use strict";
/* =====================  Historial / guardado  ===================== */
const HIST_MAX = 120;
let hist = [],
  hi = -1,
  saveT = null;
function commit() {
  const s = JSON.stringify({ nodes: board.nodes, edges: board.edges });
  if (hist[hi] === s) return;
  hist = hist.slice(0, hi + 1);
  hist.push(s);
  if (hist.length > HIST_MAX) hist.shift();
  hi = hist.length - 1;
  drawHist();
  scheduleSave();
}
function drawHist() {
  const bar = $("#histBar");
  if (!bar) return;
  bar.style.setProperty("--hn", HIST_MAX);
  const right = (k) => 100 - (k / HIST_MAX) * 100 + "%";
  $("#hsRedo").style.clipPath = `inset(0 ${right(hist.length)} 0 0)`;
  $("#hsDone").style.clipPath = `inset(0 ${right(hi + 1)} 0 0)`;
  $("#hsCur").style.clipPath = `inset(0 ${right(hi + 1)} 0 ${(hi / HIST_MAX) * 100}%)`;
  bar.setAttribute("aria-label", `Historial: paso ${hi} de ${hist.length - 1}`);
}
function restore(s) {
  const d = JSON.parse(s);
  board.nodes = d.nodes;
  board.edges = d.edges;
  // la selección se mantiene (los nodos que ya no existan se quitan): así un pixel art activo no pierde el foco al deshacer
  const keep = [...sel].filter((id) => d.nodes.some((n) => n.id === id));
  sel.clear();
  keep.forEach((id) => sel.add(id));
  selEdge = null;
  renderAll();
  drawHist();
  scheduleSave();
}
const undo = () => {
  if (hi > 0) {
    hi--;
    restore(hist[hi]);
  }
};
const redo = () => {
  if (hi < hist.length - 1) {
    hi++;
    restore(hist[hi]);
  }
};
function scheduleSave() {
  clearTimeout(saveT);
  saveT = setTimeout(persist, 500);
}
async function persist() {
  const data = JSON.stringify(board);
  try {
    if (invoke) await invoke("save_board", { data });
    else localStorage.setItem("mindforge", data);
  } catch (e) {
    console.error(e);
    toast("⚠ No se pudo guardar: " + e);
  }
  wsSync(data);
}
async function loadSaved() {
  try {
    const raw = invoke
      ? await invoke("load_board")
      : localStorage.getItem("mindforge");
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error(e);
    return null;
  }
}
