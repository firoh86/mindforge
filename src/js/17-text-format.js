"use strict";
/* =====================  Formato de texto  ===================== */
const textNodes = () =>
  [...sel].map(get).filter((n) => n && COLORABLE.includes(n.type));
function updateFmt() {
  const ns = textNodes(),
    box = $("#fmt");
  if (!ns.length) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  const n = ns[0];
  $("#fFont").value = n.font || "Inter";
  $("#fSize").value = n.fs || DEFFS[n.type];
  $("#fB").classList.toggle("on", !!n.b);
  $("#fI").classList.toggle("on", !!n.i);
  $("#fU").classList.toggle("on", !!n.u);
  queuePos();
}
$("#fFont").addEventListener("change", (e) => {
  textNodes().forEach((n) => {
    n.font = e.target.value;
    applyNode(n);
  });
  rememberFmt({ font: e.target.value });
  commit();
  queuePos();
});
$("#fSize").addEventListener("input", (e) => {
  const v = clamp(+e.target.value || 0, 8, 120);
  if (e.target.value && v >= 8) {
    textNodes().forEach((n) => {
      n.fs = v;
      applyNode(n);
    });
    rememberFmt({ fs: v });
  }
});
$("#fSize").addEventListener("change", () => commit());
function fmtToggle(k, cmd) {
  const ae = document.activeElement;
  if (ae && ae.isContentEditable) {
    document.execCommand(cmd);
    return;
  } // sobre la selección de texto
  const ns = textNodes();
  if (!ns.length) return;
  const v = !ns[0][k];
  ns.forEach((n) => {
    n[k] = v;
    applyNode(n);
  });
  rememberFmt({ [k]: v });
  commit();
  updateFmt();
}
[
  ["fB", "b", "bold"],
  ["fI", "i", "italic"],
  ["fU", "u", "underline"],
].forEach(([id, k, cmd]) => {
  $("#" + id).addEventListener("mousedown", (e) => e.preventDefault()); // conserva la selección al editar
  $("#" + id).addEventListener("click", () => fmtToggle(k, cmd));
});
