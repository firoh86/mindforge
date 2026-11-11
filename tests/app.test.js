const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { launch } = require("./helpers");

let T, page;
before(async () => { T = await launch({ ui: { lang: "en", mmOn: true } }); page = T.page; });
after(async () => { assert.deepEqual(T.errors, [], "errores JS en la página"); await T.close(); });
const J = f => page.evaluate(f);

test("arranca con el tablero de bienvenida (12 nodos, 10 flechas) y sin texto en español", async () => {
  await J(() => loadBoard(seed())); await page.waitForTimeout(200);
  assert.deepEqual(await J(() => [board.nodes.length, board.edges.length]), [12, 10]);
  const txt = await J(() => [...document.querySelectorAll(".node")].map(e => e.innerText).join("\n"));
  assert.ok(!/[áéíóúñ¿¡]/.test(txt), "quedan textos en español con lang=en");
});

test("'Borrar todos' sin nodos muestra un toast", async () => {
  await J(() => { board.nodes = []; board.edges = []; renderAll(); });
  await page.click("#clearBtn"); await page.waitForTimeout(100);
  assert.ok((await page.innerText("#toast")).length > 0);
});

test("los botones auxiliares están en dos columnas con el orden esperado", async () => {
  const ids = await J(() => [...document.querySelectorAll("#fabcols .fabcol")].map(c => [...c.querySelectorAll("button")].map(b => b.id)));
  assert.deepEqual(ids, [["snapBtn", "fitBtn", "mmBtn", "expBtn"], ["undoBtn", "redoBtn", "mainBtn", "avoidBtn"]]);
});

test("burbuja: el ancho mínimo sigue a la palabra más larga (tope 360)", async () => {
  await J(() => { board.nodes = []; board.edges = []; addNode("bubble", 300, 300); });
  const f = await J(() => { const n = board.nodes[0]; const set = h => { n.html = h; els.get(n.id).querySelector(".content").innerHTML = h; return bubbleFit(n, 120); };
    return { corta: set("hola mundo"), larga: set("supercalifragilisticoespialidoso otra"), lineas: set("a b c d e f g h i j k l m n o p q r s t u v w x y z") }; });
  assert.ok(f.larga.w > f.corta.w, JSON.stringify(f));
  assert.ok(f.larga.w <= 360);
  assert.ok(f.lineas.h > f.corta.h, "más texto, más alto: " + JSON.stringify(f));
});

test("minimapa: activar, clic centra la vista, arrastrar y límite mínimo", async () => {
  await J(() => loadBoard(seed()));
  if (await J(() => $("#minimap").hidden)) await page.click("#mmBtn");
  await page.waitForTimeout(200);
  const box = await J(() => { const r = $("#minimap").getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
  const v0 = await J(() => ({ ...board.view }));
  await page.mouse.click(box[0] + box[2] * .85, box[1] + box[3] * .25); await page.waitForTimeout(150);
  const v1 = await J(() => ({ ...board.view }));
  assert.notDeepEqual(v0, v1, "el clic en el minimapa debe mover la vista");
  const g = await J(() => { const r = $("#minimap").getBoundingClientRect(); return [r.right, r.bottom]; });
  await page.mouse.move(g[0] - 4, g[1] - 4); await page.mouse.down(); await page.mouse.move(g[0] - 900, g[1] - 900, { steps: 6 }); await page.mouse.up();
  const m = await J(() => UI.mm);
  assert.ok(m.w >= 140 && m.h >= 100, "tamaño mínimo del minimapa: " + JSON.stringify(m));
});

test("flechas: 'Esquivar nodos' rodea un nodo intermedio y el cálculo es rápido", async () => {
  const r = await J(() => {
    const N = [["a", 0, 0], ["b", 900, 0], ["c", 400, -10]].map(([id, x, y]) => ({ id, type: "bubble", x, y, w: 240, h: 64, color: "#60a5fa", html: id, font: "Inter" }));
    const hit = () => { const p = document.querySelector('path.edge[data-ed="e1"]'), L = p.getTotalLength(); let n = 0;
      for (let s = 0; s <= L; s += 4) { const q = p.getPointAtLength(s); if (q.x > 400 && q.x < 640 && q.y > -10 && q.y < 54) n++; } return n; };
    const out = {};
    for (const av of [false, true]) { loadBoard({ v: 5, nodes: JSON.parse(JSON.stringify(N)), edges: [{ id: "e1", from: "a", to: "b" }], images: {}, avoid: av, view: { x: 0, y: 0, k: 1 } }); out[av] = hit(); }
    // rendimiento: 80 nodos / 120 flechas
    let seed = 7; const rnd = m => (seed = (seed * 16807) % 2147483647) % m;
    const BN = [...Array(80)].map((_, i) => ({ id: "n" + i, type: "bubble", x: rnd(150) * 20, y: rnd(100) * 20, w: 240, h: 64, color: "#60a5fa", html: "" + i, font: "Inter" }));
    const BE = [...Array(120)].map((_, i) => ({ id: "e" + i, from: "n" + rnd(80), to: "n" + rnd(80) }));
    loadBoard({ v: 5, nodes: BN, edges: BE, images: {}, avoid: true, view: { x: 0, y: 0, k: .4 } });
    ROUTE_CACHE.clear(); let t = performance.now(); renderEdges(); out.cold = performance.now() - t;
    return out; });
  assert.ok(r[false] > 0, "sin esquivar, la flecha recta atraviesa el nodo");
  assert.equal(r[true], 0, "con esquivar no debe atravesarlo");
  assert.ok(r.cold < 1500, "renderEdges en frío demasiado lento: " + r.cold + " ms");
});

test("exportar PNG: menú de dos pasos, recorte y descarga con nombre correcto", async () => {
  await J(() => { window.showSaveFilePicker = undefined; loadBoard(seed()); });
  await page.click("#expBtn");
  await page.click("#expMenu button[data-m=crop]"); await page.waitForTimeout(150);
  assert.equal(await J(() => !$("#expCrop").hidden), true);
  await page.mouse.move(100, 150); await page.mouse.down(); await page.mouse.move(700, 450, { steps: 5 }); await page.mouse.up();
  await page.click("#expCrop .ecok"); await page.waitForTimeout(150);
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 20000 }), page.click('#expMenu button[data-k="1"]')]);
  assert.match(dl.suggestedFilename(), /_recorte_x1\.png$/);
});
