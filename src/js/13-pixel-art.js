"use strict";
/* =====================  PIXEL ART  ===================== */
const PX = new Map();
const px = {
  tool: "pencil",
  size: 1,
  tip: "circle", // punta del lápiz/goma: "circle" | "square"
  color: /^#[0-9a-f]{6}$/i.test(UI.activeColor || "")
    ? UI.activeColor.toLowerCase()
    : "#f2a65e",
  grid: true,
  scale: 8,
  lib: "Pear36",
  recent: [],
};
const c32 = (hex) => {
  const [r, g, b] = hexRGB(hex);
  return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
};
function rleEnc(buf) {
  const out = [];
  let i = 0;
  const n = buf.length;
  while (i < n) {
    const v = buf[i];
    let j = i + 1;
    while (j < n && buf[j] === v) j++;
    out.push(j - i, v >>> 0);
    i = j;
  }
  return out;
}
function rleDec(rle, len) {
  const b = new Uint32Array(len);
  let p = 0;
  for (let i = 0; i < rle.length; i += 2) {
    b.fill(rle[i + 1], p, p + rle[i]);
    p += rle[i];
  }
  return b;
}
function pxSetup(n) {
  const el = els.get(n.id);
  // si el nodo se vuelve a pintar (cambio de selección, idioma…) la selección de píxeles se conserva
  const prev = PX.get(n.id);
  const keepMask = prev && prev.mask && prev.mask.length === n.pw * n.ph ? prev.mask : null;
  const st = {
    buf: n.rle
      ? rleDec(n.rle, n.pw * n.ph)
      : new Uint32Array(n.pw * n.ph),
    mask: keepMask,
  };
  st.cv = el.querySelector(".pxc");
  st.ov = el.querySelector(".pxov");
  st.cv.width = n.pw;
  st.cv.height = n.ph;
  st.ctx = st.cv.getContext("2d");
  st.img = new ImageData(
    new Uint8ClampedArray(st.buf.buffer),
    n.pw,
    n.ph,
  );
  PX.set(n.id, st);
  el.style.setProperty("--pw", n.pw);
  el.style.setProperty("--ph", n.ph);
  pxRender(n);
  pxOverlay(n);
  pxBg(n);
  pxFoot(n);
  pxSyncAll();
}
const pxRender = (n) => {
  const st = PX.get(n.id);
  if (st) st.ctx.putImageData(st.img, 0, 0);
  pxTileRender(n);
};
/* Modo tile: 8 píxeles repetidos (envueltos) alrededor del lienzo, en las 8 direcciones.
   Se pintan en un canvas aparte con un degradado: sólido junto al lienzo → 0 en el borde exterior
   (arranca en 0,6 si el fondo del nodo es translúcido). */
function pxTileRender(n) {
  const el = els.get(n.id),
    c = el && el.querySelector(".pxtile"),
    st = PX.get(n.id);
  if (!c || !st || !n.tile) return;
  const M = TILEM,
    pw = n.pw,
    ph = n.ph,
    W = pw + 2 * M,
    H = ph + 2 * M,
    base = n.ghost ? 0.4 : 1,
    bg = n.bgOn ? c32(n.bgColor || "#ffffff") : 0;
  if (c.width !== W || c.height !== H) {
    c.width = W;
    c.height = H;
  }
  const img = new ImageData(W, H),
    o = new Uint32Array(img.data.buffer),
    fall = (d) => (d ? base * (1 - (d - 0.5) / M) : 1);
  for (let Y = 0; Y < H; Y++) {
    const dy = Y < M ? M - Y : Y >= M + ph ? Y - (M + ph) + 1 : 0,
      sy = (((Y - M) % ph) + ph) % ph;
    for (let X = 0; X < W; X++) {
      const dx = X < M ? M - X : X >= M + pw ? X - (M + pw) + 1 : 0;
      if (!dx && !dy) continue;
      const sx = (((X - M) % pw) + pw) % pw;
      let v = st.buf[sy * pw + sx];
      if (!(v >>> 24)) v = bg;
      const a = Math.round((v >>> 24) * fall(dx) * fall(dy));
      if (a) o[Y * W + X] = ((v & 0x00ffffff) | (a << 24)) >>> 0;
    }
  }
  c.getContext("2d").putImageData(img, 0, 0);
}
/* activa / desactiva el modo tile: el nodo crece (o se encoge) para alojar los píxeles extra sin mover el lienzo */
function pxTile(n, on, silent) {
  if (!!n.tile === !!on) return;
  const M = TILEM,
    p0 = n.w / (n.pw + (n.tile ? 2 * M : 0)),
    rx = n.x + (n.tile ? M * p0 : 0),
    ry = n.y + (n.tile ? M * p0 : 0),
    cols = n.pw + (on ? 2 * M : 0),
    rows = n.ph + (on ? 2 * M : 0),
    w = Math.max(PXMINW, p0 * cols),
    p1 = w / cols;
  if (on) n.tile = true;
  else delete n.tile;
  n.w = Math.round(w * 100) / 100;
  n.h = Math.round((PXH + PXF + p1 * rows) * 100) / 100;
  n.x = Math.round((rx - (on ? M * p1 : 0)) * 100) / 100;
  n.y = Math.round((ry - (on ? M * p1 : 0)) * 100) / 100;
  applyNode(n);
  pxOverlay(n);
  renderEdges();
  if (silent) scheduleSave();
  else commit();
}
/* el modo tile es temporal: solo existe mientras el nodo es el único seleccionado */
function pxTileCleanup() {
  board.nodes.forEach((n) => {
    if (n.type === "pixel" && n.tile && !(sel.size === 1 && sel.has(n.id))) pxTile(n, false, true);
  });
}
/* Botón central + arrastrar: desplaza (con envoltura) todos los píxeles del nodo, como en un tile */
function pxShiftApply(d, dx, dy) {
  const n = d.n,
    st = d.st,
    w = n.pw,
    h = n.ph;
  for (let y = 0; y < h; y++) {
    const sy = (((y - dy) % h) + h) % h;
    for (let x = 0; x < w; x++) {
      const sx = (((x - dx) % w) + w) % w;
      st.buf[y * w + x] = d.base[sy * w + sx];
      if (d.bm) st.mask[y * w + x] = d.bm[sy * w + sx];
    }
  }
  pxRender(n);
  pxOverlay(n);
}
function pxBg(n) {
  const b = els.get(n.id).querySelector(".pxbg");
  b.style.background = n.bgOn ? n.bgColor : "transparent";
  pxTileRender(n);
}
function pxOverlay(n) {
  const st = PX.get(n.id);
  if (!st) return;
  const ov = st.ov,
    k = Math.max(1, Math.floor(640 / Math.max(n.pw, n.ph)));
  ov.width = n.pw * k;
  ov.height = n.ph * k;
  const c = ov.getContext("2d");
  c.clearRect(0, 0, ov.width, ov.height);
  const m = st.mask;
  if (!m) return;
  const acc =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--acc")
        .trim() || "#f56565",
    w = n.pw,
    h = n.ph;
  c.fillStyle = acc;
  c.globalAlpha = 0.22;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (m[y * w + x]) c.fillRect(x * k, y * k, k, k);
  c.globalAlpha = 1;
  c.strokeStyle = acc;
  c.lineWidth = Math.max(1.5, k / 8);
  c.beginPath();
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (m[y * w + x]) {
        if (y === 0 || !m[(y - 1) * w + x]) {
          c.moveTo(x * k, y * k);
          c.lineTo((x + 1) * k, y * k);
        }
        if (y === h - 1 || !m[(y + 1) * w + x]) {
          c.moveTo(x * k, (y + 1) * k);
          c.lineTo((x + 1) * k, (y + 1) * k);
        }
        if (x === 0 || !m[y * w + x - 1]) {
          c.moveTo(x * k, y * k);
          c.lineTo(x * k, (y + 1) * k);
        }
        if (x === w - 1 || !m[y * w + x + 1]) {
          c.moveTo((x + 1) * k, y * k);
          c.lineTo((x + 1) * k, (y + 1) * k);
        }
      }
  c.stroke();
}
function pxCommit(n, recent) {
  const st = PX.get(n.id);
  n.rle = rleEnc(st.buf);
  if (recent) pushRecent(px.color);
  commit();
}
function pushRecent(c) {
  px.recent = [c, ...px.recent.filter((x) => x !== c)].slice(0, 16);
  renderPxColors();
}
function pxResize(n, w, h) {
  w = clamp(Math.round(w) || 16, 1, 256);
  h = clamp(Math.round(h) || 16, 1, 256);
  const old = PX.get(n.id),
    nb = new Uint32Array(w * h),
    cw = Math.min(w, n.pw),
    chh = Math.min(h, n.ph);
  for (let y = 0; y < chh; y++)
    for (let x = 0; x < cw; x++) nb[y * w + x] = old.buf[y * n.pw + x];
  n.pw = w;
  n.ph = h;
  const tm = n.tile ? 2 * TILEM : 0;
  n.h = PXH + PXF + Math.round((n.w * (h + tm)) / (w + tm));
  n.rle = rleEnc(nb);
  pxSetup(n);
  applyNode(n);
  renderEdges();
  commit();
  updatePxInsp();
}
function pxPos(n, e) {
  const st = PX.get(n.id),
    r = st.cv.getBoundingClientRect();
  return {
    x: Math.floor(((e.clientX - r.left) / r.width) * n.pw),
    y: Math.floor(((e.clientY - r.top) / r.height) * n.ph),
  };
}
function pxPosF(n, e) {
  const st = PX.get(n.id),
    r = st.cv.getBoundingClientRect();
  return {
    x: clamp(((e.clientX - r.left) / r.width) * n.pw, 0, n.pw),
    y: clamp(((e.clientY - r.top) / r.height) * n.ph, 0, n.ph),
  };
}
/* Punta circular de diámetro s (1–10): se incluyen las celdas cuyo centro cae dentro del círculo.
   s=2 → 2×2, s=3 → cruz, s=4 → 4×4 sin esquinas, s=5 → 5×5 sin esquinas, etc. */
const TIPC = {};
function tipCircle(s) {
  if (TIPC[s]) return TIPC[s];
  const c = (s - 1) / 2,
    t = (s / 2) * (s / 2) - 0.5,
    m = [];
  for (let j = 0; j < s; j++)
    for (let i = 0; i < s; i++) m.push(s === 1 || (i - c) * (i - c) + (j - c) * (j - c) <= t ? 1 : 0);
  return (TIPC[s] = m);
}
function stamp(n, st, x, y, erase) {
  const s = px.size,
    o = Math.floor((s - 1) / 2),
    v = erase ? 0 : c32(px.color),
    tm = px.tip === "circle" ? tipCircle(s) : null;
  for (let j = 0; j < s; j++)
    for (let i = 0; i < s; i++) {
      if (tm && !tm[j * s + i]) continue;
      const X = x - o + i,
        Y = y - o + j;
      if (X < 0 || Y < 0 || X >= n.pw || Y >= n.ph) continue;
      if (st.mask && !st.mask[Y * n.pw + X]) continue;
      st.buf[Y * n.pw + X] = v;
    }
}
/* Vista previa del borde de la punta sobre la cuadrícula (solo el contorno, sin relleno) */
let pxHover = null;
function tipMask(s) {
  return px.tip === "circle" ? tipCircle(s) : new Array(s * s).fill(1);
}
function pxCursor() {
  document.querySelectorAll(".pxcur").forEach((c) => (c.style.display = "none"));
  const h = pxHover;
  if (!h) return;
  const n = get(h.id);
  if (!n || n.type !== "pixel" || !(sel.size === 1 && sel.has(n.id)) || !(px.tool === "pencil" || px.tool === "eraser")) return;
  if (h.x < 0 || h.y < 0 || h.x >= n.pw || h.y >= n.ph) return;
  const wrap = els.get(n.id).querySelector(".pxwrap");
  let c = wrap.querySelector(".pxcur");
  if (!c) {
    c = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    c.setAttribute("class", "pxcur");
    c.setAttribute("preserveAspectRatio", "none");
    c.innerHTML = '<path class="o"/><path class="i"/>';
    wrap.appendChild(c);
  }
  const s = px.size,
    o = Math.floor((s - 1) / 2),
    m = tipMask(s),
    on = (i, j) => i >= 0 && j >= 0 && i < s && j < s && m[j * s + i];
  let d = "";
  for (let j = 0; j < s; j++)
    for (let i = 0; i < s; i++) {
      if (!on(i, j)) continue;
      if (!on(i, j - 1)) d += `M${i} ${j}h1`;
      if (!on(i, j + 1)) d += `M${i} ${j + 1}h1`;
      if (!on(i - 1, j)) d += `M${i} ${j}v1`;
      if (!on(i + 1, j)) d += `M${i + 1} ${j}v1`;
    }
  c.setAttribute("viewBox", `0 0 ${s} ${s}`);
  c.querySelectorAll("path").forEach((p) => p.setAttribute("d", d));
  const M = n.tile ? TILEM : 0,
    cw = n.pw + 2 * M,
    chh = n.ph + 2 * M;
  Object.assign(c.style, {
    display: "block",
    left: ((h.x - o + M) / cw) * 100 + "%",
    top: ((h.y - o + M) / chh) * 100 + "%",
    width: (s / cw) * 100 + "%",
    height: (s / chh) * 100 + "%",
  });
}
function pline(n, st, x0, y0, x1, y1, er) {
  const dx = Math.abs(x1 - x0),
    dy = -Math.abs(y1 - y0),
    sx = x0 < x1 ? 1 : -1,
    sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    stamp(n, st, x0, y0, er);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}
/* Varita mágica: píxeles contiguos (4 direcciones) del mismo color; todo lo transparente cuenta como un solo color */
function wandMask(n, st, x, y) {
  const w = n.pw,
    h = n.ph,
    key = (v) => ((v >>> 24) ? v : 0),
    target = key(st.buf[y * w + x]),
    m = new Uint8Array(w * h),
    stack = [y * w + x];
  while (stack.length) {
    const i = stack.pop();
    if (m[i] || key(st.buf[i]) !== target) continue;
    m[i] = 1;
    const X = i % w,
      Y = (i / w) | 0;
    if (X > 0) stack.push(i - 1);
    if (X < w - 1) stack.push(i + 1);
    if (Y > 0) stack.push(i - w);
    if (Y < h - 1) stack.push(i + w);
  }
  return m;
}
function bucket(n, st, x, y) {
  const w = n.pw,
    h = n.ph;
  if (x < 0 || y < 0 || x >= w || y >= h) return;
  if (st.mask && !st.mask[y * w + x]) return;
  const target = st.buf[y * w + x],
    fill = c32(px.color);
  if (target === fill) return;
  const stack = [y * w + x];
  while (stack.length) {
    const i = stack.pop();
    if (st.buf[i] !== target) continue;
    if (st.mask && !st.mask[i]) continue;
    st.buf[i] = fill;
    const X = i % w,
      Y = (i / w) | 0;
    if (X > 0) stack.push(i - 1);
    if (X < w - 1) stack.push(i + 1);
    if (Y > 0) stack.push(i - w);
    if (Y < h - 1) stack.push(i + w);
  }
}
function lassoMask(n, pts) {
  const c = document.createElement("canvas");
  c.width = n.pw;
  c.height = n.ph;
  const x = c.getContext("2d");
  x.fillStyle = "#000";
  x.beginPath();
  pts.forEach((p, i) => (i ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y)));
  x.closePath();
  x.fill();
  const d = x.getImageData(0, 0, n.pw, n.ph).data,
    m = new Uint8Array(n.pw * n.ph);
  let any = false;
  for (let i = 0; i < m.length; i++)
    if (d[i * 4 + 3] > 127) {
      m[i] = 1;
      any = true;
    }
  return any ? m : null;
}
// Todo lo que "pilla" o elige un color (swatches, paletas, cuentagotas) pasa por aquí:
// el color activo vive en la rueda (W) y px.color es solo su reflejo.
function setPxColor(hex) {
  setActiveColor(hex);
}
function pxDown(n, e) {
  const st = PX.get(n.id),
    p = pxPos(n, e),
    t = px.tool;
  if (e.button === 2) {
    // doble clic derecho con una herramienta que no es de selección: quita la selección y sigues pintando
    const now = performance.now();
    if (st.mask && !["marquee", "lasso", "wand"].includes(t) && now - (st.rc || 0) < 450) {
      st.mask = null;
      st.rc = 0;
      pxOverlay(n);
      updatePxInsp();
      return;
    }
    const prevRc = st.rc || 0;
    st.rc = now;
    // clic derecho
    if (t === "marquee" || t === "lasso" || t === "wand") {
      if (now - prevRc < 450) {
        // doble clic derecho con una herramienta de selección: selecciona todo el lienzo
        st.mask = new Uint8Array(n.pw * n.ph).fill(1);
        st.rc = 0;
        pxOverlay(n);
        updatePxInsp();
        return;
      }
      if (st.mask) {
        st.mask = null;
        pxOverlay(n);
      }
      return;
    } // deselecciona
    if (t === "pencil" || t === "eraser") {
      drag = { type: "px", n, st, tool: "eraser", last: p, moved: false };
      stamp(n, st, p.x, p.y, true);
      pxRender(n);
    }
    return;
  }
  if (t === "picker") {
    const i = p.y * n.pw + p.x;
    if (p.x >= 0 && p.y >= 0 && p.x < n.pw && p.y < n.ph) {
      const v = st.buf[i];
      if ((v >>> 0) >>> 24 === 0) {
        if (n.bgOn) setPxColor(n.bgColor);
        else toast("Píxel transparente");
      } else setPxColor(toHex(v & 255, (v >> 8) & 255, (v >> 16) & 255));
    }
    return;
  }
  if (t === "bucket") {
    bucket(n, st, p.x, p.y);
    pxRender(n);
    pxCommit(n, true);
    return;
  }
  if (t === "wand" && p.x >= 0 && p.y >= 0 && p.x < n.pw && p.y < n.ph) {
    const inside = st.mask && st.mask[p.y * n.pw + p.x];
    if (!inside || e.shiftKey) {
      // clic = nueva selección; Shift + clic = suma otra región a la selección
      const m = wandMask(n, st, p.x, p.y);
      if (e.shiftKey && st.mask) for (let i = 0; i < m.length; i++) if (st.mask[i]) m[i] = 1;
      st.mask = m;
      pxOverlay(n);
      updatePxInsp();
      drag = { type: "px", n, st, tool: t, mode: "wand", last: p, moved: false };
      return;
    }
    // clic dentro de la selección: sigue el flujo normal y la arrastra
  }
  drag = { type: "px", n, st, tool: t, last: p, moved: false };
  if (t === "pencil" || t === "eraser") {
    stamp(n, st, p.x, p.y, t === "eraser");
    pxRender(n);
    return;
  }
  const inMask =
    st.mask &&
    p.x >= 0 &&
    p.y >= 0 &&
    p.x < n.pw &&
    p.y < n.ph &&
    st.mask[p.y * n.pw + p.x];
  if (inMask) {
    drag.mode = "move";
    drag.sp = p;
    drag.base = st.buf.slice();
    drag.idxs = [];
    drag.vals = [];
    for (let i = 0; i < st.mask.length; i++)
      if (st.mask[i]) {
        drag.idxs.push(i);
        drag.vals.push(st.buf[i]);
        drag.base[i] = 0;
      }
  } else {
    drag.mode = "sel";
    drag.s = pxPosF(n, e);
    drag.pts = [drag.s];
    st.mask = null;
    pxOverlay(n);
  }
}
function pxMove(e) {
  const d = drag,
    n = d.n,
    st = d.st,
    w = n.pw,
    h = n.ph;
  if (d.tool === "pencil" || d.tool === "eraser") {
    const p = pxPos(n, e);
    pline(n, st, d.last.x, d.last.y, p.x, p.y, d.tool === "eraser");
    d.last = p;
    d.moved = true;
    pxRender(n);
  } else if (d.mode === "move") {
    const p = pxPos(n, e),
      dx = p.x - d.sp.x,
      dy = p.y - d.sp.y;
    st.buf.set(d.base);
    const nm = new Uint8Array(w * h);
    for (let k = 0; k < d.idxs.length; k++) {
      const i = d.idxs[k],
        x = (i % w) + dx,
        y = ((i / w) | 0) + dy;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      if (d.vals[k] >>> 24) st.buf[y * w + x] = d.vals[k];
      nm[y * w + x] = 1;
    }
    st.mask = nm;
    d.moved = true;
    pxRender(n);
    pxOverlay(n);
  } else if (d.mode === "sel") {
    const f = pxPosF(n, e);
    d.moved = true;
    if (d.tool === "marquee") {
      const x0 = Math.floor(Math.min(d.s.x, f.x)),
        x1 = Math.min(w - 1, Math.floor(Math.max(d.s.x, f.x)));
      const y0 = Math.floor(Math.min(d.s.y, f.y)),
        y1 = Math.min(h - 1, Math.floor(Math.max(d.s.y, f.y)));
      const m = new Uint8Array(w * h);
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) m[y * w + x] = 1;
      st.mask = m;
    } else {
      d.pts.push(f);
      st.mask = d.pts.length > 2 ? lassoMask(n, d.pts) : null;
    }
    pxOverlay(n);
  }
}
function pxUp() {
  const d = drag,
    n = d.n;
  if (d.tool === "pencil" || d.tool === "eraser")
    pxCommit(n, d.tool === "pencil");
  else if (d.mode === "move") {
    if (d.moved) pxCommit(n);
  } else if (d.mode === "sel") {
    if (!d.moved && d.tool === "marquee") {
      d.st.mask = null;
      pxOverlay(n);
    }
    updatePxInsp();
  }
}
function pxClearSelection(n) {
  const st = PX.get(n.id);
  if (!st || !st.mask) return false;
  for (let i = 0; i < st.mask.length; i++) if (st.mask[i]) st.buf[i] = 0;
  pxRender(n);
  pxCommit(n);
  return true;
}
function slug(s) {
  return (
    (s || "pixel")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "pixel"
  );
}
async function exportPixel(n, s) {
  const st = PX.get(n.id);
  s = s || px.scale;
  const W = n.pw * s,
    H = n.ph * s;
  if (W > 16384 || H > 16384) {
    toast("Tamaño demasiado grande para exportar");
    return;
  }
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d");
  x.imageSmoothingEnabled = false;
  x.drawImage(st.cv, 0, 0, W, H); // solo la capa de dibujo: el fondo nunca se exporta
  const blob = await new Promise((r) => c.toBlob(r, "image/png")),
    bytes = new Uint8Array(await blob.arrayBuffer());
  const name = `${slug(n.title)}_${n.pw}x${n.ph}_x${s}.png`;
  try {
    if (TAURI && TAURI.dialog) {
      const p = await TAURI.dialog.save({
        defaultPath: name,
        filters: [{ name: "PNG", extensions: ["png"] }],
      });
      if (p) {
        await invoke("write_bytes", { path: p, data: Array.from(bytes) });
        toast(`PNG exportado (x${s}) ✓`);
      }
    } else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
    }
  } catch (e) {
    toast("⚠ " + e);
  }
}
