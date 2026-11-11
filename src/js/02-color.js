"use strict";
/* =====================  Color  ===================== */
function hexRGB(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lum(hex) {
  const [r, g, b] = hexRGB(hex).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const fg = (c) =>
  !c || c === "transparent" || c === "auto" || c === "outline"
    ? "var(--foreground)"
    : lum(c) > 0.4
      ? "#0d1117"
      : "#f1f5f9";
/* Contraste adaptativo: texto de nodos transparentes y flechas se invierten (oscuro/claro) según el cuadro de texto
   de color que tengan debajo. Sin cuadro debajo se usan los colores del tema. */
const INK_D = "#0d1117",
  INK_L = "#f1f5f9";
const inkFor = (hex) => (lum(hex) > 0.179 ? INK_D : INK_L);
function boxH(m) {
  const el = els.get(m.id);
  if (m.gcol && isGroupBox(m)) return el ? el.offsetHeight : nh(m); // grupo contraído: solo su cabecera
  return Math.max(el ? el.offsetHeight : nh(m), m.uh || 0);
}
// color de relleno del cuadro de texto que queda bajo el punto (x,y); self: solo los que están por debajo de ese nodo;
// onlyBack: solo los enviados al fondo (las flechas se dibujan sobre ellos y bajo el resto)
function boxUnder(x, y, self, onlyBack) {
  for (let i = (self ? board.nodes.indexOf(self) : board.nodes.length) - 1; i >= 0; i--) {
    const m = board.nodes[i];
    if (m.type !== "text" || !/^#/.test(m.color || "") || (onlyBack && !m.back)) continue;
    if (x >= m.x && x <= m.x + m.w && y >= m.y && y <= m.y + boxH(m)) return m;
  }
  return null;
}
function bgUnder(x, y, self, onlyBack) {
  const m = boxUnder(x, y, self, onlyBack);
  return m ? m.color : null;
}
let adaptQ = 0;
function queueAdapt() { // un cuadro de texto cambió de color/posición: recalcula tinta y flechas de lo que tiene encima
  if (adaptQ) return;
  adaptQ = requestAnimationFrame(() => {
    adaptQ = 0;
    renderEdges();
  });
}
function adaptNode(n) {
  if (!COLORABLE.includes(n.type) || (n.color !== "transparent" && n.color !== "outline")) return;
  const el = els.get(n.id);
  if (!el) return;
  const bg = bgUnder(n.x + n.w / 2, n.y + (n.type === "text" ? boxH(n) : nh(n)) / 2, n, false);
  el.style.setProperty("--nfg", bg ? inkFor(bg) : "var(--foreground)");
}
const toHex = (r, g, b) =>
  "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
function hsl2hex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = clamp(s, 0, 100) / 100;
  l = clamp(l, 0, 100) / 100;
  const k = (n) => (n + h / 30) % 12,
    a = s * Math.min(l, 1 - l);
  const f = (n) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return toHex(...[f(0), f(8), f(4)].map((v) => Math.round(v * 255)));
}
function hex2hsl(hex) {
  const [r, g, b] = hexRGB(hex).map((v) => v / 255),
    mx = Math.max(r, g, b),
    mn = Math.min(r, g, b),
    d = mx - mn;
  let h = 0;
  const l = (mx + mn) / 2,
    s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s * 100, l * 100];
}
function hsv2rgb(h, s, v) {
  h = ((h % 360) + 360) % 360;
  const c = v * s,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = v - c;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}
function rgb2hsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b),
    mn = Math.min(r, g, b),
    d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, mx ? d / mx : 0, mx];
}
const hsv2hex = (h, s, v) => toHex(...hsv2rgb(h, s, v));
function genPalette(g) {
  const { h, s, l, mode, n } = g,
    out = [];
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0.5;
    let hh = h,
      ss = s,
      ll = l;
    if (mode === "mono") ll = l + (t - 0.5) * 70;
    else if (mode === "analog") {
      hh =
        h + (i - (n - 1) / 2) * Math.min(28, (160 / Math.max(n, 1)) * 2);
      ll = l + (i % 2 ? 6 : -6);
    } else if (mode === "comp") {
      hh = h + (i % 2 ? 180 : 0);
      ll =
        l +
        (Math.floor(i / 2) - (Math.ceil(n / 2) - 1) / 2) *
          Math.min(14, (60 / n) * 2);
    } else if (mode === "triad") {
      hh = h + 120 * (i % 3);
      ll = l + Math.floor(i / 3) * Math.min(12, (50 / n) * 3) - 6;
    } else if (mode === "tetrad") {
      hh = h + 90 * (i % 4);
      ll = l + Math.floor(i / 4) * Math.min(12, (50 / n) * 4) - 6;
    } else if (mode === "split") {
      hh = h + [0, 150, 210][i % 3];
      ll = l + Math.floor(i / 3) * Math.min(12, (50 / n) * 3) - 6;
    } else if (mode === "rainbow") hh = h + i * (360 / n);
    else if (mode === "pastel") {
      hh = h + i * (360 / n);
      ss = Math.min(s, 65) * 0.9;
      ll = 84;
    } else if (mode === "grad") {
      hh = h + t * 50;
      ll = l + (t - 0.5) * 60;
    }
    out.push(hsl2hex(hh, ss, clamp(ll, 6, 96)));
  }
  return out;
}
