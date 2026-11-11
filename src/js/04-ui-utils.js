"use strict";
/* =====================  Utilidades UI  ===================== */
let toastT;
function toast(m) {
  const t = $("#toast");
  t.textContent = m;
  t.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("show"), 2200);
}
function dialog(msg, { input = false, value = "", yes = "", alt = "", outside = false } = {}) {
  return new Promise((res) => {
    const inp = $("#minp");
    $("#mtxt").textContent = msg;
    inp.style.display = input ? "block" : "none";
    inp.value = value;
    $("#mYes").textContent = yes || "Aceptar";
    $("#mAlt").textContent = alt;
    $("#mAlt").style.display = alt ? "" : "none";
    $("#modal").style.display = "flex";
    if (input)
      setTimeout(() => {
        inp.focus();
        inp.select();
      }, 20);
    const done = (v) => {
      $("#modal").style.display = "none";
      $("#mYes").onclick = $("#mNo").onclick = $("#mAlt").onclick = inp.onkeydown = $("#modal").oncontextmenu = $("#modal").onmousedown = null;
      res(v);
    };
    $("#mYes").onclick = () => done(input ? inp.value : true);
    $("#mNo").onclick = () => done(input ? null : false);
    $("#mAlt").onclick = () => done("alt");
    // clic derecho en cualquier punto del aviso = cancelar (igual que la X y Esc)
    $("#modal").oncontextmenu = (e) => {
      e.preventDefault();
      $("#mNo").click();
    };
    // clic fuera del cuadro = cancelar (solo en los avisos que lo piden)
    if (outside) $("#modal").onmousedown = (e) => e.target === $("#modal") && $("#mNo").click();
    inp.onkeydown = (e) => {
      if (e.key === "Enter") done(inp.value);
      if (e.key === "Escape") done(null);
    };
  });
}
async function copyText(t) {
  try {
    await navigator.clipboard.writeText(t);
  } catch (_) {
    const a = document.createElement("textarea");
    a.value = t;
    document.body.appendChild(a);
    a.select();
    document.execCommand("copy");
    a.remove();
  }
}
function toWorld(cx, cy) {
  const r = canvas.getBoundingClientRect(),
    v = board.view;
  return { x: (cx - r.left - v.x) / v.k, y: (cy - r.top - v.y) / v.k };
}
function viewCenter() {
  const r = canvas.getBoundingClientRect();
  return toWorld(r.left + r.width / 2, r.top + r.height / 2);
}

/* Ayuda emergente (i): aparece tras dejar el ratón ~0,8 s sobre el botón, a su derecha (o izquierda si no cabe) */
function hoverTip(btn, tip, before) {
  let timer = null;
  const hide = () => {
    clearTimeout(timer);
    tip.hidden = true;
  };
  const show = () => {
    if (before) before(tip);
    tip.hidden = false;
    const r = btn.getBoundingClientRect(),
      w = tip.offsetWidth,
      h = tip.offsetHeight;
    const left = r.right + 10 + w <= innerWidth - 8 ? r.right + 10 : r.left - w - 10;
    tip.style.left = Math.max(8, left) + "px";
    tip.style.top = clamp(r.top - 4, 8, Math.max(8, innerHeight - h - 8)) + "px";
  };
  btn.addEventListener("pointerenter", () => {
    clearTimeout(timer);
    timer = setTimeout(show, 800);
  });
  btn.addEventListener("pointerleave", hide);
  btn.addEventListener("focus", () => (timer = setTimeout(show, 800)));
  btn.addEventListener("blur", hide);
  btn.addEventListener("pointerdown", hide);
  document.addEventListener("keydown", (e) => e.key === "Escape" && hide());
}
