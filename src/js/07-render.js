"use strict";
/* =====================  Render de nodos  ===================== */
const nodeRO = new ResizeObserver((entries) => {
  let ch = false;
  for (const en of entries) {
    const el = en.target,
      n = get(el.dataset.id);
    if (!n) continue;
    const w = el.offsetWidth,
      h = el.offsetHeight;
    if ((n.collapsed && (n.type === "comment" || n.type === "task")) || (n.gcol && n.type === "text" && isGroupBox(n))) {
      if (n.gcol && Math.abs(n.h - h) > 0.5) {
        n.h = h;
        ch = true;
      }
      if (Math.abs(n.w - w) > 0.5) {
        if (n.gcol && !n.fw) n.fw = n.w; // grupo contraído sin ancho guardado (tablero antiguo): se recuerda el de antes
        n.w = w;
        ch = true;
      }
    } else if (autoH(n) && Math.abs(n.h - h) > 0.5) {
      n.h = h;
      ch = true;
    }
  }
  if (ch) {
    renderEdges();
    queuePos();
    scheduleSave();
  }
});
// altura mínima que necesita el texto de un cuadro de texto con ese ancho (para no dejar que se redimensione sobre él)
function textMinH(n, w) {
  const el = els.get(n.id);
  if (!el) return MINH;
  const sw = el.style.width, sm = el.style.minHeight, sh = el.style.height;
  el.style.width = w + "px";
  el.style.minHeight = "0";
  el.style.height = "auto";
  const h = el.offsetHeight;
  el.style.width = sw;
  el.style.minHeight = sm;
  el.style.height = sh;
  return Math.max(MINH, h);
}
/* Globo: tamaño mínimo que necesita su texto. Se mide dejando que el nodo tome el tamaño del contenido (ancho dado → alto
   necesario; ancho «min-content» → palabra más larga sin partir). Solo mide: no cambia el modelo. */
function bubbleFit(n, w) {
  const el = els.get(n.id);
  if (!el) return { w: MINW, h: MINH };
  const sw = el.style.width, sh = el.style.height;
  const c = el.querySelector(".content"),
    ow = c.style.overflowWrap,
    wb = c.style.wordBreak;
  c.style.overflowWrap = "normal"; // la palabra más larga sin partir (hasta un tope: más allá se parte en letras)
  c.style.wordBreak = "normal";
  el.style.height = "auto";
  el.style.width = "min-content";
  const minW = clamp(Math.ceil(el.offsetWidth), MINW, 360);
  c.style.overflowWrap = ow;
  c.style.wordBreak = wb;
  el.style.width = Math.max(w || n.w, minW) + "px";
  const h = Math.max(MINH, Math.ceil(el.offsetHeight));
  el.style.width = sw;
  el.style.height = sh;
  return { w: minW, h };
}
function mkNode(n) {
  const el = document.createElement("div");
  el.className = "node " + n.type + (n.type === "task" ? " comment" : "");
  el.dataset.id = n.id;
  let h = "";
  if (n.type === "comment" || n.type === "task")
    h += `<div class="chead"><button class="tg" title="Plegar / desplegar">▾</button>${n.type === "task" ? '<button class="st"><svg viewBox="0 0 24 24"></svg></button>' : ""}<span class="ttl"></span></div><div class="content"></div>${n.type === "task" ? '<div class="subs"></div>' : ""}`;
  else if (n.type === "palette")
    h += `<div class="chead"><span class="ttl"></span><span class="psep"></span><button class="pview"><svg viewBox="0 0 24 24"></svg></button><button class="psort" title="Ordenar colores"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button><button class="prand" title="Paleta aleatoria"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.3"/><circle cx="15" cy="15" r="1.3"/><circle cx="15" cy="9" r="1.3"/><circle cx="9" cy="15" r="1.3"/></svg></button><button class="pdel" title="Eliminar el último color"><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button><button class="padd" title="Añadir color"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button></div><div class="chips"></div>`;
  else if (n.type === "pixel")
    h += `<div class="chead phd"><div class="prow1"><span class="ttl"></span><span class="pinfo"></span><button class="pbgb" title="Fondo sólido"><i></i></button><button class="pgrid" title="Mostrar / ocultar la cuadrícula"><svg viewBox="0 0 56 56"><path d="M 7.2109 38.1836 L 17.5703 38.1836 L 17.5703 48.3555 C 17.5703 49.5039 18.2500 50.2070 19.3515 50.2070 C 20.4296 50.2070 21.1093 49.5039 21.1093 48.3555 L 21.1093 38.1836 L 34.7500 38.1836 L 34.7500 48.3555 C 34.7500 49.5039 35.4296 50.2070 36.5312 50.2070 C 37.6093 50.2070 38.2890 49.5039 38.2890 48.3555 L 38.2890 38.1836 L 48.8123 38.1836 C 49.9609 38.1836 50.6641 37.5039 50.6641 36.4023 C 50.6641 35.3008 49.9609 34.6445 48.8123 34.6445 L 38.2890 34.6445 L 38.2890 21.4492 L 48.8123 21.4492 C 49.9609 21.4492 50.6641 20.7695 50.6641 19.6914 C 50.6641 18.5898 49.9609 17.9101 48.8123 17.9101 L 38.2890 17.9101 L 38.2890 7.6679 C 38.2890 6.5195 37.6093 5.7930 36.5312 5.7930 C 35.4296 5.7930 34.7500 6.5195 34.7500 7.6679 L 34.7500 17.9101 L 21.1093 17.9101 L 21.1093 7.6679 C 21.1093 6.5195 20.4296 5.7930 19.3515 5.7930 C 18.2500 5.7930 17.5703 6.5195 17.5703 7.6679 L 17.5703 17.9101 L 7.2109 17.9101 C 6.0390 17.9101 5.3359 18.5898 5.3359 19.6914 C 5.3359 20.7695 6.0390 21.4492 7.2109 21.4492 L 17.5703 21.4492 L 17.5703 34.6445 L 7.2109 34.6445 C 6.0390 34.6445 5.3359 35.3008 5.3359 36.4023 C 5.3359 37.5039 6.0390 38.1836 7.2109 38.1836 Z M 21.1093 34.6445 L 21.1093 21.4492 L 34.7500 21.4492 L 34.7500 34.6445 Z"/></svg></button><button class="ptile" title="Modo tile"><svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"/></svg></button></div><div class="ptools">${ptoolsHtml()}</div></div><div class="pxwrap"><div class="pxbg"></div><canvas class="pxtile"></canvas><canvas class="pxc"></canvas><div class="pxgrid"></div><canvas class="pxov"></canvas><div class="pxedge"></div></div><div class="pfoot"><span class="psl"><span>Tamaño</span><input type="range" min="1" max="10" value="1"><b>1</b><span class="ptip"><button class="ptipb" data-tip="circle" title="Punta circular — clic para cambiar a cuadrada"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg></button></span></span></div>`;
  else if (n.type === "image")
    h += `<div class="imgbox"><img alt=""></div>`;
  else h += `<div class="content"></div>`;
  h += ["nw", "ne", "sw", "se"]
    .map((c) => `<i class="rh ${c}" data-c="${c}"></i>`)
    .join("");
  h += ["t", "r", "b", "l"]
    .map((s) => `<i class="ch ${s}" data-s="${s}"></i>`)
    .join("");
 h += `<button class="lk" title="Abrir enlace">↗</button>`;
  el.innerHTML = h;
  world.appendChild(el);
  els.set(n.id, el);
  const c = el.querySelector(".content");
  if (c) c.innerHTML = n.html || "";
  if (n.type === "comment")
    el.querySelector(".ttl").textContent = n.title || "Comentario";
  if (n.type === "task")
    el.querySelector(".ttl").textContent = n.title || "Tarea";
  if (n.type === "image")
    el.querySelector("img").src = board.images[n.img] || "";
  if (n.type === "palette") renderPalette(n);
  if (n.type === "pixel") {
    el.querySelector(".ttl").textContent = n.title || "Pixel art";
    pxSetup(n);
  }
  if (n.type === "task") renderSubs(n);
  applyNode(n);
  refreshLink(n);
  if (n.type === "comment" || n.type === "task" || n.type === "text") nodeRO.observe(el);
}
function applyNode(n) {
  const el = els.get(n.id);
  if (!el) return;
  if (n.gcol && !isGroupBox(n)) {
    // dejó de ser grupo (se liberaron todos sus nodos): ya no se puede contraer; recupera su ancho
    delete n.gcol;
    if (n.fw) {
      n.w = n.fw;
      delete n.fw;
    }
  }
  el.style.left = n.x + "px";
  el.style.top = n.y + "px";
  // plegado: el ancho se ajusta al título; desplegado: altura automática según el texto
  el.style.width =
    (n.collapsed && (n.type === "comment" || n.type === "task")) || (n.gcol && n.type === "text" && isGroupBox(n)) ? "max-content" : n.w + "px";
  el.style.height = autoH(n) ? "auto" : nh(n) + "px";
  el.classList.toggle("autoh", autoH(n));
  if (COLORABLE.includes(n.type)) {
    el.style.setProperty(
      "--nbg",
      n.color === "auto" ? "var(--card)" : n.color === "outline" ? "transparent" : n.color,
    );
    el.style.setProperty("--nfg", fg(n.color));
    adaptNode(n);
    if (n.type === "text" && /^#/.test(n.color)) queueAdapt();
    // cuadro de texto en modo «borde»: sin relleno y con borde del color elegido
    const ol = n.type === "text" && n.color === "outline";
    el.classList.toggle("outl", ol);
    if (ol) el.style.setProperty("--nbc", n.bc || "var(--foreground)");
    else el.style.removeProperty("--nbc");
    // cuadro de texto: altura mínima elegida por el usuario (nunca baja del texto: la altura sigue siendo automática)
    if (n.type === "text") el.style.minHeight = n.uh && !(n.gcol && isGroupBox(n)) ? n.uh + "px" : ""; // grupo contraído: solo la cabecera
    const c = el.querySelector(".content");
    c.style.fontFamily = FONTS[n.font] || FONTS.Inter;
    c.style.fontSize = (n.fs || DEFFS[n.type]) + "px";
    c.style.fontWeight = n.b ? "700" : "";
    c.style.fontStyle = n.i ? "italic" : "";
    c.style.textDecoration = n.u ? "underline" : "";
  }
  if (n.type === "pixel") {
    // fondo del nodo: sólido (--card) o translúcido al 40 % para calcar sobre otros elementos
    el.classList.toggle("ghost", !!n.ghost);
    el.classList.toggle("tile", !!n.tile);
    const tb = el.querySelector(".ptile");
    if (tb) {
      tb.classList.toggle("on", !!n.tile);
      tb.title = n.tile ? "Modo tile activado — clic para desactivar" : "Modo tile — muestra 8 píxeles repetidos alrededor";
    }
    pxTileRender(n);
    const gb = el.querySelector(".pbgb");
    if (gb) {
      gb.classList.toggle("on", !n.ghost);
      gb.title = n.ghost ? "Fondo translúcido (calcar) — clic para fondo sólido" : "Fondo sólido — clic para fondo translúcido (calcar)";
    }
  }
  if (n.type === "image") {
    const im = el.querySelector("img"),
      c = n.crop;
    if (c) {
      im.style.width = 100 / c.w + "%";
      im.style.height = 100 / c.h + "%";
      im.style.left = (-c.x / c.w) * 100 + "%";
      im.style.top = (-c.y / c.h) * 100 + "%";
    } else {
      im.style.width = "100%";
      im.style.height = "100%";
      im.style.left = "0";
      im.style.top = "0";
    }
  }
  if (n.type === "task") {
    // con subtareas el check principal es solo un indicador del % completado
    const p = syncTaskFromSubs(n),
      k = TASK_ST[n.status] ? n.status : "todo",
      b = el.querySelector(".st");
    el.dataset.st = k;
    b.classList.toggle("ro", !!p);
    b.title = p
      ? `${p.done}/${p.tot} · ${p.pct} %`
      : `${TASK_ST[k].label} — clic para cambiar el estado`;
    b.firstElementChild.innerHTML = p ? progressIcon(p.pct) : TASK_ST[k].icon;
    el.classList.toggle("hassubs", !!p);
  }
  el.classList.toggle("collapsed", !!n.collapsed);
  el.classList.toggle("sel", sel.has(n.id));
  // candado: nodo bloqueado en un grupo (arriba a la izquierda)
  let lk = el.querySelector(":scope > .glock");
  if (n.grp && get(n.grp)) {
    if (!lk) {
      lk = document.createElement("span");
      lk.className = "glock";
      lk.title = "Bloqueado en un grupo: clic en el candado (o mantén pulsado el nodo) para liberarlo; se mueve con su cuadro de texto";
      lk.innerHTML = GLOCK_SVG;
      el.appendChild(lk);
    }
  } else if (lk) lk.remove();
  // cuadro de texto con grupo: una sola línea (nombre) y botón (i) con la ayuda de los grupos, arriba a la derecha
  const isBox = isGroupBox(n),
    showInfo = isBox || (n.type === "text" && !!n.back); // un cuadro enviado atrás también muestra (i): así se descubre lo de los grupos
  el.classList.toggle("gbox", isBox);
  el.classList.toggle("hasinfo", showInfo);
  el.classList.toggle("gcol", isBox && !!n.gcol);
  let gi = el.querySelector(":scope > .ginfo");
  if (showInfo && !gi) {
    gi = document.createElement("button");
    gi.type = "button";
    gi.className = "xbtn ginfo";
    gi.tabIndex = -1;
    gi.setAttribute("aria-label", "Ayuda de los grupos");
    gi.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 11v6"/><path d="M12 7.2v.1"/></svg>';
    el.appendChild(gi);
    hoverTip(gi, $("#grpTip"));
  } else if (!showInfo && gi) gi.remove();
  // botón de contraer / expandir el grupo (a la izquierda de la (i))
  let gt = el.querySelector(":scope > .gtog");
  if (isBox && !gt) {
    gt = document.createElement("button");
    gt.type = "button";
    gt.className = "xbtn gtog";
    gt.tabIndex = -1;
    gt.setAttribute("aria-label", "Contraer o expandir el grupo");
    gt.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
    el.appendChild(gt);
  } else if (!isBox && gt) gt.remove();
  if (gt) gt.title = n.gcol ? "Expandir el grupo" : "Contraer el grupo (oculta sus nodos)";
  // grupo contraído: candado con el nº de nodos que lleva dentro
  let gc = el.querySelector(":scope > .gcount");
  if (isBox && n.gcol) {
    if (!gc) {
      gc = document.createElement("span");
      gc.className = "gcount";
      el.appendChild(gc);
    }
    const cnt = groupAll(n.id).size;
    gc.innerHTML = GLOCK_SVG + "<b>" + cnt + "</b>";
    gc.title = cnt === 1 ? "1 nodo en el grupo" : cnt + " nodos en el grupo";
  } else if (gc) gc.remove();
  el.classList.toggle("gmem", !!n.grp && sel.has(n.grp)); // miembro del grupo de un cuadro seleccionado
  el.classList.toggle("back", !!n.back); // enviado al fondo: las flechas se dibujan por encima
  el.classList.toggle("act", pxActive(n)); // pixel art "activo": solo con una única selección
  if (sel.has(n.id)) queuePos();
}
const PVIEWS = ["grid", "strip", "list", "dots"];
const PVN = { grid: "Cuadrícula", strip: "Tira", list: "Lista", dots: "Puntos" };
const PVICON = {
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  strip: '<rect x="3" y="5" width="4" height="14" rx="1"/><rect x="8" y="5" width="4" height="14" rx="1"/><rect x="13" y="5" width="4" height="14" rx="1"/><rect x="18" y="5" width="3" height="14" rx="1"/>',
  list: '<rect x="4" y="5" width="16" height="3.5" rx="1.2"/><rect x="4" y="10.3" width="16" height="3.5" rx="1.2"/><rect x="4" y="15.6" width="16" height="3.5" rx="1.2"/>',
  dots: '<circle cx="7" cy="8" r="2.6"/><circle cx="14" cy="8" r="2.6"/><circle cx="7" cy="15.5" r="2.6"/><circle cx="14" cy="15.5" r="2.6"/><circle cx="19.5" cy="15.5" r="1.6"/>',
};
// tamaño mínimo del nodo según el modo de vista y el nº de colores
function palMins(n, w = n.w) {
  const len = n.colors.length,
    v = n.view || "grid",
    g = len > 24 || w - 20 < 260 ? 2 : 4;
  if (v === "strip") return { w: Math.max(220, Math.min(len * 10, 520)), h: CH + 44 };
  if (v === "list") {
    // columnas de al menos 90 px (cabe el HEX) y filas de 20 px: el alto mínimo depende del ancho
    const mw = Math.max(140, Math.ceil(len / 10) * (90 + g) + 20 - g); // como mucho 10 filas al mínimo
    const cols = Math.max(1, Math.floor((Math.max(w, mw) - 20 + g) / (90 + g))),
      rows = Math.ceil(len / cols);
    return { w: mw, h: CH + 10 + rows * 20 + (rows - 1) * g + 4 };
  }
  if (v === "dots") {
    // los puntos (22 px) nunca deben quedar recortados: alto mínimo según cuántos caben por fila
    const cols = Math.max(1, Math.floor((w - 20 + g) / (22 + g))),
      rows = Math.ceil(len / cols);
    return { w: 160, h: CH + 10 + rows * 22 + (rows - 1) * g + 4 };
  }
  const cols = len <= 8 ? len : clamp(Math.round(Math.sqrt(len * 2.2)), 4, 12),
    rows = Math.ceil(len / cols),
    rowH = len <= 12 ? 90 : 34;
  return { w: Math.max(220, cols * 32), h: Math.max(MINH, CH + 14 + rows * rowH + (rows - 1) * 4) };
}
function renderPalette(n) {
  const el = els.get(n.id);
  if (!el) return;
  el.querySelector(".ttl").textContent = n.title || "Paleta";
  const v = PVIEWS.includes(n.view) ? n.view : "grid",
    len = n.colors.length;
  const vb = el.querySelector(".pview");
  const nx = PVIEWS[(PVIEWS.indexOf(v) + 1) % PVIEWS.length]; // el icono anuncia la vista siguiente
  vb.title = `Cambiar a vista: ${PVN[nx]}`;
  vb.firstElementChild.innerHTML = PVICON[nx];

  // Si la tarjeta es más pequeña que el mínimo del modo, se adapta para que no desborde
  const mn = palMins(n);
  let changed = false;
  if (n.w < mn.w) {
    n.w = mn.w;
    changed = true;
  }
  if (n.h < mn.h) {
    n.h = Math.ceil(mn.h);
    changed = true;
  }
  if (changed) {
    applyNode(n);
    renderEdges();
  }

  const bw = Math.max(40, n.w - 20),
    bh = Math.max(40, n.h - CH - 10);
  const box = el.querySelector(".chips");
  box.className = "chips v-" + v;
  let gap = len > 24 || bw < 260 ? 2 : 4,
    cell = 0, // ancho útil de cada chip (para decidir si caben etiquetas)
    tight = false;
  const st = box.style;
  st.gridTemplateColumns = st.gridTemplateRows = st.gridAutoRows = st.gridAutoFlow = "";
  if (v === "grid") {
    // chips siempre cuadrados: se elige la rejilla que permite el lado mayor
    const fit = (g) => {
      let side = 0,
        cols = 1;
      for (let c = 1; c <= len; c++) {
        const r = Math.ceil(len / c),
          sd = Math.min((bw - g * (c - 1)) / c, (bh - g * (r - 1)) / r);
        if (sd > side) {
          side = sd;
          cols = c;
        }
      }
      return { side: Math.floor(side), cols };
    };
    let f = fit(gap);
    if (f.side < 16) {
      gap = 0; // chips diminutos: sin huecos
      f = fit(0);
    }
    f.side = Math.max(8, f.side);
    tight = gap === 0;
    cell = f.side;
    st.gridTemplateColumns = `repeat(${f.cols},${f.side}px)`;
    st.gridAutoRows = `${f.side}px`;
  } else if (v === "strip") {
    gap = 0;
    cell = bw / len;
    st.gridTemplateColumns = `repeat(${len},1fr)`;
    st.gridAutoRows = "1fr";
  } else if (v === "list") {
    const rowsFit = Math.max(1, Math.floor((bh + gap) / (20 + gap))),
      cols = Math.ceil(len / rowsFit),
      rows = Math.ceil(len / cols);
    cell = 999;
    st.gridAutoFlow = "column";
    st.gridTemplateColumns = `repeat(${cols},1fr)`;
    st.gridTemplateRows = `repeat(${rows},minmax(0,${Math.max(20, Math.min(32, Math.floor((bh - gap * (rows - 1)) / rows)))}px))`;
  } else {
    cell = 0;
    st.gridTemplateColumns = "repeat(auto-fill,22px)";
    st.gridAutoRows = "22px";
  }
  st.gap = gap + "px";
  box.classList.toggle("tight", tight);
  const small = v === "dots" || cell < 56;
  box.innerHTML = n.colors
    .map(
      (c, i) =>
        `<div class="chip${i === n.selChip ? " cs" : ""}${small ? " nolab" : ""}${cell >= 96 ? " lg" : ""}${cell < 30 ? " nocx" : ""}" data-i="${i}" style="background:${c};color:${fg(c)}"><span>${c.toUpperCase()}</span><b class="cx" title="Eliminar color">×</b></div>`,
    )
    .join("");
}
function renderAll() {
  nodeRO.disconnect();
  els.forEach((e) => e.remove());
  els.clear();
  PX.clear();
  board.nodes.forEach(mkNode);
  renderEdges();
  applyView();
  syncSwatches();
  updateInspector();
  applyEdgeW();
  pxTileCleanup();
}
let orgOff = false;
const organizing = () => sel.size > 1 && !orgOff;
function exitOrganize() {
  orgOff = true;
  document.body.classList.remove("organizing");
}
function syncOrganize() {
  const on = organizing();
  document.body.classList.toggle("organizing", on);
  if (!on) return;
  document.querySelectorAll(".bar-dropdown.open").forEach((d) => d.classList.remove("open"));
  $("#helpPanel").classList.remove("open");
  $("#helpBtn").classList.remove("open");
  // la rueda de color se queda abierta durante la selección múltiple (sirve para colorear el grupo)
}
function setSel(ids, edge = null) {
  const prev = sel;
  sel = new Set(ids);
  if (sel.size !== prev.size || [...sel].some((i) => !prev.has(i))) orgOff = false;
  selEdge = edge;
  pxTileCleanup(); // el modo tile se desactiva cuando el nodo pierde el foco
  // al perder el foco la tarjeta de pixel art, su selección de píxeles (varita/lazo/recuadro) se quita
  PX.forEach((st, id) => {
    if (st.mask && !(sel.size === 1 && sel.has(id))) {
      st.mask = null;
      const pn = get(id);
      if (pn) pxOverlay(pn);
    }
  });
  board.nodes.forEach(applyNode);
  renderEdges();
  syncSwatches();
  updateInspector();
  syncOrganize();
}
