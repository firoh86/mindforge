"use strict";
/* =====================  Edición de texto  ===================== */
const TITLE_MAX = 40;
const cleanTitle = (v) =>
  String(v || "").replace(/\s+/g, " ").trim().slice(0, TITLE_MAX);
function startEdit(n, part) {
  const el = els.get(n.id);
  if (!el) return;
  if (n.type === "image") return;
  if (n.type === "palette" || n.type === "pixel") part = "title";
  const t = el.querySelector(part === "title" ? ".ttl" : ".content");
  if (!t) return;
  if (n.collapsed && part !== "title") return;
  t.contentEditable = "true";
  el.classList.add("editing");
  t.focus();
  const r = document.createRange();
  r.selectNodeContents(t);
  const s = getSelection();
  s.removeAllRanges();
  s.addRange(r);
  const grpBox = part === "content" && n.type === "text" && isGroupBox(n), // cuadro con grupo: solo una línea (su nombre)
    MAX = grpBox ? GROUP_TITLE_MAX : TITLE_MAX;
  if (part === "title" || grpBox) {
    // una sola línea y longitud limitada
    t.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        t.blur();
      }
    });
    t.addEventListener("paste", (ev) => {
      ev.preventDefault();
      const txt = (ev.clipboardData || window.clipboardData)
        .getData("text/plain")
        .replace(/\s+/g, " ");
      document.execCommand("insertText", false, txt);
    });
    t.addEventListener("input", () => {
      const raw = t.textContent;
      if (raw.length > MAX || /[\n\r]/.test(raw)) {
        t.textContent = raw.replace(/[\n\r]+/g, " ").slice(0, MAX);
        const r2 = document.createRange();
        r2.selectNodeContents(t);
        r2.collapse(false);
        const s2 = getSelection();
        s2.removeAllRanges();
        s2.addRange(r2);
      }
    });
  }
  // globo: mientras se escribe, crece lo necesario para que el texto quepa (y vuelve a su tamaño al borrar, nunca por debajo del
  // que tenía al empezar a editar). Fuera de la edición no se reescala solo: el usuario lo ajusta a mano, sin bajar del texto
  if (n.type === "bubble" && part === "content") {
    const h0 = n.h,
      w0 = n.w,
      fit = () => {
        const f = bubbleFit(n, n.w);
        n.w = Math.max(w0, f.w);
        n.h = Math.max(h0, bubbleFit(n, n.w).h);
        applyNode(n);
        renderEdges();
      };
    t.addEventListener("input", fit);
    t.addEventListener("blur", () => t.removeEventListener("input", fit), { once: true });
  }
  const onPaste = (ev) => pasteLink(ev, n); // dirección pegada → enlace con sobrenombre
  if (part === "content" && !grpBox) t.addEventListener("paste", onPaste, true);
  t.addEventListener(
    "blur",
    () => {
      t.contentEditable = "false";
      t.removeEventListener("paste", onPaste, true);
      el.classList.remove("editing");
      getSelection().removeAllRanges();
      if (part === "title") {
        n.title =
          defKey(cleanTitle(t.textContent)) ||
          (n.type === "palette"
            ? "Paleta"
            : n.type === "pixel"
              ? "Pixel art"
              : n.type === "task"
                ? "Tarea"
                : "Comentario");
        t.textContent = n.title;
        updateInspector();
      } else {
        n.html = t.innerHTML;
        refreshLink(n);
      }
      commit();
    },
    { once: true },
  );
}
