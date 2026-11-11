"use strict";
/* =====================  Menús desplegables: scroll sin abrir  ===================== */
document.addEventListener(
  "wheel",
  (e) => {
    const s = e.target;
    if (!s || s.tagName !== "SELECT" || document.activeElement !== s)
      return;
    e.preventDefault();
    const d = Math.sign(e.deltaY);
    if (!d) return;
    const i = clamp(s.selectedIndex + d, 0, s.options.length - 1);
    if (i !== s.selectedIndex) {
      s.selectedIndex = i;
      s.dispatchEvent(new Event("change", { bubbles: true }));
    }
  },
  { passive: false },
);
