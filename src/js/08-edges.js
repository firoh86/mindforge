"use strict";
/* =====================  Conexiones  ===================== */
function sideP(n, s) {
  const h = nh(n);
  if (s === "t") return { x: n.x + n.w / 2, y: n.y, dx: 0, dy: -1 };
  if (s === "b") return { x: n.x + n.w / 2, y: n.y + h, dx: 0, dy: 1 };
  if (s === "l") return { x: n.x, y: n.y + h / 2, dx: -1, dy: 0 };
  return { x: n.x + n.w, y: n.y + h / 2, dx: 1, dy: 0 };
}
// lados (letras) por los que sale / entra una conexión entre a y b
function edgeSideKeys(a, b) {
  if (b.y >= a.y + nh(a)) return ["b", "t"];
  if (b.y + nh(b) <= a.y) return ["t", "b"];
  return b.x >= a.x ? ["r", "l"] : ["l", "r"];
}
// Punto de anclaje en un lado, desplazado `off` px a lo largo de ese lado
function sidePoint(n, side, off = 0) {
  const p = sideP(n, side);
  if (side === "t" || side === "b") p.x += off;
  else p.y += off;
  return p;
}
/* En cada lado de una tarjeta, los extremos de conexión que terminan igual
   (con punta de flecha, sin ella, o con bola)  comparten punto de anclaje.
   Si en un mismo lado conviven extremos distintos, cada tipo recibe su propio
   punto, ordenado según la posición de la tarjeta de destino para no cruzarse. */
function edgeOffsets(extra = []) {
  const ends = new Map();
  board.edges.forEach((e, idx) => {
    const a = get(e.from),
      b = get(e.to);
    if (!a || !b || HID.has(a.id) || HID.has(b.id)) return;
    const [sa, sb] = edgeSideKeys(a, b),
      dir = e.dir || "fwd",
      add = (n, side, end, arrow, other) => {
        const k = n.id + "|" + side;
        if (!ends.has(k)) ends.set(k, []);
        ends.get(k).push({ id: e.id, end, arrow, other, idx });
      };
    add(a, sa, "s", dir === "rev" || dir === "both", b);
    add(b, sb, "t", dir === "fwd" || dir === "both", a);
  });
  // tramos con bola hacia nodos ocultos: en el nodo visible su extremo es como el de cualquier conexión (con o sin punta);
  // en el nodo que oculta termina en bola, que es un tercer tipo de extremo con su propio punto
  extra.forEach((x, i) => {
    const add = (n, side, end, arrow, ball, other) => {
      const k = n.id + "|" + side;
      if (!ends.has(k)) ends.set(k, []);
      ends.get(k).push({ id: x.id, end, arrow, ball, other, idx: 1e6 + i });
    };
    add(x.a, x.as, "s", x.arrow, false, x.b);
    add(x.b, x.bs, "t", false, true, x.a);
  });
  const off = new Map();
  ends.forEach((list, k) => {
    const [nid, side] = k.split("|"),
      n = get(nid),
      horiz = side === "t" || side === "b",
      groups = new Map();
    list.forEach((it) => {
      const g = it.ball ? "o" : it.arrow ? "a" : "n";
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(it);
    });
    if (groups.size < 2) return;
    const arr = [...groups.values()].map((items) => ({
      items,
      pos:
        items.reduce(
          (t, it) =>
            t +
            (horiz
              ? it.other.x + it.other.w / 2
              : it.other.y + nh(it.other) / 2),
          0,
        ) / items.length,
      idx: Math.min(...items.map((it) => it.idx)),
    }));
    arr.sort((x, y) => Math.round(x.pos) - Math.round(y.pos) || x.idx - y.idx);
    const len = horiz ? n.w : nh(n),
      sp = Math.min(len / (arr.length + 1), 28);
    arr.forEach((g, i) => {
      const o = (i - (arr.length - 1) / 2) * sp;
      g.items.forEach((it) => off.set(it.id + "|" + it.end, o));
    });
  });
  return off;
}
/* ---- Esquivar nodos (opción «Esquivar nodos» del botón junto a «Ver principal») ----
   Las flechas pueden cruzarse entre sí, pero rodean los nodos que se interpongan. Si el trazado normal (en Z) no toca
   ningún nodo se deja tal cual; si lo toca, se busca por una rejilla de coordenadas candidatas (los bordes de los nodos
   cercanos + un margen) el camino ortogonal más corto, penalizando los giros. */
const AVOID_PAD = 14, // margen de las flechas respecto a los nodos que esquivan
  AVOID_TURN = 60, // coste de cada giro (prefiere caminos con menos esquinas)
  AVOID_STUB = 20; // tramo recto mínimo al salir y al llegar a un nodo
function nodeRect(n) {
  const el = els.get(n.id);
  return { x1: n.x, y1: n.y, x2: n.x + ((el && el.offsetWidth) || n.w), y2: n.y + ((el && el.offsetHeight) || nh(n)) };
}
// ¿el tramo horizontal/vertical a→b entra en el interior del rectángulo r (con margen)?
function segHits(a, b, r, pad) {
  const x1 = r.x1 - pad,
    y1 = r.y1 - pad,
    x2 = r.x2 + pad,
    y2 = r.y2 + pad;
  if (a[1] === b[1]) return a[1] > y1 && a[1] < y2 && Math.max(a[0], b[0]) > x1 && Math.min(a[0], b[0]) < x2;
  return a[0] > x1 && a[0] < x2 && Math.max(a[1], b[1]) > y1 && Math.min(a[1], b[1]) < y2;
}
// nodos que una flecha entre A y B debería esquivar (visibles, distintos de sus extremos y de las cajas de grupo desplegadas)
function edgeObstacles(A, B) {
  return board.nodes.filter((n) => n !== A && n !== B && !HID.has(n.id) && !(isGroupBox(n) && !n.gcol)).map(nodeRect);
}
function simplifyPts(pts) {
  const o = [];
  for (const p of pts) {
    if (o.length && o[o.length - 1][0] === p[0] && o[o.length - 1][1] === p[1]) continue;
    o.push(p);
    while (o.length > 2) {
      const a = o[o.length - 3],
        b = o[o.length - 2],
        c = o[o.length - 1];
      if ((a[0] === b[0] && b[0] === c[0]) || (a[1] === b[1] && b[1] === c[1])) o.splice(o.length - 2, 1);
      else break;
    }
  }
  return o;
}
function avoidRoute(p, q, obs, ends) {
  const p0 = [p.x + p.dx * AVOID_STUB, p.y + p.dy * AVOID_STUB],
    q0 = [q.x + q.dx * AVOID_STUB, q.y + q.dy * AVOID_STUB],
    all = obs.map((r) => ({ r, pad: AVOID_PAD })).concat(ends.map((r) => ({ r, pad: 8 })));
  const xs = new Set([p0[0], q0[0], (p0[0] + q0[0]) / 2]),
    ys = new Set([p0[1], q0[1], (p0[1] + q0[1]) / 2]);
  all.forEach(({ r, pad }) => {
    xs.add(r.x1 - pad - 2);
    xs.add(r.x2 + pad + 2);
    ys.add(r.y1 - pad - 2);
    ys.add(r.y2 + pad + 2);
  });
  const X = [...xs].sort((a, b) => a - b),
    Y = [...ys].sort((a, b) => a - b),
    nx = X.length,
    ny = Y.length,
    ix = X.indexOf(p0[0]),
    iy = Y.indexOf(p0[1]),
    tx = X.indexOf(q0[0]),
    ty = Y.indexOf(q0[1]);
  // tramos de la rejilla bloqueados por algún nodo (se calculan una vez por obstáculo, no en cada paso de la búsqueda)
  //   bh[j * (nx - 1) + i]: tramo horizontal entre X[i] y X[i+1] a la altura Y[j]
  //   bv[i * (ny - 1) + j]: tramo vertical entre Y[j] y Y[j+1] en la columna X[i]
  const bh = new Uint8Array(Math.max(1, (nx - 1) * ny)),
    bv = new Uint8Array(Math.max(1, (ny - 1) * nx));
  all.forEach(({ r, pad }) => {
    const x1 = r.x1 - pad,
      y1 = r.y1 - pad,
      x2 = r.x2 + pad,
      y2 = r.y2 + pad;
    for (let j = 0; j < ny; j++) {
      if (Y[j] <= y1 || Y[j] >= y2) continue;
      for (let i = 0; i < nx - 1; i++) if (X[i + 1] > x1 && X[i] < x2) bh[j * (nx - 1) + i] = 1;
    }
    for (let i = 0; i < nx; i++) {
      if (X[i] <= x1 || X[i] >= x2) continue;
      for (let j = 0; j < ny - 1; j++) if (Y[j + 1] > y1 && Y[j] < y2) bv[i * (ny - 1) + j] = 1;
    }
  });
  // ¿se puede ir de la celda (i, j) a la contigua en la dirección m (0 → +x, 1 → −x, 2 → +y, 3 → −y)?
  const free = (i, j, m) =>
    m === 0 ? !bh[j * (nx - 1) + i] : m === 1 ? !bh[j * (nx - 1) + i - 1] : m === 2 ? !bv[i * (ny - 1) + j] : !bv[i * (ny - 1) + j - 1];
  const DX = [1, -1, 0, 0],
    DY = [0, 0, 1, -1],
    S = nx * ny * 5,
    dist = new Float64Array(S).fill(Infinity),
    prev = new Int32Array(S).fill(-1),
    done = new Uint8Array(S),
    heap = [];
  const push = (c, k) => {
    heap.push([c, k]);
    let i = heap.length - 1;
    while (i > 0) {
      const par = (i - 1) >> 1;
      if (heap[par][0] <= heap[i][0]) break;
      [heap[par], heap[i]] = [heap[i], heap[par]];
      i = par;
    }
  };
  const pop = () => {
    const top = heap[0],
      last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        let m = i;
        const l = 2 * i + 1,
          r = l + 1;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  const key = (i, j, d) => (i * ny + j) * 5 + d,
    hh = (i, j) => Math.abs(X[i] - q0[0]) + Math.abs(Y[j] - q0[1]); // heurística A* (distancia Manhattan)
  const k0 = key(ix, iy, 4);
  dist[k0] = 0;
  push(hh(ix, iy), k0);
  let goal = -1,
    guard = 0;
  while (heap.length && guard++ < 60000) {
    const [, k] = pop();
    if (done[k]) continue;
    done[k] = 1;
    const c = dist[k],
      d = k % 5,
      cell = (k - d) / 5,
      i = Math.floor(cell / ny),
      j = cell % ny;
    if (i === tx && j === ty) {
      goal = k;
      break;
    }
    for (let m = 0; m < 4; m++) {
      const ni = i + DX[m],
        nj = j + DY[m];
      if (ni < 0 || nj < 0 || ni >= nx || nj >= ny || !free(i, j, m)) continue;
      const nc = c + Math.abs(X[ni] - X[i]) + Math.abs(Y[nj] - Y[j]) + (d !== 4 && d !== m ? AVOID_TURN : 0),
        nk = key(ni, nj, m);
      if (nc < dist[nk]) {
        dist[nk] = nc;
        prev[nk] = k;
        push(nc + hh(ni, nj), nk);
      }
    }
  }
  if (goal < 0) return null;
  const path = [];
  for (let k = goal; k >= 0; k = prev[k]) {
    const cell = (k - (k % 5)) / 5;
    path.push([X[Math.floor(cell / ny)], Y[cell % ny]]);
  }
  path.reverse();
  return simplifyPts([[p.x, p.y], ...path, [q.x, q.y]]);
}
const ROUTE_CACHE = new Map(); // caminos ya calculados: solo se recalculan si cambian los extremos o los nodos cercanos
// trazado de la flecha: en Z por defecto; con `avoid` ({ A, B }) rodea los nodos que se interpongan
function route(p, q, avoid) {
  const base = routeZ(p, q);
  if (!avoid || !board.avoid) return base;
  const obs = edgeObstacles(avoid.A, avoid.B);
  if (!obs.length) return base;
  const hits = (pts) => {
    for (let i = 0; i < pts.length - 1; i++) if (obs.some((r) => segHits(pts[i], pts[i + 1], r, AVOID_PAD - 4))) return true;
    return false;
  };
  if (!hits(base)) return base;
  // solo cuentan los nodos cercanos al recorrido (acelera el cálculo con tableros grandes)
  const m = 240,
    bx1 = Math.min(p.x, q.x) - m,
    bx2 = Math.max(p.x, q.x) + m,
    by1 = Math.min(p.y, q.y) - m,
    by2 = Math.max(p.y, q.y) + m,
    near = obs.filter((r) => r.x2 > bx1 && r.x1 < bx2 && r.y2 > by1 && r.y1 < by2),
    ends = [nodeRect(avoid.A), nodeRect(avoid.B)],
    ck = [p.x, p.y, p.dx, p.dy, q.x, q.y, q.dx, q.dy, ...near.concat(ends).map((r) => [r.x1, r.y1, r.x2, r.y2])].join(",");
  let pts = ROUTE_CACHE.get(ck);
  if (pts === undefined) {
    pts = avoidRoute(p, q, near, ends);
    if (ROUTE_CACHE.size > 3000) ROUTE_CACHE.clear();
    ROUTE_CACHE.set(ck, pts);
  }
  if (!pts || pts.length < 3) return base;
  let li = 0,
    best = -1;
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.abs(pts[i + 1][0] - pts[i][0]) + Math.abs(pts[i + 1][1] - pts[i][1]);
    if (l > best) {
      best = l;
      li = i;
    }
  }
  pts.li = li; // tramo más largo: ahí va el texto de la flecha
  return pts;
}
function routeZ(p, q) {
  if (p.dy !== 0) {
    const my = (p.y + q.y) / 2;
    return [
      [p.x, p.y],
      [p.x, my],
      [q.x, my],
      [q.x, q.y],
    ];
  }
  const mx = (p.x + q.x) / 2;
  return [
    [p.x, p.y],
    [mx, p.y],
    [mx, q.y],
    [q.x, q.y],
  ];
}
function rounded(pts, r = 14) {
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i - 1],
      [x1, y1] = pts[i],
      [x2, y2] = pts[i + 1];
    const l1 = Math.hypot(x1 - x0, y1 - y0),
      l2 = Math.hypot(x2 - x1, y2 - y1),
      rr = Math.min(r, l1 / 2, l2 / 2);
    if (rr < 0.5 || !l1 || !l2) {
      d += ` L${x1} ${y1}`;
      continue;
    }
    d += ` L${x1 - ((x1 - x0) / l1) * rr} ${y1 - ((y1 - y0) / l1) * rr} Q${x1} ${y1} ${x1 + ((x2 - x1) / l2) * rr} ${y1 + ((y2 - y1) / l2) * rr}`;
  }
  const Lp = pts[pts.length - 1];
  return d + ` L${Lp[0]} ${Lp[1]}`;
}
/* Los nexos que conectan estos tipos de nodo se dibujan discontinuos */
const DASH_TYPES = ["text", "comment", "task"];
