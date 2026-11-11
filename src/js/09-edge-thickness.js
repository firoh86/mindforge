"use strict";
/* ===== nexo thickness =====
   Grosor de las flechas (nexos). Ajusta aquí a mano el mínimo y el máximo del slider.
   El máximo es el 60 % del recorrido que tenía antes (1…6): 1 + 0,6 × 5 = 4. El texto de las flechas escala con el grosor. */
const EDGE_W_MIN = 1,
  EDGE_W_MAX = 4,
  EDGE_W_DEFAULT = 2;
function applyEdgeW() {
  const w = clamp(board.edgeW ?? EDGE_W_DEFAULT, EDGE_W_MIN, EDGE_W_MAX),
    px = 14 + (w - 2) * 3; // las puntas crecen con el grosor
  $("#edges").style.setProperty("--ew", w);
  [["#arr", px], ["#arrOn", px + 4], ["#arrL", px], ["#arrD", px]].forEach(([q, v]) => {
    $(q).setAttribute("markerWidth", v);
    $(q).setAttribute("markerHeight", v);
  });
  $("#edgeW").value = w;
}
function renderEdges() {
  treeRefresh();
  if (typeof mmQueue === "function") mmQueue(); // minimapa
  board.nodes.forEach(adaptNode);
  const mb = $("#mainBtn");
  if (mb) {
    mb.classList.toggle("on", !!board.mainOnly);
    mb.title = board.mainOnly ? "Ver todo" : "Ver principal";
  }
  const ab = $("#avoidBtn");
  if (ab) {
    ab.classList.toggle("on", !!board.avoid);
    ab.title = board.avoid ? "Esquivar nodos: activado" : "Esquivar nodos";
  }
  let h = "";
  const LP = new Map(); // conexiones con texto: la flecha se parte en dos alrededor de la etiqueta
  // grupo contraído: las conexiones continuas de fuera hacia un miembro se muestran (solo visualmente) hasta el nodo del grupo,
  // con la misma dirección; las discontinuas (las de comentarios, tareas y cuadros de texto) simplemente se ocultan
  const rep = (n) => {
    if (!HID.has(n.id)) return n;
    const bx = n.grp && get(n.grp);
    return bx && bx.gcol && !HID.has(bx.id) ? bx : null;
  };
  const seen = new Map(),
    stubs = new Map();
  let vn = 0;
  // 1.ª pasada: tramos con bola hacia nodos ocultos (se reparten el lado de anclaje con las demás conexiones: 3 tipos de extremo)
  for (const e of board.edges) {
    const a = get(e.from),
      b = get(e.to);
    if (!a || !b) continue;
    const dashed = DASH_TYPES.includes(a.type) || DASH_TYPES.includes(b.type);
    if (board.mainOnly && dashed) continue;
    const A = rep(a),
      B = rep(b);
    if (!A === !B) continue;
    const V = A || B,
      H = A ? b : a,
      vIsFrom = !!A;
    if (ePar(e) === V.id && V.fold) continue;
    const k = V.id + "|" + (H.grp || H.id) + "|" + vIsFrom,
      prev = stubs.get(k);
    if (!prev) stubs.set(k, { e, V, H, vIsFrom, dashed, sid: "st" + stubs.size });
    else if (!prev.e.label && e.label) prev.e = e;
  }
  const extra = [];
  stubs.forEach((st) => {
    const X = hiderOf(st.H.id);
    st.T = X && X !== st.V ? X : st.H;
    const [sk, hk] = edgeSideKeys(st.V, st.T),
      dir = st.e.dir || "fwd";
    st.sk = sk;
    st.hk = hk;
    st.arrowAtV = dir === "both" || (st.vIsFrom ? dir === "rev" : dir === "fwd");
    extra.push({ id: st.sid, a: st.V, as: sk, arrow: st.arrowAtV, b: st.T, bs: hk });
  });
  const offs = edgeOffsets(extra);
  const emit = (e, A, B, a, b, dashed, virt) => {
    const [sa, sb] = edgeSideKeys(A, B),
      s = sidePoint(A, sa, virt ? 0 : offs.get(e.id + "|s") || 0),
      t = sidePoint(B, sb, virt ? 0 : offs.get(e.id + "|t") || 0),
      pts = route(s, t, { A, B }),
      d = rounded(pts),
      on = !virt && e.id === selEdge,
      lid = virt ? "v" + vn++ : e.id; // las conexiones dibujadas hasta un grupo contraído no son editables
    // color adaptativo: sobre un cuadro de texto enviado al fondo la flecha se invierte (oscura/clara) según su relleno
    const bg = on ? null : bgUnder((s.x + t.x) / 2, (s.y + t.y) / 2, null, true),
      light = bg && inkFor(bg) === INK_L,
      mkId = on ? "arrOn" : bg ? (light ? "arrL" : "arrD") : "arr",
      est = bg ? ` style="stroke:${light ? "#e5e7eb" : "#1f2937"}"` : "";
    const mk = `url(#${mkId})`,
      dir = e.dir || "fwd",
      ms = dir === "rev" || dir === "both" ? ` marker-start="${mk}"` : "",
      me = dir === "fwd" || dir === "both" ? ` marker-end="${mk}"` : "";
    h += virt
      ? `<path class="edge virt${dashed ? " dash" : ""}" data-ed="${lid}" d="${d}"${est}${ms}${me}/>`
      : `<path class="hit" data-e="${e.id}" d="${d}"/><path class="edge${on ? " on" : ""}${dashed ? " dash" : ""}" data-ed="${lid}" d="${d}"${est}${ms}${me}/>`;
    if (e.label) {
      LP.set(lid, { pts, ms, me });
      // el fondo que corta la flecha toma el color del cuadro de texto coloreado (enviado al fondo) que tenga debajo
      const li = pts.li ?? 1,
        lx = (pts[li][0] + pts[li + 1][0]) / 2,
        ly = (pts[li][1] + pts[li + 1][1]) / 2,
        lbx = on ? null : boxUnder(lx, ly, null, true);
      h += `<text class="elab" data-lid="${lid}"${virt ? "" : ` data-e="${e.id}"`}${lbx ? ` data-bg="${lbx.color}" data-bx="${lbx.x},${lbx.y},${lbx.w},${boxH(lbx)}"` : ""} x="${lx}" y="${ly}">${esc(e.label)}</text>`;
    }
  };
  for (const e of board.edges) {
    const a = get(e.from),
      b = get(e.to);
    if (!a || !b) continue;
    const dashed = DASH_TYPES.includes(a.type) || DASH_TYPES.includes(b.type);
    if (board.mainOnly && dashed) continue; // «Ver principal»
    const A = rep(a),
      B = rep(b);
    if (!A && !B) continue;
    if (!A || !B) {
      // conexión con un nodo oculto: ya recogida en la 1.ª pasada (tramo con bola)
      continue;
    }
    if (A === B) continue;
    if (A === a && B === b) {
      emit(e, A, B, a, b, dashed, false);
      continue;
    }
    // conexión real con un miembro oculto: se dibuja hasta el cuadro del grupo (una sola por origen/destino/dirección,
    // con el texto de la primera que lo tenga)
    if (dashed) continue;
    const k = A.id + "|" + B.id + "|" + (e.dir || "fwd"),
      prev = seen.get(k);
    if (!prev) seen.set(k, { e, A, B, a, b });
    else if (!prev.e.label && e.label) prev.e = e;
  }
  seen.forEach((v) => emit(v.e, v.A, v.B, v.a, v.b, false, true));
  stubs.forEach(({ e, V, H, vIsFrom, dashed, sid, T, sk, hk, arrowAtV }) => {
    // el tramo llega casi hasta el nodo que oculta a H (el plegado o el grupo contraído), para mostrar la relación directa;
    // si no se sabe cuál es, apunta hacia donde estaría H
    const s0 = sidePoint(V, sk, offs.get(sid + "|s") || 0),
      t0 = sidePoint(T, hk, offs.get(sid + "|t") || 0),
      P = route(s0, t0),
      seg = [];
    let tot = 0;
    for (let i = 0; i < P.length - 1; i++) {
      seg.push(Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]));
      tot += seg[i];
    }
    const ew = clamp(board.edgeW ?? EDGE_W_DEFAULT, EDGE_W_MIN, EDGE_W_MAX),
      lw = e.label ? e.label.length * (10 + ew * 2) * 0.55 + 24 : 0,
      L = T === H ? Math.min(80 + lw, tot - 12) : tot - (4 + 1.2 * ew); // casi toca al nodo que oculta
    if (L < 24) return;
    // polilínea recortada a longitud L
    const cut = [P[0]];
    let acc = 0;
    for (let i = 0; i < seg.length; i++) {
      if (acc + seg[i] >= L - 0.01) {
        const u = (L - acc) / (seg[i] || 1);
        cut.push([P[i][0] + (P[i + 1][0] - P[i][0]) * u, P[i][1] + (P[i + 1][1] - P[i][1]) * u]);
        break;
      }
      acc += seg[i];
      cut.push(P[i + 1]);
    }
    const end = cut[cut.length - 1],
      lid = "s" + vn++,
      bg = bgUnder((s0.x + end[0]) / 2, (s0.y + end[1]) / 2, null, true),
      light = bg && inkFor(bg) === INK_L,
      mkId = bg ? (light ? "arrL" : "arrD") : "arr",
      est = bg ? ` style="stroke:${light ? "#e5e7eb" : "#1f2937"}"` : "",
      fill = bg ? ` style="fill:${light ? "#e5e7eb" : "#1f2937"}"` : "";
    h += `<path class="edge virt stub${dashed ? " dash" : ""}" data-ed="${lid}" d="${rounded(cut)}"${est}${arrowAtV ? ` marker-start="url(#${mkId})"` : ""}/>`;
    h += `<circle class="ebal" cx="${end[0]}" cy="${end[1]}" r="${3 + ew * 1.2}"${fill}/>`;
    if (e.label) {
      // el texto se mantiene visible en mitad del tramo
      let half = L / 2,
        lx = end[0],
        ly = end[1];
      for (let i = 0; i < cut.length - 1; i++) {
        const sl = Math.hypot(cut[i + 1][0] - cut[i][0], cut[i + 1][1] - cut[i][1]);
        if (half <= sl || i === cut.length - 2) {
          const u = sl ? Math.min(1, half / sl) : 0;
          lx = cut[i][0] + (cut[i + 1][0] - cut[i][0]) * u;
          ly = cut[i][1] + (cut[i + 1][1] - cut[i][1]) * u;
          break;
        }
        half -= sl;
      }
      LP.set(lid, { pts: cut, ms: "", me: "" });
      const lbx = boxUnder(lx, ly, null, true);
      h += `<text class="elab" data-lid="${lid}" data-e="${e.id}"${lbx ? ` data-bg="${lbx.color}" data-bx="${lbx.x},${lbx.y},${lbx.w},${boxH(lbx)}"` : ""} x="${lx}" y="${ly}">${esc(e.label)}</text>`;
    }
  });
  const g = $("#edgeg");
  g.innerHTML = h;
  g.querySelectorAll(".elab").forEach((t) => {
    const b = t.getBBox(),
      id = t.getAttribute("data-lid"),
      r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    r.setAttribute("x", b.x - 6);
    r.setAttribute("y", b.y - 3);
    r.setAttribute("width", b.width + 12);
    r.setAttribute("height", b.height + 6);
    r.setAttribute("rx", 2);
    r.setAttribute("class", "elabbg");
    if (t.hasAttribute("data-e")) r.setAttribute("data-e", t.getAttribute("data-e"));
    r.style.fill = "transparent"; // sigue siendo clicable, pero no tapa nada
    t.parentNode.insertBefore(r, t);
    // el texto se adapta (claro/oscuro) al cuadro de texto coloreado que ocupe la mayor parte de la etiqueta
    if (t.dataset.bg) {
      const [bx, by, bw, bh] = t.dataset.bx.split(",").map(Number),
        ix = Math.min(b.x + b.width + 6, bx + bw) - Math.max(b.x - 6, bx),
        iy = Math.min(b.y + b.height + 3, by + bh) - Math.max(b.y - 3, by);
      if (ix > 0 && iy > 0 && (ix * iy) / ((b.width + 12) * (b.height + 6)) >= 0.5) t.style.fill = inkFor(t.dataset.bg);
    }
    // la etiqueta es como un nodo transparente en mitad de la conexión: una flecha llega hasta ella y otra sale hacia el
    // destino. Se recorta la polilínea por el rectángulo de la etiqueta (solo es dibujo: la jerarquía no cambia)
    const sp = LP.get(id),
      ep = sp && g.querySelector(`path.edge[data-ed="${id}"]`);
    if (!sp || !ep) return;
    const R = { x1: b.x - 8, y1: b.y - 4, x2: b.x + b.width + 8, y2: b.y + b.height + 4 },
      P = sp.pts;
    // intervalo [t0,t1] de cada tramo (horizontal o vertical) que cae dentro de R
    const clip = ([ax, ay], [bx, by]) => {
      let t0 = 0,
        t1 = 1;
      for (const [p, d, lo, hi] of [
        [ax, bx - ax, R.x1, R.x2],
        [ay, by - ay, R.y1, R.y2],
      ]) {
        if (d === 0) {
          if (p < lo || p > hi) return null;
        } else {
          let u0 = (lo - p) / d,
            u1 = (hi - p) / d;
          if (u0 > u1) [u0, u1] = [u1, u0];
          t0 = Math.max(t0, u0);
          t1 = Math.min(t1, u1);
        }
      }
      return t0 < t1 ? [t0, t1] : null;
    };
    const lerp = ([ax, ay], [bx, by], u) => [ax + (bx - ax) * u, ay + (by - ay) * u];
    let first = -1,
      last = -1,
      pIn,
      pOut;
    for (let i = 0; i < P.length - 1; i++) {
      const c = clip(P[i], P[i + 1]);
      if (!c) continue;
      if (first < 0) {
        first = i;
        pIn = lerp(P[i], P[i + 1], c[0]);
      }
      last = i;
      pOut = lerp(P[i], P[i + 1], c[1]);
    }
    if (first < 0) return;
    const part1 = [...P.slice(0, first + 1), pIn],
      part2 = [pOut, ...P.slice(last + 1)];
    if (part1.length < 2 || part2.length < 2) return;
    const e2 = ep.cloneNode();
    ep.setAttribute("d", rounded(part1));
    ep.removeAttribute("marker-end");
    e2.setAttribute("d", rounded(part2));
    e2.removeAttribute("marker-start");
    if (sp.me) e2.setAttribute("marker-end", sp.me.match(/"(.*)"/)[1]);
    e2.removeAttribute("data-ed");
    ep.after(e2);
  });
}
function setTaskStatus(n, k) {
  if (hasSubs(n)) return; // derivado de las subtareas
  n.status = k;
  applyNode(n);
  commit();
}
async function editEdgeLabel(id) {
  const e = board.edges.find((x) => x.id === id);
  if (!e) return;
  const v = await dialog("Texto de la conexión (vacío = sin texto):", {
    input: true,
    value: e.label || "",
  });
  if (v !== null) {
    e.label = v.trim();
    renderEdges();
    commit();
  }
}
