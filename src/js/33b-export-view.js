"use strict";
/* =====================  Exportar la vista como PNG  =====================
   Botón «Exportar vista (PNG)» (segunda fila de botones, a la derecha del minimapa). Menú en dos pasos:
     1. zona: «Recorte» (se elige un rectángulo sobre el espacio de trabajo) o «Espacio de trabajo completo» (todo lo visible)
     2. resolución: ×0,5, ×1 y ×1,5 (sobre el tamaño en pantalla de la zona elegida)
   Exporta lo que se ve ahora: se clona #world con los estilos
   calculados incrustados, se dibuja en un <foreignObject> SVG y de ahí a un <canvas> → PNG. Los canvas del pixel art se
   convierten antes en imágenes. No se dibujan los tiradores ni los puntos de conexión.
   Fuentes: si existe css/00-fonts.css (se genera con «npm run fonts», fuentes en assets/fonts) se incrustan en la imagen
   como data URL; si no existe (p. ej. aún se usa Google Fonts) se usa la fuente del sistema como sustituta. */
const EXP_SCALES = [0.5, 1, 1.5];
const expMenu = $("#expMenu");
let expRegion = null; // null = todo el espacio visible · { x, y, w, h } = recorte (px del espacio de trabajo)
let FONTS_CSS = null; // @font-face con las fuentes locales incrustadas (data URL); "" si no hay fuentes locales
async function fontsCss() {
  if (FONTS_CSS !== null) return FONTS_CSS;
  try {
    const css = await (await fetch("css/00-fonts.css")).text(),
      urls = [...new Set([...css.matchAll(/url\("?([^")]+)"?\)/g)].map((m) => m[1]))],
      map = {};
    await Promise.all(
      urls.map(async (u) => {
        const b = await (await fetch(new URL(u, new URL("css/00-fonts.css", document.baseURI)))).blob();
        map[u] = await new Promise((r) => {
          const fr = new FileReader();
          fr.onload = () => r(fr.result);
          fr.readAsDataURL(b);
        });
      })
    );
    FONTS_CSS = css.replace(/url\("?([^")]+)"?\)/g, (_, u) => `url("${map[u]}")`);
  } catch (_) {
    FONTS_CSS = ""; // sin fuentes locales o sin acceso (p. ej. file://): se usan las del sistema
  }
  return FONTS_CSS;
}
async function renderViewPng(k, reg) {
  const cr = canvas.getBoundingClientRect(),
    FW = Math.round(cr.width),
    FH = Math.round(cr.height),
    W = reg ? Math.round(reg.w) : FW,
    H = reg ? Math.round(reg.h) : FH,
    full = document.createElement("div"),
    wrap = document.createElement("div"),
    cs0 = getComputedStyle(canvas);
  full.style.cssText = `position:absolute;left:${reg ? -Math.round(reg.x) : 0}px;top:${reg ? -Math.round(reg.y) : 0}px;overflow:hidden;width:${FW}px;height:${FH}px;`;
  wrap.style.cssText = `position:relative;overflow:hidden;width:${W}px;height:${H}px;`;
  ["background-color", "background-image", "background-size", "background-position"].forEach((p) => full.style.setProperty(p, cs0.getPropertyValue(p)));
  const clone = world.cloneNode(true),
    src = [world, ...world.querySelectorAll("*")],
    dst = [clone, ...clone.querySelectorAll("*")],
    swaps = [];
  src.forEach((s, i) => {
    const cs = getComputedStyle(s),
      st = dst[i].style;
    for (const p of cs) if (!p.startsWith("outline")) st.setProperty(p, cs.getPropertyValue(p));
    if (s.tagName === "CANVAS") swaps.push([s, dst[i]]);
  });
  // los canvas (pixel art) no se copian con cloneNode: se sustituyen por una imagen de su contenido
  swaps.forEach(([s, d]) => {
    const im = document.createElement("img");
    try {
      im.src = s.toDataURL();
    } catch (_) {}
    im.style.cssText = d.style.cssText;
    d.replaceWith(im);
  });
  clone.querySelectorAll(".rh, .ch, #tmp").forEach((e) => e.remove());
  full.appendChild(clone);
  wrap.appendChild(full); // con recorte, el espacio completo se desplaza y la ventana (wrap) solo deja ver la zona
  const fc = await fontsCss(),
    xhtml = (fc ? `<style>${fc}</style>` : "") + new XMLSerializer().serializeToString(wrap),
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * k}" height="${H * k}" viewBox="0 0 ${W} ${H}"><foreignObject x="0" y="0" width="${W}" height="${H}">${xhtml}</foreignObject></svg>`,
    img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  await img.decode();
  const c = document.createElement("canvas");
  c.width = Math.round(W * k);
  c.height = Math.round(H * k);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("No se pudo crear la imagen"))), "image/png"));
}
async function exportView(k) {
  const name = fileBase() + (expRegion ? "_recorte" : "") + "_x" + String(k).replace(".", "-") + ".png";
  try {
    const blob = await renderViewPng(k, expRegion);
    if (TAURI && TAURI.dialog) {
      const p = await TAURI.dialog.save({ defaultPath: name, filters: [{ name: t("Imagen PNG"), extensions: ["png"] }] });
      if (!p) return;
      await invoke("write_bytes", { path: p, data: Array.from(new Uint8Array(await blob.arrayBuffer())) });
    } else if (window.showSaveFilePicker) {
      const h = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: t("Imagen PNG"), accept: { "image/png": [".png"] } }] }),
        w = await h.createWritable();
      await w.write(blob);
      await w.close();
    } else {
      const a = document.createElement("a"); // sin diálogo: se descarga
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
    }
    toast("Vista exportada ✓");
  } catch (e) {
    if (e && e.name === "AbortError") return;
    toast("⚠ " + (e.message || e));
  }
}
const kTxt = (k) => (UI.lang === "es" ? String(k).replace(".", ",") : String(k)); // ×0,5 en español · ×0.5 en inglés
function expClose() {
  expMenu.hidden = true;
  $("#expBtn").classList.remove("on");
}
// paso 1: zona
function expStep1() {
  expMenu.innerHTML = `<div class="emh">${t("Exportar vista")}</div>
    <button data-m="crop"><b>${t("Recorte")}</b><span>${t("Elegir una zona")}</span></button>
    <button data-m="full"><b>${t("Espacio de trabajo completo")}</b><span>${t("Lo que se ve ahora")}</span></button>`;
  expMenu.hidden = false;
  $("#expBtn").classList.add("on");
}
// paso 2: resolución (según el tamaño de la zona elegida)
function expStep2() {
  const r = canvas.getBoundingClientRect(),
    w = expRegion ? expRegion.w : r.width,
    h = expRegion ? expRegion.h : r.height;
  expMenu.innerHTML =
    `<div class="emh"><button class="emb" data-m="back" title="${t("Volver")}">‹</button>${t("Resolución")}</div>` +
    EXP_SCALES.map((k) => `<button data-k="${k}"><b>×${kTxt(k)}</b><span>${Math.round(w * k)} × ${Math.round(h * k)} px</span></button>`).join("");
  expMenu.hidden = false;
  $("#expBtn").classList.add("on");
}
/* ---- Recorte rápido: rectángulo sobre el espacio de trabajo (se arrastra, se escala por los tiradores o se dibuja uno nuevo) ---- */
const ecEl = $("#expCrop"),
  ecr = ecEl.querySelector(".ecr"),
  EC_MIN = 40;
let ecRect = null,
  ecDrag = null;
function ecDraw() {
  Object.assign(ecr.style, { left: ecRect.x + "px", top: ecRect.y + "px", width: ecRect.w + "px", height: ecRect.h + "px" });
  ecEl.querySelector(".ecinfo").textContent = `${Math.round(ecRect.w)} × ${Math.round(ecRect.h)} px`;
}
function ecStart() {
  const r = canvas.getBoundingClientRect();
  if (!ecRect || ecRect.x + ecRect.w > r.width || ecRect.y + ecRect.h > r.height) {
    const w = Math.round(r.width * 0.6),
      h = Math.round(r.height * 0.6);
    ecRect = { x: Math.round((r.width - w) / 2), y: Math.round((r.height - h) / 2), w, h };
  }
  ecEl.hidden = false;
  ecDraw();
}
function ecEnd() {
  ecEl.hidden = true;
  ecDrag = null;
}
ecEl.addEventListener("pointerdown", (e) => {
  if (e.button !== 0 || e.target.closest(".ecbar")) return;
  e.preventDefault();
  const cr = canvas.getBoundingClientRect(),
    px = e.clientX - cr.left,
    py = e.clientY - cr.top,
    hd = e.target.closest(".ech"),
    inside = e.target.closest(".ecr");
  ecDrag = { px, py, r0: { ...ecRect }, c: hd ? hd.dataset.c : inside ? "move" : "new" };
  if (ecDrag.c === "new") ecRect = { x: px, y: py, w: 1, h: 1 };
  ecEl.setPointerCapture(e.pointerId);
});
ecEl.addEventListener("pointermove", (e) => {
  const d = ecDrag;
  if (!d) return;
  const cr = canvas.getBoundingClientRect(),
    cx = clamp(e.clientX - cr.left, 0, cr.width),
    cy = clamp(e.clientY - cr.top, 0, cr.height);
  if (d.c === "move") {
    ecRect.x = clamp(d.r0.x + (cx - d.px), 0, cr.width - d.r0.w);
    ecRect.y = clamp(d.r0.y + (cy - d.py), 0, cr.height - d.r0.h);
  } else if (d.c === "new") {
    ecRect = { x: Math.min(d.px, cx), y: Math.min(d.py, cy), w: Math.abs(cx - d.px), h: Math.abs(cy - d.py) };
  } else {
    let L = d.r0.x,
      T = d.r0.y,
      R = L + d.r0.w,
      B = T + d.r0.h;
    if (d.c.includes("w")) L = clamp(cx, 0, R - EC_MIN);
    if (d.c.includes("e")) R = clamp(cx, L + EC_MIN, cr.width);
    if (d.c.includes("n")) T = clamp(cy, 0, B - EC_MIN);
    if (d.c.includes("s")) B = clamp(cy, T + EC_MIN, cr.height);
    ecRect = { x: L, y: T, w: R - L, h: B - T };
  }
  ecDraw();
});
const ecUp = () => {
  if (ecDrag && ecDrag.c === "new" && (ecRect.w < EC_MIN || ecRect.h < EC_MIN)) ecRect = { ...ecDrag.r0 }; // un clic suelto no deja un recorte diminuto
  ecDrag = null;
  ecDraw();
};
ecEl.addEventListener("pointerup", ecUp);
ecEl.addEventListener("pointercancel", ecUp);
ecEl.addEventListener("click", (e) => {
  const b = e.target.closest(".ecbar button");
  if (!b) return;
  ecEnd();
  if (b.dataset.a === "ok") {
    expRegion = { ...ecRect };
    expStep2();
  }
});
$("#expBtn").onclick = (e) => {
  e.stopPropagation();
  expMenu.hidden ? expStep1() : expClose();
};
expMenu.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.m === "crop") {
    expClose();
    ecStart();
  } else if (b.dataset.m === "full") {
    expRegion = null;
    expStep2();
  } else if (b.dataset.m === "back") expStep1();
  else if (b.dataset.k) {
    expClose();
    exportView(+b.dataset.k);
  }
});
document.addEventListener("pointerdown", (e) => {
  if (!expMenu.hidden && !e.target.closest("#expMenu, #expBtn")) expClose();
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !ecEl.hidden) ecEnd();
  else if (e.key === "Escape" && !expMenu.hidden) expClose();
  else if (e.key === "Enter" && !ecEl.hidden) {
    ecEnd();
    expRegion = { ...ecRect };
    expStep2();
  }
});
