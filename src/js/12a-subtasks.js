"use strict";
/* =====================  Subtareas del nodo de tarea  =====================
   n.subs = [{ id, t, s }]  con s ∈ "todo" (rojo) · "doing" (amarillo) · "done" (verde).
   Si hay subtareas, el check principal del nodo es solo un indicador: muestra el % de subtareas
   completadas (anillo) y n.status se deriva de él (0 % pendiente · >0 % en progreso · 100 % completada). */
const SUB_ORDER = ["todo", "doing", "done"];
const hasSubs = (n) => n.type === "task" && Array.isArray(n.subs) && n.subs.length > 0;
function subProgress(n) {
  const tot = n.subs.length,
    done = n.subs.filter((s) => s.s === "done").length,
    doing = n.subs.filter((s) => s.s === "doing").length;
  return { tot, done, doing, pct: Math.round((done / tot) * 100) };
}
/* estado e icono del check principal a partir de las subtareas */
function syncTaskFromSubs(n) {
  if (!hasSubs(n)) return null;
  const p = subProgress(n);
  n.status = p.done === p.tot ? "done" : p.done > 0 || p.doing > 0 ? "doing" : "todo";
  return p;
}
/* anillo de progreso: círculo + sector proporcional al % completado */
function progressIcon(pct) {
  if (pct >= 100) return TASK_ST.done.icon;
  if (pct <= 0) return TASK_ST.todo.icon;
  const a = (pct / 100) * Math.PI * 2,
    x = (12 + 9 * Math.sin(a)).toFixed(2),
    y = (12 - 9 * Math.cos(a)).toFixed(2);
  return `<circle cx="12" cy="12" r="9"/><path d="M12 12V3A9 9 0 ${pct > 50 ? 1 : 0} 1 ${x} ${y}z" fill="currentColor" stroke="none"/>`;
}
const subLabel = (s) => TASK_ST[s].label;
function renderSubs(n) {
  const el = els.get(n.id);
  if (!el || n.type !== "task") return;
  const host = el.querySelector(".subs");
  if (!host) return;
  host.innerHTML = "";
  (n.subs || []).forEach((s) => {
    const row = document.createElement("div");
    row.className = "sub";
    row.dataset.sid = s.id;
    const tx = document.createElement("div");
    tx.className = "stx";
    tx.dataset.ph = "Subtarea…";
    tx.textContent = s.t || "";
    const del = document.createElement("button");
    del.className = "sdel";
    del.title = "Eliminar subtarea";
    del.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    const dot = document.createElement("button");
    dot.className = "sdot";
    dot.dataset.s = s.s || "todo";
    dot.title = `${subLabel(dot.dataset.s)} — clic para cambiar el estado`;
    row.append(tx, del, dot);
    host.appendChild(row);
  });
  const add = document.createElement("button");
  add.className = "sadd";
  add.title = "Añadir subtarea";
  add.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg><span>Añadir subtarea</span>';
  host.appendChild(add);
  el.classList.toggle("hassubs", hasSubs(n));
}
function addSub(n, afterId) {
  n.subs = n.subs || [];
  const s = { id: uid(), t: "", s: "todo" };
  const i = afterId ? n.subs.findIndex((x) => x.id === afterId) : -1;
  if (i >= 0) n.subs.splice(i + 1, 0, s);
  else n.subs.push(s);
  if (n.collapsed) n.collapsed = false;
  renderSubs(n);
  applyNode(n);
  editSub(n, s.id);
  return s;
}
function removeSub(n, sid) {
  n.subs = (n.subs || []).filter((s) => s.id !== sid);
  if (!n.subs.length) delete n.subs;
  renderSubs(n);
  applyNode(n);
  commit();
}
function cycleSub(n, sid) {
  const s = (n.subs || []).find((x) => x.id === sid);
  if (!s) return;
  s.s = SUB_ORDER[(SUB_ORDER.indexOf(s.s || "todo") + 1) % SUB_ORDER.length];
  const dot = els.get(n.id).querySelector(`.sub[data-sid="${sid}"] .sdot`);
  if (dot) {
    dot.dataset.s = s.s;
    dot.title = `${subLabel(s.s)} — clic para cambiar el estado`;
  }
  applyNode(n);
  commit();
}
/* edición de texto de una subtarea (varias líneas con Shift+Enter) */
function editSub(n, sid) {
  const el = els.get(n.id),
    s = (n.subs || []).find((x) => x.id === sid),
    tx = el && el.querySelector(`.sub[data-sid="${sid}"] .stx`);
  if (!s || !tx) return;
  el.classList.add("editing");
  tx.contentEditable = "plaintext-only";
  if (tx.contentEditable !== "plaintext-only") tx.contentEditable = "true";
  tx.focus();
  const r = document.createRange();
  r.selectNodeContents(tx);
  const g = getSelection();
  g.removeAllRanges();
  g.addRange(r);
  const before = s.t || "";
  let skip = false; // evita doble guardado cuando Enter/Retroceso ya gestionan la salida
  const finish = (next) => {
    if (skip) return;
    skip = true;
    tx.removeEventListener("keydown", onKey);
    tx.contentEditable = "false";
    el.classList.remove("editing");
    getSelection().removeAllRanges();
    const txt = tx.innerText.replace(/ /g, " ").replace(/\n+$/g, "").trim();
    if (!txt) {
      n.subs = n.subs.filter((x) => x.id !== sid);
      if (!n.subs.length) delete n.subs;
      renderSubs(n);
      applyNode(n);
      commit();
      return;
    }
    s.t = txt;
    tx.textContent = txt;
    if (txt !== before) commit();
    if (next === "new") addSub(n, sid);
  };
  const onKey = (ev) => {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      finish("new"); // Enter: guarda y abre otra subtarea debajo
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      ev.stopPropagation();
      tx.blur();
    } else if (ev.key === "Backspace" && !tx.innerText.trim()) {
      ev.preventDefault();
      finish();
    }
  };
  tx.addEventListener("keydown", onKey);
  tx.addEventListener("blur", () => finish(), { once: true });
  tx.addEventListener("paste", (ev) => {
    ev.preventDefault();
    document.execCommand("insertText", false, (ev.clipboardData || window.clipboardData).getData("text/plain"));
  });
}
