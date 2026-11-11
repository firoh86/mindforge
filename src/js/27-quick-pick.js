"use strict";
/* =====================  Pipeta directa (Shift+clic)  ===================== */
function colorOf(n) {
  if (COLORABLE.includes(n.type)) return n.color === "outline" ? n.bc || null : n.color; // en modo borde, el color es el del borde
  if (n.type === "palette") return n.colors[n.selChip || 0];
  if (n.type === "pixel" && n.bgOn) return n.bgColor;
  return null;
}
function pickColorFrom(id, chipI) {
  const src = get(id),
    c = chipI != null && src.colors ? src.colors[chipI] : colorOf(src);
  if (!c) {
    toast("Ese elemento no tiene color");
    return;
  }
  let did = false,
    palChanged = false;
  [...sel].map(get).forEach((n) => {
    if (!n || n.id === id) return;
    if (COLORABLE.includes(n.type)) {
      applyColorTo(n, c);
      applyNode(n);
      did = true;
    } else if (n.type === "palette" && /^#/.test(c)) {
      n.colors[n.selChip || 0] = c;
      renderPalette(n);
      did = true;
      palChanged = true;
    } else if (n.type === "pixel" && /^#/.test(c)) {
      setPxColor(c);
      did = true;
    }
  });
  if (did) {
    commit();
    syncSwatches();
    if (palChanged) updateInspector();
    if (/^#/.test(c)) {
      setActiveColor(c);
      copyText(c);
    }
    toast("Color copiado y aplicado");
  } else toast("No se pudo aplicar el color");
}
