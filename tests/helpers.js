// Utilidades compartidas por los tests: servidor estático de src/, navegador y mock de Tauri.
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");

const SRC = path.join(__dirname, "..", "src");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".woff2": "font/woff2", ".png": "image/png", ".svg": "image/svg+xml" };

function serve(root = SRC) {
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      const f = path.join(root, decodeURIComponent(q.url.split("?")[0]).replace(/^\/$/, "/index.html"));
      if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); r.end(fs.readFileSync(f));
    }).listen(0, "127.0.0.1", () => res({ srv, url: "http://127.0.0.1:" + srv.address().port + "/" }));
  });
}

// Mock de window.__TAURI__ con sistema de archivos en memoria y cola de diálogos (window.NEXT).
const TAURI_MOCK = `
window.FS={}; window.LOG=[]; window.NEXT=[];
window.__TAURI__={core:{invoke:async(c,a)=>{
  if(c==="write_file"){FS[a.path]=a.data;LOG.push("write "+a.path);return}
  if(c==="read_file"){if(!(a.path in FS))throw new Error("no existe");return FS[a.path]}
  if(c==="save_board"){FS["__app__"]=a.data;return}
  if(c==="load_board"){return null}
  return null}},
 window:{getCurrentWindow:()=>({onCloseRequested:(h)=>{window.CLOSE=h;return Promise.resolve(()=>{})}})},
 dialog:{save:async(o)=>{LOG.push("dialog.save");return NEXT.shift()||null},open:async()=>NEXT.shift()||null}};`;

async function launch(opts = {}) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: opts.w || 1500, height: opts.h || 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());   // los tests no dependen de internet
  if (opts.tauri) await page.addInitScript(TAURI_MOCK);
  if (opts.ui) await page.addInitScript(`localStorage.setItem('mindforge-ui',${JSON.stringify(JSON.stringify(opts.ui))})`);
  const { srv, url } = await serve(opts.root);
  await page.goto(url);
  await page.waitForFunction(() => typeof board !== "undefined" && document.querySelector("#world"));
  await page.waitForTimeout(300);
  return { browser, page, errors, url, close: async () => { await browser.close(); srv.close(); } };
}
module.exports = { launch, serve, SRC };
