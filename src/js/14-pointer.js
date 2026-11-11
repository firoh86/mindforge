"use strict";
/* =====================  Interacciones de puntero  ===================== */
let lastChipClick = {},
  rcMarqAt = -1e9,
  drag = null,
  lastEdgeClick = {};
canvas.addEventListener("pointerdown", (e) => {
  const ae = document.activeElement,
    t = e.target;
  // botón de plegar rama: no activa ni arrastra el nodo (solo pliega / despliega)
  if (e.button === 0 && t.closest && t.closest(".fbtn, .ginfo, .gtog")) return;
  if (e.button === 1) {
    const mw = t.closest(".pxwrap"),
      mn = mw && get(mw.closest(".node").dataset.id);
    if (mn && sel.size === 1 && sel.has(mn.id) && !organizing()) {
      e.preventDefault();
      const st = PX.get(mn.id);
      drag = { type: "pxshift", n: mn, st, base: st.buf.slice(), bm: st.mask ? st.mask.slice() : null, sx: e.clientX, sy: e.clientY, dx: 0, dy: 0, moved: false };
      return;
    }
  }
  if (e.button === 2) {
    rcMarqAt = -1e9;
    const pwr = t.closest(".pxwrap"),
      chR = t.closest(".ch");
    if (chR) {
      // clic derecho en una bolita: arrastra una flecha de puntos; al soltar, menú para elegir el nodo que se crea ahí
      drag = { type: "rlink", id: chR.closest(".node").dataset.id, side: chR.dataset.s, rc: true };
      $("#tmp").classList.add("dots");
      $("#tmp").setAttribute("d", "");
    } else if (pwr && !organizing()) {
      const n = get(pwr.closest(".node").dataset.id);
      if (!sel.has(n.id) || sel.size > 1) setSel([n.id]);
      pxDown(n, e);
    } else if (!t.closest(".node, " + EDGE_SEL)) {
      // clic derecho + arrastrar sobre el fondo = recuadro de selección múltiple (sin arrastrar: menú contextual)
      const r = canvas.getBoundingClientRect();
      drag = {
        type: "marq",
        rc: true,
        x0: e.clientX,
        y0: e.clientY,
        sx: e.clientX - r.left,
        sy: e.clientY - r.top,
        base: new Set(e.ctrlKey || e.metaKey || e.shiftKey ? sel : []),
      };
    }
    return;
  }
  if (
    ae &&
    ae !== document.body &&
    !ae.contains(t) &&
    (ae.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName))
  )
    ae.blur();
  if (t.closest(".lk")) return;
  if (cropper && !t.closest(".cropper")) endCrop(true);
  const crp = t.closest(".chd, .cbox");
  if (crp && cropper) {
    cropDown(e, crp);
    return;
  }
  if (t.closest(".ptools, .pfoot, .pbgb, .ptile, .pgrid")) return;

  const ch = t.closest(".ch");
  if (ch) {
    drag = {
      type: "link",
      id: ch.closest(".node").dataset.id,
      side: ch.dataset.s,
    };
    return;
  }

  const rh = t.closest(".rh");
  if (rh) {
    const n = get(rh.closest(".node").dataset.id);
    drag = {
      type: "resize",
      n,
      c: rh.dataset.c,
      sx: e.clientX,
      sy: e.clientY,
      r0: { x: n.x, y: n.y, w: n.w, h: n.h },
    };
    return;
  }

  const pw = t.closest(".pxwrap");
  // Shift suele significar lazo/copiar color; con la varita sobre un pixel art ya seleccionado suma regiones
  const wandAdd =
    e.shiftKey && px.tool === "wand" && pw && sel.size === 1 && sel.has(pw.closest(".node").dataset.id);
  if (pw && (!e.shiftKey || wandAdd) && !organizing()) {
    const n = get(pw.closest(".node").dataset.id);
    if (!sel.has(n.id) || sel.size > 1) {
      setSel([n.id]);
      // el primer clic (izquierdo o central) solo activa el nodo: no pinta ni desplaza
      if (e.button !== 2) return;
    }
    pxDown(n, e);
    return;
  }

  const nodeEl = t.closest(".node");
  if (nodeEl) {
    if (t.isContentEditable) return;
    const id = nodeEl.dataset.id;
    // clic directo en el candado: libera el nodo del grupo
    if (t.closest(".glock") && e.button === 0) {
      const n = get(id),
        list = lockTargets(n, null);
      if (list.length) releaseLocked(list);
      return;
    }
    // paleta ya activa: arrastrar un chip lo reordena
    const chd = t.closest(".chip");
    if (chd && e.button === 0 && !e.shiftKey && !e.ctrlKey && !e.metaKey && sel.size === 1 && sel.has(id) && get(id).type === "palette" && !organizing()) {
      drag = { type: "chipdrag", n: get(id), i: +chd.dataset.i, el: chd, sx: e.clientX, sy: e.clientY, moved: false, to: null };
      return;
    }
    if (e.shiftKey && sel.size && !sel.has(id)) {
      const chp = t.closest(".chip");
      pickColorFrom(id, chp ? +chp.dataset.i : undefined);
      return;
    } // pipeta directa
    if (e.ctrlKey || e.metaKey) {
      const s = new Set(sel);
      s.has(id) ? s.delete(id) : s.add(id);
      setSel([...s]);
    } else if (!sel.has(id)) setSel([id]);
    else {
      selEdge = null;
      renderEdges();
    }
    if (t.closest(".tg, .st, .sdot, .sdel, .sadd, .stx, .pview, .psort, .padd, .pdel, .prand, .cx, .fbtn")) return;
    const starts = new Map();
    const mv = branchIds([...sel]);
    mv.forEach((i) => {
      const n = get(i);
      if (isLocked(n) && !mv.has(n.grp)) return; // bloqueado en un grupo: solo se mueve con su cuadro
      starts.set(i, { x: n.x, y: n.y });
    });
    drag = {
      type: "move",
      sx: e.clientX,
      sy: e.clientY,
      starts,
      pid: id,
      moved: false,
    };
    if (e.button === 0 && !e.shiftKey && !e.ctrlKey && !e.metaKey && lockTargets(get(id), drag).length && (isLocked(get(id)) || sel.size > 1)) lockStart(drag, get(id));
    return;
  }

  const hit = t.closest(EDGE_SEL);
  if (hit) {
    // Al seleccionar se regenera el SVG de las conexiones y el navegador pierde el evento "dblclick":
    // el doble clic se detecta aquí, con el tiempo entre dos pulsaciones.
    const id = hit.getAttribute("data-e"),
      now = performance.now();
    const dbl = lastEdgeClick.id === id && now - lastEdgeClick.t < 450;
    lastEdgeClick = dbl ? {} : { id, t: now };
    setSel([], id);
    if (dbl) editEdgeLabel(id);
    return;
  }

  setSel([]);
  drag = {
    type: "pan",
    sx: e.clientX,
    sy: e.clientY,
    vx: board.view.x,
    vy: board.view.y,
  };
  canvas.classList.add("panning");
});

window.addEventListener("pointermove", (e) => {
  if (canvas.contains(e.target)) mouse = toWorld(e.clientX, e.clientY);
  if (!drag) return;
  const v = board.view;
  if (drag.type === "px") {
    pxMove(e);
    return;
  }
  if (drag.type === "crop") {
    cropMove(e);
    return;
  }
  if (drag.type === "pxshift") {
    const r = drag.st.cv.getBoundingClientRect(),
      dx = Math.round(((e.clientX - drag.sx) / r.width) * drag.n.pw),
      dy = Math.round(((e.clientY - drag.sy) / r.height) * drag.n.ph);
    if (dx !== drag.dx || dy !== drag.dy) {
      drag.dx = dx;
      drag.dy = dy;
      drag.moved = true;
      pxShiftApply(drag, dx, dy);
    }
    return;
  }
  if (drag.type === "chipdrag") {
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5) return;
    drag.moved = true;
    drag.el.classList.add("dragging");
    const box = drag.el.parentElement;
    box.querySelectorAll(".drop").forEach((c) => c.classList.remove("drop"));
    const o = document.elementFromPoint(e.clientX, e.clientY),
      oc = o && o.closest(".chip");
    drag.to = oc && oc.parentElement === box ? +oc.dataset.i : null;
    if (oc && drag.to !== drag.i && drag.to !== null) oc.classList.add("drop");
    return;
  }
  if (drag.type === "pan") {
    v.x = drag.vx + (e.clientX - drag.sx);
    v.y = drag.vy + (e.clientY - drag.sy);
    applyView();
  } else if (drag.type === "move") {
    const dx = (e.clientX - drag.sx) / v.k,
      dy = (e.clientY - drag.sy) / v.k;
    if (!drag.moved && Math.hypot(dx, dy) * v.k < 3) return;
    drag.moved = true;
    lockCancel(drag);
    drag.starts.forEach((s, id) => {
      const n = get(id);
      n.x = snap(s.x + dx);
      n.y = snap(s.y + dy);
      applyNode(n);
    });
    renderEdges();
    dwellCheck(drag);
  } else if (drag.type === "resize") {
    const n = drag.n,
      r0 = drag.r0,
      c = drag.c;
    const dx = (e.clientX - drag.sx) / v.k,
      dy = (e.clientY - drag.sy) / v.k;
    let L = r0.x,
      R = r0.x + r0.w,
      T = r0.y,
      B = r0.y + r0.h;
    if (c.includes("w")) L = snap(L + dx);
    if (c.includes("e")) R = snap(R + dx);
    if (c.includes("n")) T = snap(T + dy);
    if (c.includes("s")) B = snap(B + dy);
    if (n.type === "image" || n.type === "pixel") {
      // mantiene la proporción
      const hdr = n.type === "pixel" ? PXH + PXF : 0,
        ratio = r0.w / (r0.h - hdr),
        minWVal = n.type === "pixel" ? PXMINW : MINW,
        w = Math.max(minWVal, R - L),
        h = hdr + w / ratio;
      if (c.includes("w")) L = R - w;
      else R = L + w;
      if (c.includes("n")) T = B - h;
      else B = T + h;
      n.x = L;
      n.y = T;
      n.w = w;
      n.h = Math.round(h * 100) / 100;
    } else {
      // Si es una tarjeta de paleta, calculamos su ancho mínimo dinámico según sus colores
      let currentMinW = MINW;
      // con altura automática un ancho minúsculo daría una tarjeta altísima
      if (n.type === "comment" || n.type === "task") currentMinW = 140;
      else if (n.type === "text") currentMinW = 80;
      else if (n.type === "bubble") currentMinW = bubbleFit(n, r0.w).w; // palabra más larga sin partir
      if (n.type === "palette") currentMinW = palMins(n).w; // mínimo según la vista de chips

      if (R - L < currentMinW) {
        c.includes("w") ? (L = R - currentMinW) : (R = L + currentMinW);
      }
      // cuadros de texto: se pueden estirar también en vertical (para usarlos como grupo), pero nunca por debajo del texto
      const autoh = autoH(n) && n.type !== "text";
      if (autoh) {
        T = r0.y; // la altura la decide el texto: solo se controla el ancho
        B = r0.y + r0.h;
      }
      // alto mínimo: en paletas depende de la vista y del ancho resultante (los chips no deben colapsar)
      const minHVal = n.type === "palette" ? palMins(n, R - L).h : n.type === "text" ? textMinH(n, R - L) : n.type === "bubble" ? bubbleFit(n, R - L).h : MINH;
      if (!autoh && B - T < minHVal) {
        c.includes("n") ? (T = B - minHVal) : (B = T + minHVal);
      }
      n.x = L;
      n.y = T;
      n.w = R - L;
      if (!autoh) n.h = B - T;
      // altura mínima propia del cuadro de texto: solo si se ha arrastrado en vertical (si no, sigue la del texto)
      if (n.type === "text" && Math.abs(dy) >= 1) n.uh = B - T;
    }
    applyNode(n);
    if (n.type === "palette") renderPalette(n);
    renderEdges();
  } else if (drag.type === "link" || drag.type === "rlink") {
    const a = get(drag.id),
      p = sideP(a, drag.side),
      q = toWorld(e.clientX, e.clientY);
    $("#tmp").setAttribute("d", rounded(route(p, q)));
  } else if (drag.type === "marq") {
    if (drag.rc && !drag.moved) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 5) return; // umbral: sigue siendo un clic derecho
      drag.moved = true;
    }
    const r = canvas.getBoundingClientRect(),
      cx = e.clientX - r.left,
      cy = e.clientY - r.top,
      m = $("#marq");
    const x = Math.min(cx, drag.sx),
      y = Math.min(cy, drag.sy),
      w = Math.abs(cx - drag.sx),
      h = Math.abs(cy - drag.sy);
    Object.assign(m.style, {
      display: "block",
      left: x + "px",
      top: y + "px",
      width: w + "px",
      height: h + "px",
    });
    const a = toWorld(x + r.left, y + r.top),
      b = toWorld(x + w + r.left, y + h + r.top);
    const ids = visNodes()
      .filter(
        (n) =>
          n.x < b.x && n.x + n.w > a.x && n.y < b.y && n.y + nh(n) > a.y,
      )
      .map((n) => n.id);
    setSel([...drag.base, ...ids]);
  }
});
window.addEventListener("pointerup", (e) => {
  if (!drag) return;
  const d = drag;
  drag = null;
  lockCancel(d);
  canvas.classList.remove("panning");
  justMoved = !!d.moved;
  if (d.type === "px") {
    drag = d;
    pxUp();
    drag = null;
    return;
  }
  if (d.type === "crop") return;
  if (d.type === "chipdrag") {
    d.el.classList.remove("dragging");
    if (d.moved && d.to !== null && d.to !== d.i) palMove(d.n, d.i, d.to);
    else if (d.moved) renderPalette(d.n);
    return;
  }
  if (d.type === "pxshift") {
    if (d.moved && (d.dx || d.dy)) pxCommit(d.n);
    return;
  }
  if (d.type === "pan") scheduleSave();
  else if (d.type === "move" && d.moved) {
    clearDwell(d);
    releaseOutside(d);
    commit();
  }
  else if (d.type === "resize") {
    if (d.n.type === "text") releaseResized(d.n);
    commit();
  }
  else if (d.type === "marq") {
    $("#marq").style.display = "none";
    if (d.rc && d.moved) rcMarqAt = performance.now(); // el menú contextual de Windows llega tras soltar: se suprime
    else if (d.rc && d.ctx)
      d.ctx.t.dispatchEvent(
        new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: d.ctx.x, clientY: d.ctx.y, button: 2 }),
      );
  }
  else if (d.type === "rlink") {
    rcMarqAt = performance.now(); // el menú contextual del sistema llega tras soltar: se suprime
    linkMenu(d.id, d.side, e);
  }
  else if (d.type === "link") {
    $("#tmp").setAttribute("d", "");
    const el = document.elementFromPoint(e.clientX, e.clientY),
      tn = el && el.closest(".node");
    if (tn && tn.dataset.id !== d.id && !linkOK(get(d.id), get(tn.dataset.id))) {
      toast("Un cuadro de texto no puede conectarse con los nodos que tiene dentro");
    } else if (tn && tn.dataset.id !== d.id) {
      const to = tn.dataset.id;
      if (
        !board.edges.some(
          (x) =>
            (x.from === d.id && x.to === to) ||
            (x.from === to && x.to === d.id),
        )
      ) {
        board.edges.push({ id: uid(), from: d.id, to });
        renderEdges();
        commit();
      } else toast("Esos nodos ya están conectados");
    }
  }
});
canvas.addEventListener("click", (e) => {
  const tp = e.target.closest(".ptip button");
  if (tp) {
    px.tip = px.tip === "circle" ? "square" : "circle"; // un solo botón: alterna entre punta circular y cuadrada
    pxSyncAll();
    return;
  }
  if (e.target.closest(".pgrid")) {
    setPxGrid(!px.grid);
    return;
  }
  const pvb = e.target.closest(".pview, .psort, .padd, .pdel, .prand, .cx");
  if (pvb) {
    const pn = get(pvb.closest(".node").dataset.id);
    if (pvb.classList.contains("pview")) {
      palSetView(pn, PVIEWS[(PVIEWS.indexOf(pn.view || "grid") + 1) % PVIEWS.length]);
    } else if (pvb.classList.contains("psort")) palSortMenu(pn, pvb);
    else if (pvb.classList.contains("prand")) palRand(pn);
    else if (pvb.classList.contains("pdel")) palDel(pn, pn.colors.length - 1);
    else if (pvb.classList.contains("padd")) palAdd(pn);
    else palDel(pn, +pvb.closest(".chip").dataset.i);
    return;
  }
  const tlb = e.target.closest(".ptile");
  if (tlb) {
    pxTile(get(tlb.closest(".node").dataset.id), !get(tlb.closest(".node").dataset.id).tile);
    return;
  }
  const bgb = e.target.closest(".pbgb");
  if (bgb) {
    const n = get(bgb.closest(".node").dataset.id);
    n.ghost = !n.ghost;
    applyNode(n);
    commit();
    return;
  }
  const pt = e.target.closest(".ptools button");
  if (pt) {
    px.tool = pt.dataset.tool;
    updatePxInsp();
    return;
  }
  const sdot = e.target.closest(".sdot"),
    sdel = e.target.closest(".sdel"),
    sadd = e.target.closest(".sadd");
  if (sdot || sdel || sadd) {
    const n = get(e.target.closest(".node").dataset.id),
      row = e.target.closest(".sub");
    if (sdot) cycleSub(n, row.dataset.sid);
    else if (sdel) removeSub(n, row.dataset.sid);
    else addSub(n);
    return;
  }
  const stb = e.target.closest(".st");
  if (stb) {
    if (stb.classList.contains("ro")) return;
    const n = get(stb.closest(".node").dataset.id),
      i = TASK_ORDER.indexOf(n.status || "todo");
    setTaskStatus(n, TASK_ORDER[(i + 1) % TASK_ORDER.length]);
    return;
  }
  const lk = e.target.closest(".lk");
  if (lk) {
    const u = lk.closest(".node").dataset.url;
    if (u) openUrl(u);
    return;
  }
  const tg = e.target.closest(".tg");
  if (tg) {
    const n = get(tg.closest(".node").dataset.id);
    if (!n.collapsed) {
      n.fw = n.w; // se recuerda el ancho para recuperarlo al desplegar
      n.collapsed = true;
    } else {
      n.collapsed = false;
      if (n.fw) {
        n.w = n.fw;
        delete n.fw;
      }
    }
    applyNode(n);
    const tel = els.get(n.id);
    if (n.collapsed) n.w = tel.offsetWidth;
    else n.h = tel.offsetHeight;
    renderEdges();
    commit();
    return;
  }
  const chip = e.target.closest(".chip");
  if (chip && !justMoved) {
    const n = get(chip.closest(".node").dataset.id),
      now = performance.now();
    // doble clic en un chip = guardar el color en la barra (los chips se regeneran al clicar, así que no llega "dblclick")
    if (lastChipClick.id === n.id && lastChipClick.i === +chip.dataset.i && now - lastChipClick.t < 400) {
      lastChipClick = {};
      addCustom(n.colors[+chip.dataset.i]);
      toast("Color añadido a la barra");
      return;
    }
    lastChipClick = { id: n.id, i: +chip.dataset.i, t: now };
    n.selChip = +chip.dataset.i;
    renderPalette(n);
    setActiveColor(n.colors[n.selChip]);
    copyText(n.colors[n.selChip]);
    toast(`Color activo ${n.colors[n.selChip].toUpperCase()} (copiado)`);
    updateInspector();
  }
});
canvas.addEventListener("input", (e) => {
  if (e.target.closest && e.target.closest(".pfoot")) {
    px.size = +e.target.value;
    pxSyncAll();
  }
});
canvas.addEventListener("dblclick", (e) => {
  if (e.target.closest(".chip") && !e.target.closest(".cx")) return; // el doble clic en un chip se detecta en "click"
  if (organizing()) {
    const nd = e.target.closest(".node"), nn = nd && get(nd.dataset.id);
    if (nn && nn.type === "image") return; // sin vista completa mientras se organiza
  }
  if (
    e.target.closest(
      ".rh,.ch,.tg,.st,.lk,.chip,.pxwrap,.ptools,.pfoot,.pbgb,.ptile,.pgrid,.pview,.psort,.padd,.pdel,.prand,.cx,.fbtn,.ginfo,.gtog,.cropper,.sdot,.sdel,.sadd",
    )
  )
    return;
  if (dblLink(e)) return; // doble clic sobre un enlace pegado: reeditar su sobrenombre
  const stx = e.target.closest(".stx");
  if (stx) {
    const sn = get(stx.closest(".node").dataset.id);
    editSub(sn, stx.closest(".sub").dataset.sid);
    return;
  }
  // el DOM de las conexiones se regenera al seleccionar: se localiza por posición, no por e.target
  let top = null;
  for (const x of document.elementsFromPoint(e.clientX, e.clientY)) {
    if (x.classList && x.classList.contains("node")) {
      top = { node: x };
      break;
    }
    if (x.matches && x.matches(EDGE_SEL)) {
      top = { edge: x };
      break;
    }
  }
  if (top && top.edge) {
    editEdgeLabel(top.edge.getAttribute("data-e"));
    return;
  }
  const nodeEl = top && top.node;
  if (nodeEl) {
    const n = get(nodeEl.dataset.id);
    if (n.type === "image") openLightbox(board.images[n.img]);
    else startEdit(n, e.target.closest(".chead") ? "title" : "content");
  } else {
    const p = toWorld(e.clientX, e.clientY);
    addNode("bubble", p.x, p.y);
  }
});

/* vista previa del borde de la punta: sigue al puntero sobre la cuadrícula del pixel art activo */
canvas.addEventListener("pointermove", (e) => {
  if (e.pointerType === "touch") return;
  const w = e.target.closest && e.target.closest(".pxwrap");
  if (!w || (drag && drag.type !== "px")) {
    if (pxHover) {
      pxHover = null;
      pxCursor();
    }
    return;
  }
  const n = get(w.closest(".node").dataset.id),
    p = pxPos(n, e);
  if (!pxHover || pxHover.id !== n.id || pxHover.x !== p.x || pxHover.y !== p.y) {
    pxHover = { id: n.id, x: p.x, y: p.y };
    pxCursor();
  }
});
canvas.addEventListener("pointerleave", () => {
  pxHover = null;
  pxCursor();
});

// el botón central sobre el lienzo de pixel art no debe activar el autoscroll del navegador
canvas.addEventListener("mousedown", (e) => {
  if (e.button === 1 && e.target.closest && e.target.closest(".pxwrap")) e.preventDefault();
});
// los botones del nodo de pixel art no toman el foco del teclado: así no queda un aro de foco en la herramienta
// pulsada con el ratón cuando luego se cambia de herramienta con un atajo
canvas.addEventListener("mousedown", (e) => {
  if (e.target.closest && e.target.closest(".ptools button, .ptip button, .ptile, .pbgb, .pgrid, .pview, .padd, .pdel, .prand, .fbtn")) e.preventDefault();
});
