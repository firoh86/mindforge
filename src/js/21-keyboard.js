"use strict";
/* =====================  Teclado y portapapeles  ===================== */
// atajos de pixel art: ver pxKeys / keyTool()
window.addEventListener("keydown", (e) => {
  if (e.target.closest && e.target.closest(".msearch, #fabw")) return;
  if (e.key === "Escape" && $("#lb").style.display === "flex") {
    closeLightbox();
    return;
  }
  if (cropper) {
    if (e.key === "Enter") {
      e.preventDefault();
      endCrop(true);
    } else if (e.key === "Escape") {
      endCrop(false);
    }
    return;
  }
  // la tecla pertenece al campo donde se pulsó aunque ese campo ya haya perdido el foco (p. ej. Enter en el título lo
  // desenfoca antes de llegar aquí: no debe además editar el nodo seleccionado)
  const tg = e.target,
    ae = tg && tg !== document.body && tg !== document.documentElement && (tg.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(tg.tagName)) ? tg : document.activeElement;
  if (ae && ae.isContentEditable) {
    if (e.key === "Escape") ae.blur();
    else if (
      ae.matches(".content, .ttl") &&
      !e.altKey &&
      !e.shiftKey &&
      ((e.key === "Tab" && !e.ctrlKey && !e.metaKey) || (e.key === "Enter" && (e.ctrlKey || e.metaKey)))
    ) {
      // en edición: Tab = confirmar y crear hijo · Ctrl+Enter = confirmar y crear hermano
      const nel = ae.closest(".node"),
        cur = nel && get(nel.dataset.id);
      if (cur) {
        e.preventDefault();
        ae.blur();
        e.key === "Tab" ? addChild(cur) : addSibling(cur);
      }
    }
    return;
  }
  if (ae && /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName)) {
    if (e.key === "Escape") ae.blur();
    return;
  }
  const mod = e.ctrlKey || e.metaKey,
    k = e.key.toLowerCase(),
    pn = pxNode();
  if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    if (pn && PX.get(pn.id) && PX.get(pn.id).mask && sel.size === 1) {
      pxClearSelection(pn);
      return;
    }
    deleteSelection();
  } else if (mod && k === "x" && pn && PX.get(pn.id) && PX.get(pn.id).mask && sel.size === 1) {
    e.preventDefault(); // cortar = borrar los píxeles de la selección
    pxClearSelection(pn);
  } else if (mod && k === "z") {
    e.preventDefault();
    e.shiftKey ? redo() : undo();
  } else if (mod && k === "y") {
    e.preventDefault();
    redo();
  } else if (mod && k === "d") {
    e.preventDefault();
    duplicate();
  } else if (mod && k === "a") {
    e.preventDefault();
    setSel(visNodes().map((n) => n.id));
  } else if (
    mod &&
    (k === "b" || k === "i" || k === "u") &&
    textNodes().length
  ) {
    e.preventDefault();
    fmtToggle(
      { b: "b", i: "i", u: "u" }[k],
      { b: "bold", i: "italic", u: "underline" }[k],
    );
  } else if (mod && k === "0") {
    e.preventDefault();
    board.view = { x: 0, y: 0, k: 1 };
    applyView();
    scheduleSave();
  } else if (mod && (k === "=" || k === "+")) {
    e.preventDefault();
    zoomCenter(1.2);
  } else if (mod && k === "-") {
    e.preventDefault();
    zoomCenter(1 / 1.2);
  } else if (mod && k === "s") {
    e.preventDefault();
    persist().then(() => saveWs());
  } else if (
    !mod &&
    k === "c" &&
    sel.size === 1 &&
    get([...sel][0]).type === "image"
  ) {
    startCrop(get([...sel][0]));
  } else if (!mod && pn && keyTool(k) === "picker") {
    e.preventDefault();
    if (!e.repeat && px.tool !== "picker") {
      px.pickKey = e.key.toLowerCase();
      px.tool = "picker";
      updatePxInsp();
      pxSyncAll();
    }
  } else if (!mod && pn && keyTool(k)) {
    px.tool = keyTool(k);
    updatePxInsp();
  } else if (e.key === " " && !mod && !e.altKey && !e.shiftKey && sel.size && (ae === document.body || canvas.contains(ae))) {
    e.preventDefault(); // Espacio: centra la vista sobre los nodos seleccionados
    if (!e.repeat) fit();
  } else if (e.key === "F2" && sel.size === 1) {
    e.preventDefault();
    startEdit(get([...sel][0]), "content");
  } else if (e.key === "Enter" && !e.altKey && !e.shiftKey && sel.size === 1) {
    e.preventDefault();
    // Enter edita el texto (como F2) · Ctrl+Enter crea un nodo hermano (igual que durante la edición)
    mod ? addSibling(get([...sel][0])) : startEdit(get([...sel][0]), "content");
  } else if (e.key === "Tab" && !mod && !e.altKey && sel.size === 1 && (ae === document.body || canvas.contains(ae))) {
    e.preventDefault();
    const n0 = get([...sel][0]);
    if (e.shiftKey) {
      const pr = parentOf(n0); // Mayús+Tab: sube al padre
      if (pr) {
        setSel([pr.id]);
        ensureVisible(pr);
      }
    } else addChild(n0);
  } else if (e.key === "/" && !mod && sel.size) {
    e.preventDefault();
    const ns = [...sel].map(get).filter((n) => n && hasKids(n));
    if (ns.length) setFold(ns.map((n) => n.id), ns.some((n) => !n.fold));
  } else if (e.key === "Escape") {
    if (pn && PX.get(pn.id) && PX.get(pn.id).mask) {
      PX.get(pn.id).mask = null;
      pxOverlay(pn);
      return;
    }
    setSel([]);
    hideMenu();
  } else if (e.key.startsWith("Arrow") && sel.size) {
    e.preventDefault();
    const s = e.shiftKey ? GRID * 5 : GRID;
    const dx =
        e.key === "ArrowLeft" ? -s : e.key === "ArrowRight" ? s : 0,
      dy = e.key === "ArrowUp" ? -s : e.key === "ArrowDown" ? s : 0;
    const mv = branchIds([...sel]);
    mv.forEach((id) => {
      const n = get(id);
      if (isLocked(n) && !mv.has(n.grp)) return; // bloqueado en un grupo
      n.x += dx;
      n.y += dy;
      applyNode(n);
    });
    renderEdges();
    commit();
  }
});
/* Cuentagotas temporal: activo solo mientras se mantiene el atajo */
function pickerRelease() {
  if (px.tool !== "picker") return;
  px.tool = "pencil";
  px.pickKey = null;
  updatePxInsp();
  pxSyncAll();
}
window.addEventListener("keyup", (e) => {
  if (px.tool === "picker" && e.key.toLowerCase() === px.pickKey)
    pickerRelease();
});
window.addEventListener("blur", pickerRelease);
document.addEventListener("paste", async (e) => {
  const t = e.target;
  if (t.isContentEditable) {
    e.preventDefault();
    document.execCommand(
      "insertText",
      false,
      (e.clipboardData || window.clipboardData).getData("text/plain"),
    );
    return;
  }
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
  const files = [...(e.clipboardData.files || [])].filter((f) =>
    f.type.startsWith("image/"),
  );
  const p = mouse || viewCenter();
  if (files.length) {
    e.preventDefault();
    let i = 0;
    for (const f of files) {
      await addImageFile(f, p.x + i * GRID * 2, p.y + i * GRID * 2);
      i++;
    }
    return;
  }
  const txt = e.clipboardData.getData("text/plain").trim();
  if (txt) {
    e.preventDefault();
    addNode("text", p.x, p.y, {
      html: esc(txt).replace(/\n/g, "<br>"),
      noEdit: true,
    });
  }
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("#bar button");
  if (b && e.detail !== 0) b.blur(); // solo si se pulsó con ratón/dedo; con teclado se conserva el foco
});
