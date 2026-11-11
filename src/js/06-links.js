"use strict";
/* =====================  Enlaces  ===================== */
const URL_RE = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/i;
function plain(html) {
  const d = document.createElement("div");
  d.innerHTML = html || "";
  return d.textContent || "";
}
function nodeUrl(n) {
  if (!COLORABLE.includes(n.type)) return null;
  // enlace pegado (con o sin sobrenombre): la dirección real va en data-u
  const d = document.createElement("div");
  d.innerHTML = n.html || "";
  const a = d.querySelector(".mlk[data-u]");
  if (a) return a.dataset.u;
  const m = plain(n.html).match(URL_RE);
  if (!m) return null;
  let u = m[1].replace(/[.,;:)\]]+$/, "");
  if (!/^https?:/i.test(u)) u = "https://" + u;
  return u;
}
async function openUrl(u) {
  try {
    if (invoke) await invoke("open_url", { url: u });
    else window.open(u, "_blank", "noopener");
  } catch (e) {
    toast("⚠ " + e);
  }
}
function refreshLink(n) {
  const el = els.get(n.id);
  if (!el) return;
  const u = nodeUrl(n);
  el.classList.toggle("haslink", !!u);
  el.dataset.url = u || "";
}

/* ---------- enlaces pegados con sobrenombre ----------
   Al pegar una dirección en un texto se inserta <span class="mlk" data-u="dirección" [data-a="sobrenombre"]>: se ve en azul
   (con el sobrenombre en lugar de la dirección, si lo hay) y el botón de enlace abre la dirección real. */
const URL_FULL = /^(https?:\/\/|www\.)[^\s<>"']+$/i;
const fullUrl = (u) => (/^https?:/i.test(u) ? u : "https://" + u);
function mkLink(txt) {
  const u = fullUrl(txt),
    sp = document.createElement("span");
  sp.className = "mlk";
  sp.contentEditable = "false";
  sp.dataset.u = u;
  sp.textContent = txt;
  return sp;
}
function caretAfter(node) {
  const r = document.createRange();
  r.setStartAfter(node);
  r.collapse(true);
  const s = getSelection();
  s.removeAllRanges();
  s.addRange(r);
}
// pregunta el sobrenombre de un enlace; vacío = vuelve a mostrar la dirección. Devuelve false si se cancela
async function linkAlias(sp, n) {
  const el = els.get(n.id),
    c = el && el.querySelector(".content"),
    editing = !!(el && el.classList.contains("editing"));
  hideLinkTip();
  const r = await dialog("¿Quieres dar un nombre a este enlace?", { input: true, value: sp.dataset.a || "", outside: true });
  if (r === null) {
    if (editing) reEdit(n, sp);
    return false;
  }
  const a = r.replace(/\s+/g, " ").trim().slice(0, 80);
  if (a) {
    sp.dataset.a = a;
    sp.textContent = a;
  } else {
    delete sp.dataset.a;
    sp.textContent = sp.dataset.u;
  }
  if (c) n.html = c.innerHTML;
  refreshLink(n);
  commit();
  if (editing) reEdit(n, sp);
  return true;
}
// vuelve a la edición del texto con el cursor justo después del enlace
function reEdit(n, sp) {
  // con un pequeño retraso: si se cerró el aviso con Esc o Enter, esa misma pulsación no debe cerrar también la edición
  setTimeout(() => {
    startEdit(n, "content");
    if (sp.isConnected) caretAfter(sp);
  }, 30);
}
// al pegar una dirección en un texto en edición: se inserta como enlace y se pregunta el sobrenombre
function pasteLink(ev, n) {
  if (ev._lk) return true; // el mismo pegado ya lo trató otro oyente (la edición puede iniciarse varias veces)
  ev._lk = true;
  const txt = ((ev.clipboardData || window.clipboardData).getData("text/plain") || "").trim();
  if (!URL_FULL.test(txt)) return false;
  ev.preventDefault();
  ev.stopPropagation();
  const sel = getSelection();
  if (!sel.rangeCount) return true;
  const r = sel.getRangeAt(0),
    sp = mkLink(txt),
    gap = document.createTextNode("\u00A0");
  r.deleteContents();
  r.insertNode(gap);
  r.insertNode(sp);
  caretAfter(gap);
  linkAlias(sp, n);
  return true;
}
// doble clic sobre un enlace: reeditar el sobrenombre
function dblLink(e) {
  const sp = e.target.closest && e.target.closest(".mlk"),
    nel = sp && sp.closest(".node"),
    n = nel && get(nel.dataset.id);
  if (!n) return false;
  linkAlias(sp, n);
  return true;
}
// al dejar el ratón sobre un enlace con sobrenombre: la dirección a la que lleva
const lkTip = document.createElement("div");
lkTip.id = "lkTip";
document.body.appendChild(lkTip);
function hideLinkTip() {
  lkTip.style.display = "none";
}
document.addEventListener("mouseover", (e) => {
  const sp = e.target.closest && e.target.closest(".mlk");
  if (!sp || !sp.dataset.a) return hideLinkTip();
  lkTip.textContent = sp.dataset.u;
  lkTip.style.display = "block";
  const r = sp.getBoundingClientRect(),
    w = lkTip.offsetWidth,
    h = lkTip.offsetHeight;
  lkTip.style.left = Math.max(6, Math.min(r.left, innerWidth - w - 6)) + "px";
  lkTip.style.top = (r.top - h - 6 < 6 ? r.bottom + 6 : r.top - h - 6) + "px";
});
document.addEventListener("pointerdown", hideLinkTip, true);
