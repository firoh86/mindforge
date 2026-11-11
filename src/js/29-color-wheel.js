"use strict";
/* =====================  Rueda de color  ===================== */
const WS = { S: 240, R: 114, r: 94, rt: 86 };
const W = { h: 0, s: 1, v: 1, cb: null, cm: null };
let ringImg = null,
  triCv = null,
  wmode = null;
function buildRing() {
  const S = WS.S,
    c = S / 2,
    id = new ImageData(S, S),
    d8 = id.data;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = x + 0.5 - c,
        dy = y + 0.5 - c,
        d = Math.hypot(dx, dy),
        a = clamp(Math.min(WS.R - d, d - WS.r) + 0.5, 0, 1);
      if (a <= 0) continue;
      const hue = ((Math.atan2(-dy, dx) * 180) / Math.PI + 360) % 360,
        [r, g, b] = hsv2rgb(hue, 1, 1),
        i = (y * S + x) * 4;
      d8[i] = r;
      d8[i + 1] = g;
      d8[i + 2] = b;
      d8[i + 3] = Math.round(a * 255);
    }
  ringImg = id;
}
const TRI = () => {
  const c = WS.S / 2,
    rt = WS.rt,
    a = (2 * Math.PI) / 3;
  return {
    A: { x: c + rt, y: c },
    B: { x: c + rt * Math.cos(a), y: c - rt * Math.sin(a) },
    C: { x: c + rt * Math.cos(2 * a), y: c - rt * Math.sin(2 * a) },
  };
};
function bary(p, T) {
  const { A, B, C } = T,
    d = (B.y - C.y) * (A.x - C.x) + (C.x - B.x) * (A.y - C.y);
  const la = ((B.y - C.y) * (p.x - C.x) + (C.x - B.x) * (p.y - C.y)) / d,
    lb = ((C.y - A.y) * (p.x - C.x) + (A.x - C.x) * (p.y - C.y)) / d;
  return [la, lb, 1 - la - lb];
}
function wmark(ctx, x, y) {
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, 7);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#000";
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#fff";
  ctx.stroke();
}
function drawWheel() {
  const S = WS.S,
    ctx = $("#wcv").getContext("2d");
  if (!ringImg) buildRing();
  ctx.clearRect(0, 0, S, S);
  ctx.putImageData(ringImg, 0, 0);
  const T = TRI(),
    alt = 1.5 * WS.rt;
  if (!triCv) {
    triCv = document.createElement("canvas");
    triCv.width = triCv.height = S;
  }
  const tc = triCv.getContext("2d"),
    id = tc.createImageData(S, S),
    d8 = id.data;
  const x0 = Math.floor(T.C.x) - 1,
    x1 = Math.ceil(T.A.x) + 1,
    y0 = Math.floor(T.B.y) - 1,
    y1 = Math.ceil(T.C.y) + 1;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const [la, lb, lc] = bary({ x: x + 0.5, y: y + 0.5 }, T),
        a = clamp(Math.min(la, lb, lc) * alt + 0.5, 0, 1);
      if (a <= 0) continue;
      const pa = Math.max(la, 0),
        pb = Math.max(lb, 0),
        sum = pa + pb,
        s = sum > 0 ? pa / sum : 0,
        v = clamp(sum, 0, 1);
      const [r, g, b] = hsv2rgb(W.h, s, v),
        i = (y * S + x) * 4;
      d8[i] = r;
      d8[i + 1] = g;
      d8[i + 2] = b;
      d8[i + 3] = Math.round(a * 255);
    }
  tc.putImageData(id, 0, 0);
  ctx.drawImage(triCv, 0, 0);
  const c = S / 2,
    rm = (WS.R + WS.r) / 2,
    ang = (W.h * Math.PI) / 180;
  wmark(ctx, c + rm * Math.cos(ang), c - rm * Math.sin(ang));
  const a = W.s * W.v,
    b = W.v * (1 - W.s),
    cc = 1 - W.v;
  wmark(
    ctx,
    a * T.A.x + b * T.B.x + cc * T.C.x,
    a * T.A.y + b * T.B.y + cc * T.C.y,
  );
}
function syncWheelUI() {
  const hex = hsv2hex(W.h, W.s, W.v);
  $("#wprev").style.background = hex;
  $("#wHex").value = hex.toUpperCase();
  const H = Math.round(W.h),
    S = Math.round(W.s * 100),
    B = Math.round(W.v * 100);
  $("#wH").value = H;
  $("#wHn").value = H;
  $("#wS").value = S;
  $("#wSn").value = S;
  $("#wB").value = B;
  $("#wBn").value = B;
  $("#wS").style.background =
    `linear-gradient(to right,${hsv2hex(W.h, 0, W.v)},${hsv2hex(W.h, 1, W.v)})`;
  $("#wB").style.background =
    `linear-gradient(to right,#000,${hsv2hex(W.h, W.s, 1)})`;
}
const activeColor = () => hsv2hex(W.h, W.s, W.v);
let saveActT = null;
function mirrorActive(hex) {
  px.color = hex;
  renderPxColors();
  clearTimeout(saveActT);
  saveActT = setTimeout(() => {
    UI.activeColor = px.color;
    saveUI();
  }, 300);
}
// Cambio programático del color activo (swatches, chips, cuentagotas…).
// No dispara W.cb: no recolorea textos ni otros elementos.
function setActiveColor(hex) {
  hex = String(hex || "").trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(hex))
    hex = "#" + [...hex.slice(1)].map((c) => c + c).join("");
  if (!/^#[0-9a-f]{6}$/.test(hex)) return;
  setWheelHex(hex);
  if (isShown($("#wheel"))) {
    drawWheel();
    syncWheelUI();
  }
  mirrorActive(hex);
}
function wheelChanged() {
  drawWheel();
  syncWheelUI();
  const hex = activeColor();
  mirrorActive(hex);
  if (W.cb) W.cb(hex);
}
function setWheelHex(hex) {
  const [r, g, b] = hexRGB(hex),
    [h, s, v] = rgb2hsv(r, g, b);
  if (s > 0 && v > 0) W.h = h;
  W.s = s;
  W.v = v;
}
function openWheel(hex, cb, cm) {
  W.cb = null;
  setWheelHex(/^#[0-9a-f]{6}$/i.test(hex || "") ? hex : "#808080");
  W.cb = cb;
  W.cm = cm;
  const wh = $("#wheel");
  wh.style.display = "block";
  if (!wh.dataset.placed) {
    wh.dataset.placed = "1"; // primera vez: centrada arriba en el área de trabajo
    const s = stageRect();
    placeFixed(wh, s.left + (s.width - wh.offsetWidth) / 2, s.top + 30);
  } else reclampFixed(wh);
  drawWheel();
  syncWheelUI();
}
const wDone = () => {
  if (W.cm) W.cm();
};
$("#wH").addEventListener("input", (e) => {
  W.h = +e.target.value;
  wheelChanged();
});
$("#wS").addEventListener("input", (e) => {
  W.s = +e.target.value / 100;
  wheelChanged();
});
$("#wB").addEventListener("input", (e) => {
  W.v = +e.target.value / 100;
  wheelChanged();
});
["#wH", "#wS", "#wB"].forEach((s) =>
  $(s).addEventListener("change", wDone),
);
$("#wHn").addEventListener("input", (e) => {
  W.h = clamp(+e.target.value || 0, 0, 360);
  wheelChanged();
});
$("#wSn").addEventListener("input", (e) => {
  W.s = clamp(+e.target.value || 0, 0, 100) / 100;
  wheelChanged();
});
$("#wBn").addEventListener("input", (e) => {
  W.v = clamp(+e.target.value || 0, 0, 100) / 100;
  wheelChanged();
});
["#wHn", "#wSn", "#wBn"].forEach((s) =>
  $(s).addEventListener("change", wDone),
);
$("#wHex").addEventListener("input", (e) => {
  let v = e.target.value.trim();
  if (v && v[0] !== "#") v = "#" + v;
  if (/^#[0-9a-f]{6}$/i.test(v)) {
    setWheelHex(v);
    drawWheel();
    const hex = hsv2hex(W.h, W.s, W.v);
    $("#wprev").style.background = hex;
    mirrorActive(v.toLowerCase());
    if (W.cb) W.cb(v.toLowerCase());
    wDone();
  }
});
const wpos = (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) * WS.S) / r.width,
    y: ((e.clientY - r.top) * WS.S) / r.height,
  };
};
function wheelPick(p) {
  const c = WS.S / 2;
  if (wmode === "hue")
    W.h = ((Math.atan2(-(p.y - c), p.x - c) * 180) / Math.PI + 360) % 360;
  else {
    let [la, lb, lc] = bary(p, TRI());
    la = Math.max(la, 0);
    lb = Math.max(lb, 0);
    lc = Math.max(lc, 0);
    const sum = la + lb + lc || 1;
    la /= sum;
    lb /= sum;
    const t = la + lb;
    W.v = clamp(t, 0, 1);
    if (t > 0) W.s = clamp(la / t, 0, 1);
  }
  wheelChanged();
}
$("#wcv").addEventListener("pointerdown", (e) => {
  const cv = e.currentTarget;
  cv.setPointerCapture(e.pointerId);
  const p = wpos(e),
    c = WS.S / 2;
  wmode = Math.hypot(p.x - c, p.y - c) >= WS.r - 3 ? "hue" : "sv";
  wheelPick(p);
});
$("#wcv").addEventListener("pointermove", (e) => {
  if (e.currentTarget.hasPointerCapture(e.pointerId)) wheelPick(wpos(e));
});
$("#wcv").addEventListener("pointerup", (e) => {
  if (e.currentTarget.hasPointerCapture(e.pointerId)) {
    e.currentTarget.releasePointerCapture(e.pointerId);
    wDone();
  }
});
$("#wClose").onclick = () => {
  $("#wheel").style.display = "none";
  W.cb = null;
  W.cm = null;
};
$("#wheel .wh").addEventListener("pointerdown", (e) => {
  if (e.target.closest("button")) return;
  e.preventDefault();
  dragFixed($("#wheel"), e);
});
$("#wBar").onclick = () => {
  addCustom(hsv2hex(W.h, W.s, W.v));
  toast("Color añadido a la barra");
};
// el botón de la rueda usa el color de acento mientras la rueda está abierta
new MutationObserver(() =>
  $("#wheelBtn").classList.toggle("on", getComputedStyle($("#wheel")).display !== "none"),
).observe($("#wheel"), { attributes: true, attributeFilter: ["style"] });
// La rueda es el color activo. Moverla recolorea los textos seleccionados
// y, si hay una paleta seleccionada (sin pixel art), el chip marcado de esa paleta.
$("#wheelBtn").onclick = () => {
  if (getComputedStyle($("#wheel")).display !== "none") {
    $("#wClose").onclick(); // clic con la rueda abierta = cerrarla
    return;
  }
  let palEdited = false;
  openWheel(
    activeColor(),
    (hex) => {
      const pn = pal();
      if (pn && !pxNode()) {
        pn.colors[pn.selChip || 0] = hex;
        renderPalette(pn);
        palEdited = true;
      }
      if (textNodes().length || (!pxNode() && !pn)) setColorLive(hex);
    },
    () => {
      if (textNodes().length || palEdited) commit();
      palEdited = false;
    },
  );
};
setWheelHex(px.color); // la rueda arranca con el color activo guardado
