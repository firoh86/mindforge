"use strict";
/* =====================  Imágenes  ===================== */
const readDataURL = (f) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(f);
  });
const loadImg = (src) =>
  new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
async function addImageFile(file, x, y, parent) {
  try {
    let url = await readDataURL(file);
    const im = await loadImg(url);
    let w = im.naturalWidth,
      h = im.naturalHeight;
    const MAX = 2400;
    if (file.size > 1.5e6 || Math.max(w, h) > MAX) {
      const s = Math.min(1, MAX / Math.max(w, h)),
        c = document.createElement("canvas");
      c.width = Math.round(w * s);
      c.height = Math.round(h * s);
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      url = c.toDataURL("image/jpeg", 0.9);
      w = c.width;
      h = c.height;
    }
    const dw = Math.max(60, Math.round(Math.min(400, w) / GRID) * GRID),
      dh = Math.round((dw * h) / w);
    const id = uid();
    board.images[id] = url;
    addNode("image", x, y, {
      img: id,
      w: dw,
      h: dh,
      nw: w,
      nh: h,
      noEdit: true,
      ...(parent ? { parent } : {}),
    });
  } catch (e) {
    toast("⚠ No se pudo cargar la imagen");
  }
}
async function restoreImage(n) {
  let w = n.nw,
    h = n.nh;
  if (!w) {
    const im = await loadImg(board.images[n.img]);
    w = im.naturalWidth;
    h = im.naturalHeight;
    n.nw = w;
    n.nh = h;
  }
  if (n.crop) {
    w = Math.round(w * n.crop.w);
    h = Math.round(h * n.crop.h);
  }
  n.w = w;
  n.h = h;
  applyNode(n);
  renderEdges();
  commit();
  toast(`Tamaño original: ${w}×${h}`);
}
/* Guardar como… : el formato (PNG o JPEG) se elige en el diálogo de guardado, por el tipo o la extensión del archivo.
   Exporta la imagen con su recorte, a su resolución original. */
async function imageBlob(n, fmt) {
  const src = board.images[n.img];
  if (!src) return null;
  const im = new Image();
  im.src = src;
  await im.decode();
  const c = n.crop || { x: 0, y: 0, w: 1, h: 1 },
    sx = Math.round(im.naturalWidth * c.x),
    sy = Math.round(im.naturalHeight * c.y),
    sw = Math.max(1, Math.round(im.naturalWidth * c.w)),
    sh = Math.max(1, Math.round(im.naturalHeight * c.h)),
    cv = document.createElement("canvas");
  cv.width = sw;
  cv.height = sh;
  const g = cv.getContext("2d");
  if (fmt === "jpeg") {
    g.fillStyle = "#ffffff"; // JPEG no admite transparencia
    g.fillRect(0, 0, sw, sh);
  }
  g.drawImage(im, sx, sy, sw, sh, 0, 0, sw, sh);
  return new Promise((r) => cv.toBlob(r, fmt === "jpeg" ? "image/jpeg" : "image/png", 0.92));
}
const fmtOf = (name) => (/\.jpe?g$/i.test(name || "") ? "jpeg" : "png");
async function exportImage(n) {
  if (!board.images[n.img]) return;
  const base = (n.title && !DEFAULT_TITLES.has(n.title) ? safeName(n.title) : "") || "imagen",
    DESC = { png: "Imagen PNG", jpeg: "Imagen JPEG" };
  try {
    if (TAURI && TAURI.dialog) {
      const p = await TAURI.dialog.save({
        defaultPath: base + ".png",
        filters: [
          { name: t("Imagen PNG"), extensions: ["png"] },
          { name: t("Imagen JPEG"), extensions: ["jpg", "jpeg"] },
        ],
      });
      if (!p) return;
      const blob = await imageBlob(n, fmtOf(p));
      await invoke("write_bytes", { path: p, data: Array.from(new Uint8Array(await blob.arrayBuffer())) });
    } else if (window.showSaveFilePicker) {
      const h = await window.showSaveFilePicker({
        suggestedName: base + ".png",
        types: [
          { description: t(DESC.png), accept: { "image/png": [".png"] } },
          { description: t(DESC.jpeg), accept: { "image/jpeg": [".jpg", ".jpeg"] } },
        ],
      });
      const blob = await imageBlob(n, fmtOf(h.name)),
        w = await h.createWritable();
      await w.write(blob);
      await w.close();
    } else {
      const a = document.createElement("a"); // sin diálogo: se descarga como PNG
      a.href = URL.createObjectURL(await imageBlob(n, "png"));
      a.download = base + ".png";
      a.click();
    }
    toast("Imagen guardada ✓");
  } catch (e) {
    if (e && e.name === "AbortError") return;
    toast("⚠ " + (e.message || e));
  }
}
let pendingPos = null,
  pendingParent = null;
function pickImages(pos, parent) {
  pendingPos = pos || null;
  pendingParent = parent || null;
  $("#imgIn").click();
}
$("#imgIn").addEventListener("change", async (e) => {
  let i = 0;
  for (const f of e.target.files)
    (await addImageFile(
      f,
      pendingPos ? pendingPos.x + i * GRID * 2 : undefined,
      pendingPos ? pendingPos.y + i * GRID * 2 : undefined,
      pendingParent,
    ),
      i++);
  e.target.value = "";
});
canvas.addEventListener("dragover", (e) => e.preventDefault());
canvas.addEventListener("drop", async (e) => {
  e.preventDefault();
  const p = toWorld(e.clientX, e.clientY);
  let i = 0;
  for (const f of e.dataTransfer.files)
    if (f.type.startsWith("image/")) {
      await addImageFile(f, p.x + i * GRID * 2, p.y + i * GRID * 2);
      i++;
    }
});
let lb = { k: 1, x: 0, y: 0 };
const applyLb = () => {
  $("#lbimg").style.transform =
    `translate(${lb.x}px,${lb.y}px) scale(${lb.k})`;
};
function openLightbox(src) {
  $("#lbimg").src = src;
  lb = { k: 1, x: 0, y: 0 };
  applyLb();
  $("#lb").style.display = "flex";
}
const closeLightbox = () => {
  $("#lb").style.display = "none";
};
$("#lb").addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    lb.k = clamp(lb.k * Math.exp(-e.deltaY * 0.0015), 0.2, 12);
    applyLb();
  },
  { passive: false },
);
$("#lb").addEventListener("pointerdown", (e) => {
  if (e.target.id === "lb") {
    closeLightbox();
    return;
  }
  if (e.target.id !== "lbimg") return;
  const s = { x: e.clientX, y: e.clientY, ox: lb.x, oy: lb.y };
  const mv = (ev) => {
    lb.x = s.ox + ev.clientX - s.x;
    lb.y = s.oy + ev.clientY - s.y;
    applyLb();
  };
  const up = () => {
    window.removeEventListener("pointermove", mv);
    window.removeEventListener("pointerup", up);
  };
  window.addEventListener("pointermove", mv);
  window.addEventListener("pointerup", up);
});
$("#lbx").onclick = closeLightbox;
