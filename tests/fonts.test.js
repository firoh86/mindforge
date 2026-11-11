const { test } = require("node:test");
const assert = require("node:assert/strict");
const SAMPLE = `/* cyrillic */
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 400; src: url(https://fonts.gstatic.com/s/inter/cyr.woff2) format('woff2'); }
/* latin */
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 400; font-display: swap; src: url(https://fonts.gstatic.com/s/inter/lat.woff2) format('woff2'); unicode-range: U+0000-00FF; }
/* latin */
@font-face { font-family: 'Playfair Display'; font-style: normal; font-weight: 400 700; src: url(https://fonts.gstatic.com/s/pf/lat.woff2) format('woff2'); }`;

test("fetch-fonts: sólo conserva el subconjunto latin y genera CSS local", async () => {
  const m = await import("../scripts/fetch-fonts.mjs");
  const faces = m.parseFontCss(SAMPLE);
  assert.equal(faces.length, 2);
  assert.equal(m.fileName(faces[1]), "PlayfairDisplay-400-700.woff2");
  const css = m.buildCss(faces);
  assert.match(css, /font-family:"Inter".*assets\/fonts\/Inter-400\.woff2/);
});

test("fetch-fonts: patchHtml quita Google Fonts y es idempotente", async () => {
  const m = await import("../scripts/fetch-fonts.mjs");
  const html = '<link rel="preconnect" href="https://fonts.googleapis.com">\n  <link href="https://fonts.googleapis.com/css2?x" rel="stylesheet">\n  <link rel="stylesheet" href="css/01-theme.css">';
  const a = m.patchHtml(html);
  assert.ok(!/googleapis/.test(a) && a.includes("css/00-fonts.css"));
  assert.equal(m.patchHtml(a), a);
});

test("exportar PNG: fontsCss() incrusta las fuentes locales como data URL", async () => {
  const fs = require("fs"), os = require("os"), path = require("path");
  const { launch, SRC } = require("./helpers");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mf-"));
  fs.cpSync(SRC, root, { recursive: true });
  fs.mkdirSync(path.join(root, "assets/fonts"), { recursive: true });
  fs.writeFileSync(path.join(root, "assets/fonts/Inter-400.woff2"), Buffer.from("wOF2fake"));
  fs.writeFileSync(path.join(root, "css/00-fonts.css"), '@font-face{font-family:"Inter";src:url("../assets/fonts/Inter-400.woff2") format("woff2")}');
  const T = await launch({ root });
  try {
    const css = await T.page.evaluate(() => fontsCss());
    assert.match(css, /url\("data:[^"]*base64,/);
    assert.deepEqual(T.errors, []);
  } finally { await T.close(); fs.rmSync(root, { recursive: true, force: true }); }
});

test("exportar PNG: sin css/00-fonts.css, fontsCss() devuelve vacío y el PNG se genera igual", async () => {
  const fs = require("fs"), os = require("os"), path = require("path");
  const { launch, SRC } = require("./helpers");
  // copia de src/ sin el CSS de fuentes locales (aunque el usuario ya haya ejecutado `npm run fonts`)
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mf-"));
  fs.cpSync(SRC, root, { recursive: true });
  fs.rmSync(path.join(root, "css/00-fonts.css"), { force: true });
  const T = await launch({ root });
  try {
    assert.equal(await T.page.evaluate(() => fontsCss()), "");
    const size = await T.page.evaluate(async () => (await renderViewPng(1, null)).size);
    assert.ok(size > 1000);
  } finally { await T.close(); fs.rmSync(root, { recursive: true, force: true }); }
});
