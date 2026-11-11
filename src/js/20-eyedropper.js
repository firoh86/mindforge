"use strict";
/* ===================== Cuentagotas Global para Pixel Art Rubi ===================== */
const pkCache = { src: null, cv: null };
function pkImageColor(nodeEl, e) {
  const box = nodeEl.querySelector(".imgbox"),
    im = nodeEl.querySelector("img");
  if (!im || !im.naturalWidth) return null;
  const br = box.getBoundingClientRect();
  if (
    e.clientX < br.left || e.clientX > br.right ||
    e.clientY < br.top || e.clientY > br.bottom
  )
    return null;
  const r = im.getBoundingClientRect();
  if (pkCache.src !== im.src) {
    const cv = document.createElement("canvas");
    cv.width = im.naturalWidth;
    cv.height = im.naturalHeight;
    cv.getContext("2d", { willReadFrequently: true }).drawImage(im, 0, 0);
    pkCache.src = im.src;
    pkCache.cv = cv;
  }
  const x = clamp(Math.floor(((e.clientX - r.left) / r.width) * im.naturalWidth), 0, im.naturalWidth - 1),
    y = clamp(Math.floor(((e.clientY - r.top) / r.height) * im.naturalHeight), 0, im.naturalHeight - 1);
  try {
    const d = pkCache.cv.getContext("2d").getImageData(x, y, 1, 1).data;
    return d[3] === 0 ? "transparent" : toHex(d[0], d[1], d[2]);
  } catch (err) {
    return null;
  }
}
function pkCanvasColor(cv, e) {
  const r = cv.getBoundingClientRect();
  const x = clamp(Math.floor(((e.clientX - r.left) / r.width) * cv.width), 0, cv.width - 1),
    y = clamp(Math.floor(((e.clientY - r.top) / r.height) * cv.height), 0, cv.height - 1);
  const d = cv.getContext("2d").getImageData(x, y, 1, 1).data;
  return d[3] === 0 ? "transparent" : toHex(d[0], d[1], d[2]);
}
function pkPixelColor(node, e) {
  const st = PX.get(node.id);
  if (!st) return null;
  const p = pxPos(node, e);
  if (p.x < 0 || p.y < 0 || p.x >= node.pw || p.y >= node.ph) return null;
  const v = st.buf[p.y * node.pw + p.x];
  if ((v >>> 0) >>> 24 === 0) return node.bgOn ? node.bgColor : "transparent";
  return toHex(v & 255, (v >> 8) & 255, (v >> 16) & 255);
}
window.addEventListener(
  "pointerdown",
  (e) => {
    const n = pxNode();
    if (!n || px.tool !== "picker") return;

    // Si hacemos clic dentro del propio lienzo de pixel art activo, dejamos que actúe su propia lógica
    const pxwrap = e.target.closest(".pxwrap");
    if (pxwrap) {
      const nodeEl = pxwrap.closest(".node");
      if (nodeEl && nodeEl.dataset.id === n.id) return;
    }

    // Interceptamos el clic globalmente para que no cambie la selección ni mueva elementos
    e.preventDefault();
    e.stopPropagation();

    let pickedColor = null;

    // 0. Rueda de color (aro y triángulo), imágenes y otras tarjetas pixel art
    const wcv = e.target.closest("#wcv");
    if (wcv) pickedColor = pkCanvasColor(wcv, e);
    if (!pickedColor) {
      const ne = e.target.closest(".node");
      if (ne) {
        const tn = get(ne.dataset.id);
        if (tn && tn.type === "image") pickedColor = pkImageColor(ne, e);
        else if (tn && tn.type === "pixel" && e.target.closest(".pxwrap"))
          pickedColor = pkPixelColor(tn, e);
      }
    }
    if (pickedColor === "transparent") {
      toast("Píxel transparente");
      return;
    }

    // 1. Si clicamos en un chip de una paleta de color
    const chip = e.target.closest(".chip");
    if (chip) {
      const paletteNodeEl = chip.closest(".node");
      if (paletteNodeEl) {
        const palNode = get(paletteNodeEl.dataset.id);
        if (palNode && palNode.colors) {
          pickedColor = palNode.colors[+chip.dataset.i];
        }
      }
    }

    // 2. Si clicamos en una muestra de color (swatch) o rejilla de colores
    if (!pickedColor) {
      const sw = e.target.closest(".sw, .swgrid i");
      if (sw) {
        pickedColor =
          sw.dataset.c || window.getComputedStyle(sw).backgroundColor;
      }
    }

    // 3. Si clicamos en cualquier otra tarjeta (globo, texto, comentario, etc.)
    if (!pickedColor) {
      const nodeEl = e.target.closest(".node");
      if (nodeEl) {
        const targetNode = get(nodeEl.dataset.id);
        if (targetNode) {
          pickedColor = colorOf(targetNode);
        }
      }
    }

    // 4. Si clicamos en la vista previa de la rueda de color o elementos con color de fondo
    if (!pickedColor) {
      const wprev = e.target.closest("#wprev");
      if (wprev) {
        pickedColor = wprev.style.backgroundColor;
      } else if (e.target.style && e.target.style.backgroundColor) {
        pickedColor = e.target.style.backgroundColor;
      }
    }

    // Si encontramos un color válido, lo aplicamos al Pixel Art
    if (pickedColor) {
      let hex = pickedColor;
      if (hex.startsWith("rgb")) {
        const rgbMatch = hex.match(/\d+/g);
        if (rgbMatch && rgbMatch.length >= 3) {
          hex = toHex(+rgbMatch[0], +rgbMatch[1], +rgbMatch[2]);
        }
      }
      if (/^#[0-9a-f]{6}$/i.test(hex) || /^#[0-9a-f]{3}$/i.test(hex)) {
        setPxColor(hex.toLowerCase());
        toast(`Color capturado: ${hex.toUpperCase()}`);
      }
    } else {
      toast("No se pudo extraer un color válido de este elemento");
    }
  },
  true,
);
