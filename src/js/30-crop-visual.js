"use strict";
/* =====================  Recorte visual de imágenes  ===================== */
let cropper = null;
function startCrop(n) {
  if (cropper) endCrop(false);
  const el = els.get(n.id),
    c = n.crop || { x: 0, y: 0, w: 1, h: 1 },
    src = board.images[n.img];
  const Wd = n.w / c.w,
    Hd = n.h / c.h,
    X0 = n.x - c.x * Wd,
    Y0 = n.y - c.y * Hd;
  const box = document.createElement("div");
  box.className = "cropper";
  Object.assign(box.style, {
    left: X0 + "px",
    top: Y0 + "px",
    width: Wd + "px",
    height: Hd + "px",
  });
  box.innerHTML =
    `<img class="cfull" src="${src}"><div class="cshade"></div><div class="cbox"><div class="cclip"><img src="${src}"></div>` +
    ["nw", "n", "ne", "e", "se", "s", "sw", "w"]
      .map((k) => `<i class="chd ${k}" data-h="${k}"></i>`)
      .join("") +
    `</div>`;
  world.appendChild(box);
  el.style.visibility = "hidden";
  cropper = {
    n,
    box,
    X0,
    Y0,
    W: Wd,
    H: Hd,
    r: { x: n.x, y: n.y, w: n.w, h: n.h },
  };
  updCrop();
  $("#cropbar").hidden = false;
  setSel([n.id]);
}
function updCrop() {
  const { box, X0, Y0, W: Wd, H: Hd, r } = cropper,
    cb = box.querySelector(".cbox"),
    im = cb.querySelector(".cclip img");
  cb.style.left = r.x - X0 + "px";
  cb.style.top = r.y - Y0 + "px";
  cb.style.width = r.w + "px";
  cb.style.height = r.h + "px";
  im.style.width = Wd + "px";
  im.style.height = Hd + "px";
  im.style.left = -(r.x - X0) + "px";
  im.style.top = -(r.y - Y0) + "px";
  // tinte de acento solo fuera del marco; dentro se ve el resultado real
  const x1 = r.x - X0,
    y1 = r.y - Y0,
    x2 = x1 + r.w,
    y2 = y1 + r.h;
  box.querySelector(".cshade").style.clipPath =
    `polygon(evenodd, 0 0, ${Wd}px 0, ${Wd}px ${Hd}px, 0 ${Hd}px, 0 0, ${x1}px ${y1}px, ${x1}px ${y2}px, ${x2}px ${y2}px, ${x2}px ${y1}px, ${x1}px ${y1}px)`;
}
function cropDown(e, el) {
  const hd = el.closest(".chd");
  drag = {
    type: "crop",
    mode: hd ? hd.dataset.h : "move",
    sx: e.clientX,
    sy: e.clientY,
    r0: { ...cropper.r },
  };
}
function cropMove(e) {
  const c = cropper,
    d = drag,
    k = board.view.k,
    dx = (e.clientX - d.sx) / k,
    dy = (e.clientY - d.sy) / k,
    r0 = d.r0,
    MIN = 24;
  const X0 = c.X0,
    X1 = c.X0 + c.W,
    Y0 = c.Y0,
    Y1 = c.Y0 + c.H;
  if (d.mode === "move") {
    c.r = {
      x: clamp(r0.x + dx, X0, X1 - r0.w),
      y: clamp(r0.y + dy, Y0, Y1 - r0.h),
      w: r0.w,
      h: r0.h,
    };
  } else {
    let L = r0.x,
      R = r0.x + r0.w,
      T = r0.y,
      B = r0.y + r0.h;
    if (d.mode.includes("w")) L = clamp(L + dx, X0, R - MIN);
    if (d.mode.includes("e")) R = clamp(R + dx, L + MIN, X1);
    if (d.mode.includes("n")) T = clamp(T + dy, Y0, B - MIN);
    if (d.mode.includes("s")) B = clamp(B + dy, T + MIN, Y1);
    c.r = { x: L, y: T, w: R - L, h: B - T };
  }
  updCrop();
}
function endCrop(apply) {
  if (!cropper) return;
  const { n, box, X0, Y0, W: Wd, H: Hd, r } = cropper;
  box.remove();
  els.get(n.id).style.visibility = "";
  cropper = null;
  $("#cropbar").hidden = true;
  if (!apply) return;
  const c = {
    x: (r.x - X0) / Wd,
    y: (r.y - Y0) / Hd,
    w: r.w / Wd,
    h: r.h / Hd,
  };
  if (
    c.w > 0.999 &&
    c.h > 0.999 &&
    Math.abs(c.x) < 0.001 &&
    Math.abs(c.y) < 0.001
  )
    delete n.crop;
  else n.crop = c;
  n.x = r.x;
  n.y = r.y;
  n.w = r.w;
  n.h = r.h;
  applyNode(n);
  renderEdges();
  commit();
}
function restoreCrop(n) {
  const c = n.crop;
  if (!c) {
    toast("La imagen no tiene recorte");
    return;
  }
  const Wd = n.w / c.w,
    Hd = n.h / c.h;
  n.x = n.x - c.x * Wd;
  n.y = n.y - c.y * Hd;
  n.w = Wd;
  n.h = Hd;
  delete n.crop;
  applyNode(n);
  renderEdges();
  commit();
  toast("Recorte restaurado");
}
$("#cropOk").onclick = () => endCrop(true);
$("#cropNo").onclick = () => endCrop(false);
