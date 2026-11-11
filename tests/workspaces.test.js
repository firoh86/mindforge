const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { launch } = require("./helpers");

let T, page;
before(async () => { T = await launch({ tauri: true }); page = T.page; });
after(async () => { assert.deepEqual(T.errors, []); await T.close(); });
const J = f => page.evaluate(f);
const files = () => J(() => Object.fromEntries(Object.entries(FS).filter(([k]) => k !== "__app__").map(([k, v]) => [k, JSON.parse(v).title])));
const rename = async t => { await page.fill("#boardTitle", t); await page.press("#boardTitle", "Enter"); await page.waitForTimeout(800); };

test("guardar como vincula el archivo; renombrar sin autoguardado no toca el archivo", async () => {
  await J(() => { board.nodes.length = 0; addNode("bubble", 300, 300); }); await page.waitForTimeout(300);
  await rename("uno");
  await J(() => { NEXT.push("/w/uno.json"); }); await J(() => saveWs({ as: true })); await page.waitForTimeout(300);
  assert.deepEqual(await files(), { "/w/uno.json": "uno" });
  await rename("dos");
  assert.deepEqual(await files(), { "/w/uno.json": "uno" });
  await J(() => saveWs()); await page.waitForTimeout(300);
  assert.deepEqual(await files(), { "/w/uno.json": "dos" });
});

test("con autoguardado, renombrar actualiza el archivo", async () => {
  await J(() => setWsAuto(true)); await page.waitForTimeout(400);
  await rename("tres");
  assert.deepEqual(await files(), { "/w/uno.json": "tres" });
});

test("abrir el mismo archivo con cambios de contenido pregunta antes de recargar", async () => {
  await J(() => setWsAuto(false)); await page.waitForTimeout(200);
  await J(() => { get(board.nodes[0].id).x += 40; renderAll(); commit(); }); await page.waitForTimeout(300);
  await J(() => { NEXT.push("/w/uno.json"); }); await J(() => { importFile(); }); await page.waitForTimeout(400);
  assert.ok(await page.isVisible("#mYes"), "debe aparecer el diálogo de confirmación");
  await page.click("#mNo");
});

test("cerrar: sin cambios pendientes en el archivo no se pregunta", async () => {
  await J(() => { NEXT.push("/w/c.json"); }); await J(() => saveWs({ as: true })); await page.waitForTimeout(300);
  const ev = await page.evaluate(async () => { const e = { prevented: false, preventDefault() { this.prevented = true; } }; await CLOSE(e); return e.prevented; });
  assert.equal(ev, false);
});

test("cerrar: con cambios sin guardar pregunta; Cancelar bloquea, Salir sin guardar deja cerrar, Guardar escribe", async () => {
  await J(() => { get(board.nodes[0].id).x += 100; renderAll(); commit(); }); await page.waitForTimeout(700);
  const run = () => page.evaluate(() => { window.__r = null; const e = { prevented: false, preventDefault() { this.prevented = true; } }; window.__p = CLOSE(e).then(() => (window.__r = e.prevented)); });
  await run(); await page.waitForSelector("#mYes", { state: "visible" });
  assert.match(await page.innerText("#mYes"), /Guardar|Save/);
  assert.match(await page.innerText("#mtxt"), /la app los conserva|The app keeps them/i);
  assert.match(await page.innerText("#mAlt"), /sin guardar en el archivo|without saving to the file/i);
  await page.click("#mNo"); await page.waitForFunction(() => window.__r !== null);
  assert.equal(await J(() => window.__r), true, "cancelar debe impedir el cierre");
  await run(); await page.waitForSelector("#mAlt", { state: "visible" }); await page.click("#mAlt"); await page.waitForFunction(() => window.__r !== null);
  assert.equal(await J(() => window.__r), false, "salir sin guardar permite cerrar");
  await run(); await page.waitForSelector("#mYes", { state: "visible" }); await page.click("#mYes"); await page.waitForFunction(() => window.__r !== null);
  assert.equal(await J(() => window.__r), false);
  assert.equal(await J(() => Math.round(JSON.parse(FS["/w/c.json"]).nodes[0].x) === Math.round(board.nodes[0].x)), true, "Guardar y salir debe escribir el archivo");
});

test("cerrar: con autoguardado activo nunca se pregunta", async () => {
  await J(() => setWsAuto(true)); await page.waitForTimeout(400);
  await J(() => { get(board.nodes[0].id).x += 60; renderAll(); commit(); }); await page.waitForTimeout(800);
  assert.equal(await J(() => fileUnsaved()), false);
});
