"use strict";
/* =====================  Paletas: .gpl, PNG y "Mis paletas"  ===================== */
const isDefTitle = (s) => !s || DEFAULT_TITLES.has(s);
const safeName = (s) => String(s).replace(/[\\/:*?"<>|]+/g, "").trim().slice(0, 80);
// título de la paleta; si no tiene: «Título del espacio_nº de muestras_hex de la primera»
function palName(n) {
  const t = (n.title || "").trim();
  if (!isDefTitle(t)) return safeName(t) || "paleta";
  return safeName(`${fileBase()}_${n.colors.length}_${n.colors[0].replace("#", "").toUpperCase()}`);
}
const hex2rgb = (h) => {
  const v = parseInt(h.replace("#", ""), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};
function gplText(n, name) {
  const rows = n.colors.map((c) => {
    const [r, g, b] = hex2rgb(c);
    return `${String(r).padStart(3)} ${String(g).padStart(3)} ${String(b).padStart(3)}\t${c.toUpperCase()}`;
  });
  return `GIMP Palette\nName: ${name}\nColumns: 0\n#\n${rows.join("\n")}\n`;
}
function parseGpl(text) {
  const colors = [];
  let name = "";
  text.split(/\r?\n/).forEach((ln, i) => {
    const l = ln.trim();
    if (!l || l.startsWith("#")) return;
    if (i === 0 && /^GIMP Palette/i.test(l)) return;
    const m = l.match(/^Name:\s*(.*)$/i);
    if (m) {
      name = m[1].trim();
      return;
    }
    if (/^Columns:/i.test(l)) return;
    const c = l.match(/^(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})/);
    if (c && c.slice(1).every((v) => +v <= 255))
      colors.push("#" + c.slice(1).map((v) => (+v).toString(16).padStart(2, "0")).join(""));
  });
  return { name, colors };
}
/* guardar un archivo preguntando dónde (diálogo nativo en la app, selector del navegador o descarga) */
async function saveAs(name, blob, desc, ext) {
  try {
    if (TAURI && TAURI.dialog) {
      const p = await TAURI.dialog.save({ defaultPath: name, filters: [{ name: desc, extensions: [ext] }] });
      if (!p) return false;
      await invoke("write_bytes", { path: p, data: Array.from(new Uint8Array(await blob.arrayBuffer())) });
      return true;
    }
    if (window.showSaveFilePicker) {
      const h = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: desc, accept: { [blob.type || "application/octet-stream"]: ["." + ext] } }] });
      const w = await h.createWritable();
      await w.write(blob);
      await w.close();
      return true;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    return true;
  } catch (e) {
    if (e && e.name === "AbortError") return false;
    toast("⚠ " + (e.message || e));
    return false;
  }
}
async function pickText(desc, exts, input) {
  if (TAURI && TAURI.dialog) {
    const p = await TAURI.dialog.open({ multiple: false, filters: [{ name: desc, extensions: exts }] });
    if (!p) return null;
    const path = Array.isArray(p) ? p[0] : p;
    return { name: String(path).split(/[\\/]/).pop(), text: await invoke("read_file", { path }) };
  }
  return new Promise((res) => {
    input.value = "";
    input.onchange = async () => {
      const f = input.files[0];
      res(f ? { name: f.name, text: await f.text() } : null);
    };
    input.click();
  });
}

$("#pExpGpl").onclick = async () => {
  const n = pal();
  if (!n) return;
  const name = palName(n);
  if (await saveAs(name + ".gpl", new Blob([gplText(n, name)], { type: "text/plain" }), "Paleta GIMP", "gpl")) toast("Paleta .gpl exportada ✓");
};
$("#pImpGpl").onclick = async () => {
  const n = pal();
  if (!n) return;
  try {
    const f = await pickText("Paleta GIMP", ["gpl", "txt"], $("#gplIn"));
    if (!f) return;
    const r = parseGpl(f.text);
    if (!r.colors.length) {
      toast("⚠ El archivo no contiene colores válidos");
      return;
    }
    const cut = r.colors.length > MAXCOL;
    n.colors = r.colors.slice(0, MAXCOL);
    n.gen.n = n.colors.length;
    n.selChip = 0;
    n.lib = ""; // solo sustituye la paleta actual: no pasa a la biblioteca
    n.title = cleanTitle(r.name || f.name.replace(/\.[^.]+$/, "")) || n.title;
    fitPaletteNode(n);
    renderPalette(n);
    updateInspector();
    commit();
    toast(cut ? `Importada (recortada a ${MAXCOL} colores)` : `Importados ${n.colors.length} colores ✓`);
  } catch (e) {
    toast("⚠ " + (e.message || e));
  }
};

/* PNG: cada muestra es un cuadrado de lado s px, sin suavizado ni huecos */
function palPng(n, s, layout) {
  const len = n.colors.length,
    cols = layout === "grid" ? Math.min(len, 8) : len,
    rows = Math.ceil(len / cols),
    c = document.createElement("canvas");
  c.width = cols * s;
  c.height = rows * s;
  const x = c.getContext("2d");
  x.imageSmoothingEnabled = false;
  n.colors.forEach((col, i) => {
    x.fillStyle = col;
    x.fillRect((i % cols) * s, Math.floor(i / cols) * s, s, s);
  });
  return new Promise((r) => c.toBlob(r, "image/png"));
}
$("#pExpPng").onclick = async () => {
  const n = pal();
  if (!n) return;
  const s = +$("#pPngS").value,
    lay = $("#pPngL").value;
  UI.palPng = { s, lay };
  saveUI();
  const blob = await palPng(n, s, lay);
  if (await saveAs(`${palName(n)}${s > 1 ? "_" + s + "px" : ""}.png`, blob, "PNG", "png")) toast("PNG exportado ✓");
};

/* Mis paletas (máx. 10): se guardan en la biblioteca de MindForge */
function renderUserPals() {
  const up = userPals();
  $("#pUserN").textContent = `${up.length}/${MAX_USER_PALS}`;
  $("#pUserList").innerHTML = up
    .map(
      (l, i) =>
        `<div class="upal" data-i="${i}" title="Clic para cargar en la paleta actual"><span class="uc">${l.c
          .slice(0, 12)
          .map((c) => `<i style="background:${c}"></i>`)
          .join("")}</span><span class="un">${esc(l.name)}</span><button class="ux" title="Eliminar de Mis paletas">×</button></div>`,
    )
    .join("");
  refreshLibs();
}
$("#pSave").onclick = async () => {
  const n = pal();
  if (!n) return;
  const up = userPals();
  let name = isDefTitle((n.title || "").trim()) ? `Paleta ${n.colors.length} · ${n.colors[0].toUpperCase()}` : safeName(n.title);
  if (LIBS.some((l) => l.name === name)) name += " ★"; // no pisa los nombres de la biblioteca incluida
  const at = up.findIndex((l) => l.name === name);
  if (at < 0 && up.length >= MAX_USER_PALS) {
    toast(`Mis paletas está llena (${MAX_USER_PALS}/${MAX_USER_PALS}): quita alguna primero`);
    return;
  }
  const ok = await dialog(
    at >= 0
      ? `Ya existe «${name}» en Mis paletas. ¿Sustituirla por esta?`
      : `¿Guardar «${name}» (${n.colors.length} colores) en Mis paletas? (${up.length + 1}/${MAX_USER_PALS})`,
  );
  if (!ok) return;
  const item = { name, c: n.colors.slice() };
  UI.pals = up.slice();
  if (at >= 0) UI.pals[at] = item;
  else UI.pals.push(item);
  saveUI();
  renderUserPals();
  toast("Guardada en Mis paletas ✓");
};
$("#pUserList").addEventListener("click", async (e) => {
  const row = e.target.closest(".upal");
  if (!row) return;
  const i = +row.dataset.i,
    l = userPals()[i];
  if (!l) return;
  if (e.target.closest(".ux")) {
    if (!(await dialog(`¿Eliminar «${l.name}» de Mis paletas?`))) return;
    UI.pals = userPals().filter((_, k) => k !== i);
    saveUI();
    renderUserPals();
    return;
  }
  const n = pal();
  if (!n) return;
  n.colors = l.c.slice(0, MAXCOL);
  n.title = l.name;
  n.lib = l.name;
  n.gen.n = n.colors.length;
  n.selChip = 0;
  fitPaletteNode(n);
  renderPalette(n);
  updateInspector();
  commit();
});
(function initPalFiles() {
  const pp = UI.palPng || {};
  if (pp.s) $("#pPngS").value = pp.s;
  else $("#pPngS").value = "32";
  if (pp.lay) $("#pPngL").value = pp.lay;
  renderUserPals();
})();

/* secciones desplegables (el estado se recuerda) y ayuda (i) */
(function initFolds() {
  const st = Object.assign({ create: true, adjust: false, file: false }, UI.palSec || {});
  document.querySelectorAll("#insp .fsec").forEach((s) => {
    s.classList.toggle("closed", !st[s.dataset.sec]);
    s.querySelector(".fold").addEventListener("click", () => {
      s.classList.toggle("closed");
      st[s.dataset.sec] = !s.classList.contains("closed");
      UI.palSec = st;
      saveUI();
      positionInsp();
    });
  });
  hoverTip($("#pInfo"), $("#palTip"));
})();
