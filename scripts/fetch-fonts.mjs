// Descarga las fuentes de Google Fonts a src/assets/fonts y genera src/css/00-fonts.css (uso: npm run fonts).
// Se ejecuta UNA vez con internet; después la app se ve igual sin conexión y las fuentes salen en el PNG exportado.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const FAMILIES = "family=Architects+Daughter&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&family=Montserrat:wght@400;500;600;700&family=Nunito:wght@400;600;700&family=Playfair+Display:wght@400;600;700";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Devuelve [{family, weight, style, url}] sólo del subconjunto latin (el que usan ES/EN).
export function parseFontCss(css) {
  const out = [], re = /\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    if (m[1] !== "latin") continue;
    const b = m[2], g = (k) => (b.match(new RegExp(k + "\\s*:\\s*([^;]+);")) || [])[1]?.trim();
    const url = (b.match(/url\(([^)]+)\)/) || [])[1]?.replace(/['"]/g, "");
    if (url) out.push({ family: g("font-family").replace(/['"]/g, ""), weight: g("font-weight") || "400", style: g("font-style") || "normal", url });
  }
  return out;
}
export const fileName = (f) => `${f.family.replace(/\s+/g, "")}-${f.weight.replace(/\s+/g, "-")}${f.style === "italic" ? "-italic" : ""}.woff2`;
export function buildCss(faces) {
  return "/* Generado por scripts/fetch-fonts.mjs — no editar a mano */\n" + faces.map((f) =>
    `@font-face{font-family:"${f.family}";font-style:${f.style};font-weight:${f.weight};font-display:swap;src:url("../assets/fonts/${fileName(f)}") format("woff2")}`).join("\n") + "\n";
}
// Quita los <link> a Google Fonts del HTML y añade el CSS local (idempotente).
export function patchHtml(html) {
  html = html.replace(/\s*<link[^>]+(fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*>/g, "");
  if (!html.includes("css/00-fonts.css")) html = html.replace(/(\s*)(<link rel="stylesheet" href="css\/01-)/, '$1<link rel="stylesheet" href="css/00-fonts.css">$1$2');
  return html;
}

async function main() {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");
  const dir = path.join(root, "assets", "fonts");
  fs.mkdirSync(dir, { recursive: true });
  const res = await fetch(`https://fonts.googleapis.com/css2?${FAMILIES}&display=swap`, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error("Google Fonts respondió " + res.status);
  const faces = parseFontCss(await res.text());
  if (!faces.length) throw new Error("No se encontraron @font-face latin");
  for (const f of faces) {
    const r = await fetch(f.url); if (!r.ok) throw new Error(f.url + " → " + r.status);
    fs.writeFileSync(path.join(dir, fileName(f)), Buffer.from(await r.arrayBuffer()));
    console.log("✓", fileName(f));
  }
  fs.writeFileSync(path.join(root, "css", "00-fonts.css"), buildCss(faces));
  const idx = path.join(root, "index.html");
  fs.writeFileSync(idx, patchHtml(fs.readFileSync(idx, "utf8")));
  console.log(`Listo: ${faces.length} fuentes en src/assets/fonts. Vuelve a compilar la app.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error("Error:", e.message); process.exit(1); });
