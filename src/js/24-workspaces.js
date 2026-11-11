"use strict";
/* =====================  Espacios de trabajo  =====================
   Cada tablero tiene un id (board.wsId). La app guarda una copia de cada espacio en
   IndexedDB (mindforge-ws) y una lista de recientes en localStorage (mindforge-ws).
   Si el espacio viene de un archivo (importado o exportado) se guarda también la
   referencia: un FileSystemFileHandle en navegadores Chromium o la ruta en Tauri. */
const WS_MAX = 15;
const newWsId = () => "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const WSDB = (() => {
  let dbp = null;
  const open = () =>
    dbp ||
    (dbp = new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error("IndexedDB no disponible"));
      const r = indexedDB.open("mindforge-ws", 1);
      r.onupgradeneeded = () => {
        r.result.createObjectStore("snap");
        r.result.createObjectStore("h");
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));
  const tx = async (store, mode, fn) => {
    const d = await open();
    return new Promise((res, rej) => {
      const t = d.transaction(store, mode),
        q = fn(t.objectStore(store));
      t.oncomplete = () => res(q && q.result);
      t.onerror = () => rej(t.error);
    });
  };
  return {
    get: (s, k) => tx(s, "readonly", (o) => o.get(k)),
    set: (s, k, v) => tx(s, "readwrite", (o) => o.put(v, k)),
    del: (s, k) => tx(s, "readwrite", (o) => o.delete(k)),
  };
})();
const wsIndex = () => {
  try {
    const a = JSON.parse(localStorage.getItem("mindforge-ws") || "[]");
    return Array.isArray(a) ? a : [];
  } catch (_) {
    return [];
  }
};
function wsUpsert(id, patch) {
  let ix = wsIndex(),
    e = ix.find((x) => x.id === id);
  if (!e) ix.push((e = { id, t: Date.now() }));
  Object.assign(e, patch);
  ix.sort((a, b) => b.t - a.t);
  ix.slice(WS_MAX).forEach((x) => {
    if (x.id === board.wsId) return;
    WSDB.del("snap", x.id).catch(() => {});
    WSDB.del("h", x.id).catch(() => {});
  });
  ix = ix.filter((x, i) => i < WS_MAX || x.id === board.wsId);
  try {
    localStorage.setItem("mindforge-ws", JSON.stringify(ix));
  } catch (_) {}
  return e;
}
/* Respaldos (solo en la app de escritorio): cada espacio guarda copias fechadas en la carpeta `backups` junto al
   programa instalado (o en la carpeta de datos de la app si ahí no se puede escribir), en una subcarpeta por espacio.
   Como mucho una copia cada BK_EVERY ms y solo si el contenido ha cambiado; se conservan las BK_KEEP últimas. */
const BK_EVERY = 2 * 60 * 1000,
  BK_KEEP = 20;
let bkLast = { id: "", t: 0, s: "" },
  bkWarned = false;
async function wsBackup(data, force = false) {
  if (!invoke || !board.wsId || !board.nodes.length) return;
  const now = Date.now();
  if (!force && bkLast.id === board.wsId && now - bkLast.t < BK_EVERY) return;
  const sig = JSON.stringify({ ...JSON.parse(data), view: null, wsId: "" }); // mover la vista no cuenta como cambio
  if (bkLast.id !== board.wsId && !force) {
    // primer guardado de este espacio en esta sesión (p. ej. al abrir la app): solo fija el punto de partida, sin copia
    bkLast = { id: board.wsId, t: now, s: sig };
    return;
  }
  if (bkLast.id === board.wsId && bkLast.s === sig) return;
  const d = new Date(),
    p2 = (n) => String(n).padStart(2, "0"),
    stamp = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}_${p2(d.getHours())}-${p2(d.getMinutes())}-${p2(d.getSeconds())}`;
  try {
    await invoke("backup_board", { id: board.wsId, name: fileBase(), stamp, data, keep: BK_KEEP });
    bkLast = { id: board.wsId, t: now, s: sig };
    bkWarned = false;
  } catch (err) {
    if (!bkWarned) {
      bkWarned = true;
      toast("⚠ No se pudo guardar el respaldo: " + (err.message || err));
    }
  }
}
async function wsSync(data) {
  try {
    if (!board.wsId) return;
    wsUpsert(board.wsId, {
      name: (board.title || "").trim() || "Sin título",
      t: Date.now(),
      n: board.nodes.length,
      s: new Blob([data]).size, // peso de la copia guardada, en bytes
    });
    await WSDB.set("snap", board.wsId, data);
  } catch (err) {
    console.warn("espacios:", err);
  }
  wsBackup(data);
  wsAutoFile();
  fileDirtyRefresh();
}
// peso en KB (en MB a partir de 1024 KB)
const wsSize = (b) => {
  const kb = b / 1024;
  return kb >= 1024 ? (kb / 1024).toFixed(1) + " MB" : Math.max(1, Math.round(kb)) + " KB";
};
const wsAgo = (ts) => {
  const m = (Date.now() - ts) / 60000;
  if (m < 1) return t("ahora");
  if (m < 60) return t("hace {0} min", Math.floor(m));
  if (m < 1440) return t("hace {0} h", Math.floor(m / 60));
  return t("hace {0} d", Math.floor(m / 1440));
};
const wsCanPick = () => !!((TAURI && TAURI.dialog) || window.showOpenFilePicker);
const WSI = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  open: '<path d="M4 6a2 2 0 012-2h4l2 3h6a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2z"/>',
  link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  auto: '<path d="M20 12a8 8 0 11-2.6-5.9"/><path d="M20 4v5h-5"/>',
  save: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
  saveas: '<path d="M5 4h11l3 3v6"/><path d="M5 4v16h8"/><path d="M8 4v5h7V4"/><path d="M17 15v6M14 18h6"/>',
};
const wsSvg = (k) => `<svg class="ic" viewBox="0 0 24 24">${WSI[k]}</svg>`;
function renderWs() {
  const host = $("#wsList");
  host.innerHTML = "";
  const ix = wsIndex();
  {
    const ce = ix.find((x) => x.id === board.wsId) || {},
      ref = ce.file || ce.path,
      can = wsCanSave(),
      on = !!(ce.auto && can);
    wsAutoEl.classList.toggle("on", on);
    wsAutoEl.setAttribute("aria-pressed", on);
    wsAutoEl.disabled = !can;
    wsAutoEl.title = !can
      ? "Autoguardado en archivo: no disponible en este navegador (usa Chrome o Edge)"
      : on
        ? `Autoguardado activo: escribe en ${ref} cada vez que cambia algo (solo con al menos un nodo)`
        : ref
          ? `Autoguardado: escribe en ${ref} cada vez que cambia algo (solo con al menos un nodo)`
          : "Autoguardado: escribe en un archivo cada vez que cambia algo (solo con al menos un nodo). Se te pedirá elegirlo";
  }
  if (!ix.length) {
    host.innerHTML = '<div class="wsempty">Aún no hay espacios guardados.</div>';
    return;
  }
  ix.forEach((e) => {
    const cur = e.id === board.wsId,
      row = document.createElement("div");
    row.className = "wsrow" + (cur ? " cur" : "");
    row.dataset.id = e.id;
    const b = document.createElement("button");
    b.className = "btn wsent";
    b.dataset.act = "open";
    const nm = document.createElement("b");
    nm.textContent = cur ? (board.title || "").trim() || "Sin título" : e.name || "Sin título";
    const sm = document.createElement("small");
    const ref = e.file || e.path;
    sm.textContent =
      (cur ? t("Abierto ahora") : wsAgo(e.t)) +
      (e.n != null ? " · " + t("{0} nodos", e.n) : "") +
      (e.s != null ? " · " + wsSize(e.s) : "") +
      (ref ? ` · ${String(ref).split(/[\\/]/).pop()}` : "") +
      (e.lost ? " · " + t("archivo no encontrado") : "");
    if (e.lost) sm.className = "lost";
    b.append(nm, sm);
    row.appendChild(b);
    if ((ref || e.lost) && wsCanPick()) {
      const l = document.createElement("button");
      l.className = "xbtn";
      l.dataset.act = "relink";
      l.title = "Vincular de nuevo a un archivo";
      l.innerHTML = `<svg viewBox="0 0 24 24">${WSI.link}</svg>`;
      row.appendChild(l);
    }
    if (!cur) {
      const x = document.createElement("button");
      x.className = "xbtn";
      x.dataset.act = "remove";
      x.title = "Quitar de la lista";
      x.innerHTML = `<svg viewBox="0 0 24 24">${WSI.x}</svg>`;
      row.appendChild(x);
    }
    host.appendChild(row);
  });
}
// lee el archivo vinculado; devuelve {text, mtime} o {error}
async function wsReadFile(e) {
  try {
    if (e.path && TAURI && invoke) return { text: await invoke("read_file", { path: e.path }) };
    const h = await WSDB.get("h", e.id);
    if (!h) return { error: "sin referencia" };
    let p = await h.queryPermission({ mode: "read" });
    if (p !== "granted") p = await h.requestPermission({ mode: "read" });
    if (p !== "granted") return { denied: true };
    const f = await h.getFile();
    return { text: await f.text(), mtime: f.lastModified };
  } catch (err) {
    return { error: err };
  }
}
async function wsLoad(d, id) {
  // un espacio vacío y sin nombre que se abandona no se queda en recientes
  const prev = board.wsId,
    empty = prev && prev !== id && !board.nodes.length && !(board.title || "").trim() && !(wsIndex().find((x) => x.id === prev) || {}).file;
  d.wsId = id;
  loadBoard(d);
  await persist();
  if (empty) {
    try {
      localStorage.setItem("mindforge-ws", JSON.stringify(wsIndex().filter((x) => x.id !== prev)));
    } catch (_) {}
    WSDB.del("snap", prev).catch(() => {});
  }
}
async function openWs(id) {
  if (id === board.wsId) return;
  const e = wsIndex().find((x) => x.id === id);
  if (!e) return;
  await persist(); // el espacio actual queda guardado en recientes
  let data = null;
  const ref = e.file || e.path;
  if (ref) {
    const r = await wsReadFile(e);
    if (r.denied) {
      toast("Sin permiso para leer el archivo: se abre la copia de la app");
    } else if (r.error) {
      wsUpsert(id, { lost: true });
      const ok = await dialog(`No se encontró el archivo «${ref}» (puede que se haya borrado o movido de carpeta). ¿Abrir la última copia guardada en la app?`);
      if (!ok) return;
    } else {
      wsUpsert(id, { lost: false });
      if (r.mtime && r.mtime > e.t + 2000 && (await dialog(`El archivo «${ref}» es más reciente que la copia de la app. Aceptar: cargar el archivo · ✕: abrir la copia de la app.`)))
        data = r.text;
    }
  }
  if (!data) data = await WSDB.get("snap", id).catch(() => null);
  if (!data) {
    toast("⚠ No hay copia guardada de este espacio");
    return;
  }
  try {
    await wsLoad(JSON.parse(data), id);
    toast("Espacio abierto: " + (board.title || "Sin título"));
  } catch (err) {
    toast("⚠ " + err.message);
  }
}
// un archivo importado se abre siempre como espacio nuevo: nada de lo abierto se pierde
// espacio ya vinculado al mismo archivo (misma ruta en Tauri, mismo archivo en navegadores Chromium)
async function wsFindByFile(ref) {
  if (!ref) return null;
  for (const e of wsIndex()) {
    if (ref.path && e.path && e.path === ref.path) return e;
    if (ref.handle && !e.path && e.file) {
      try {
        const h = await WSDB.get("h", e.id);
        if (h && (await h.isSameEntry(ref.handle))) return e;
      } catch (_) {}
    }
  }
  return null;
}
async function adoptBoard(d, ref) {
  await persist();
  // un archivo que ya está vinculado a un espacio no crea otro: se abre ese mismo espacio con el contenido del archivo
  const ex = await wsFindByFile(ref);
  if (ex) {
    // si lo único distinto entre el archivo y el espacio abierto es el título (o la posición de la vista), no se pregunta:
    // el contenido es el mismo y se mantiene el título actual
    const strip = (o) => JSON.stringify({ ...o, title: "", wsId: "", view: null }),
      onlyTitle = ex.id === board.wsId && strip(d) === strip(board);
    if (onlyTitle) {
      d.title = board.title;
      d.view = board.view;
    }
    if (ex.id === board.wsId && !onlyTitle && !(await dialog("Este archivo ya está abierto en este espacio. ¿Volver a cargarlo desde el archivo? Se perderán los cambios que no hayas guardado en él."))) return false;
    if (ref.handle) await WSDB.set("h", ex.id, ref.handle).catch(() => {});
    wsUpsert(ex.id, { file: ref.name, path: ref.path || null, lost: false });
    await wsLoad(d, ex.id);
    return "same";
  }
  const id = newWsId();
  await wsLoad(d, id);
  if (ref) {
    try {
      if (ref.handle) await WSDB.set("h", id, ref.handle);
      wsUpsert(id, { file: ref.name, path: ref.path || null, lost: false });
    } catch (err) {
      console.warn(err);
    }
  }
}
async function newWs() {
  await persist();
  await wsLoad({ v: 5, nodes: [], edges: [] }, newWsId());
  titleIn.focus(); // el título es el nombre del espacio
  toast("Nuevo espacio");
}
async function relinkWs(id) {
  try {
    if (TAURI && TAURI.dialog) {
      const p = await TAURI.dialog.open({ multiple: false, filters: [{ name: "MindForge", extensions: ["json"] }] });
      if (!p) return;
      wsUpsert(id, { path: p, file: String(p).split(/[\\/]/).pop(), lost: false });
    } else {
      const [h] = await window.showOpenFilePicker({ types: [{ description: "MindForge", accept: { "application/json": [".json"] } }] });
      await WSDB.set("h", id, h);
      wsUpsert(id, { file: h.name, path: null, lost: false });
    }
    toast("Archivo vinculado ✓");
    renderWs();
  } catch (err) {
    if (err && err.name !== "AbortError") toast("⚠ " + (err.message || err));
  }
}
async function removeWs(id) {
  const e = wsIndex().find((x) => x.id === id);
  if (!e || id === board.wsId) return;
  if (!(await dialog(`¿Quitar «${e.name || "Sin título"}» de la lista? Se elimina su copia guardada en la app (el archivo en disco no se toca).`))) return;
  try {
    localStorage.setItem("mindforge-ws", JSON.stringify(wsIndex().filter((x) => x.id !== id)));
  } catch (_) {}
  WSDB.del("snap", id).catch(() => {});
  WSDB.del("h", id).catch(() => {});
  renderWs();
}
$("#wsList").addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-act]"),
    row = ev.target.closest(".wsrow");
  if (!b || !row) return;
  const id = row.dataset.id;
  if (b.dataset.act === "open") openWs(id);
  else if (b.dataset.act === "relink") relinkWs(id);
  else if (b.dataset.act === "remove") removeWs(id);
});
$("#wsNew").onclick = newWs;
$("#wsOpen").onclick = () => importFile();
$("#wsNew").innerHTML = wsSvg("plus") + "Nuevo espacio";
$("#wsOpen").innerHTML = wsSvg("open") + "Abrir archivo…";

/* ---- Guardar espacio en archivo / autoguardado ---- */
const wsCanSave = () => !!((TAURI && TAURI.dialog) || window.showSaveFilePicker);
const JSON_TYPES = [{ description: "MindForge", accept: { "application/json": [".json"] } }];
async function wsWriteHandle(h, data, ask) {
  let p = await h.queryPermission({ mode: "readwrite" });
  if (p !== "granted" && ask) p = await h.requestPermission({ mode: "readwrite" });
  if (p !== "granted") {
    const e = new Error("sin permiso de escritura");
    e.name = "PermError";
    throw e;
  }
  const w = await h.createWritable();
  await w.write(data);
  await w.close();
}
async function saveWs({ as = false } = {}) {
  const data = JSON.stringify(board, null, 2),
    id = board.wsId,
    e = wsIndex().find((x) => x.id === id) || {};
  try {
    if (TAURI && TAURI.dialog) {
      let p = !as && e.path;
      if (!p) p = await TAURI.dialog.save({ defaultPath: fileBase() + ".json", filters: [{ name: "MindForge", extensions: ["json"] }] });
      if (!p) return false;
      await invoke("write_file", { path: p, data });
      wsUpsert(id, { path: p, file: String(p).split(/[\\/]/).pop(), lost: false, t: Date.now() });
      wsBackup(JSON.stringify(board), true);
      toast("Guardado ✓");
      return true;
    }
    if (window.showSaveFilePicker) {
      let h = !as && (await WSDB.get("h", id).catch(() => null));
      if (h) {
        try {
          await wsWriteHandle(h, data, true);
          wsUpsert(id, { lost: false, t: Date.now() });
          toast("Guardado ✓ " + h.name);
          return true;
        } catch (err) {
          if (err.name === "PermError") {
            toast("Sin permiso para escribir en el archivo");
            return false;
          }
          wsUpsert(id, { lost: true });
          toast("El archivo vinculado ya no existe: elige dónde guardarlo");
        }
      }
      h = await window.showSaveFilePicker({ suggestedName: fileBase() + ".json", types: JSON_TYPES });
      await wsWriteHandle(h, data, true);
      try {
        await WSDB.set("h", id, h); // referencia para reabrir y para el autoguardado
        wsUpsert(id, { file: h.name, path: null, lost: false, t: Date.now() });
      } catch (_) {}
      toast("Guardado ✓ " + h.name);
      return true;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    a.download = fileBase() + ".json";
    a.click();
    toast("Descargado ✓");
    return true;
  } catch (err) {
    if (err && err.name === "AbortError") return false;
    toast("⚠ " + (err.message || err));
    return false;
  } finally {
    if ($("#dropWs").classList.contains("open")) renderWs();
  }
}
const exportFile = () => saveWs({ as: true });
// Autoguardado: escribe en el archivo vinculado en cada guardado automático, solo si hay al menos un nodo
let fwBusy = false,
  fwAgain = false,
  fwWarned = false;
async function wsAutoFile() {
  const e = wsIndex().find((x) => x.id === board.wsId);
  if (!e || !e.auto || !board.nodes.length) return;
  if (fwBusy) {
    fwAgain = true;
    return;
  }
  fwBusy = true;
  try {
    const data = JSON.stringify(board, null, 2);
    if (e.path && TAURI && invoke) await invoke("write_file", { path: e.path, data });
    else {
      const h = await WSDB.get("h", e.id);
      if (!h) throw new Error("el archivo ya no está vinculado");
      await wsWriteHandle(h, data, false);
    }
    wsUpsert(e.id, { t: Date.now(), lost: false });
    fwWarned = false;
  } catch (err) {
    if (!fwWarned) {
      fwWarned = true;
      toast(err.name === "PermError" ? "Autoguardado en archivo en pausa: pulsa Guardar en el menú de espacios para reactivarlo" : "⚠ Autoguardado en archivo: " + (err.message || err));
    }
  } finally {
    fwBusy = false;
    if (fwAgain) {
      fwAgain = false;
      wsAutoFile();
    }
  }
}
async function wsCheckAuto() {
  const e = wsIndex().find((x) => x.id === board.wsId);
  if (!e || !e.auto || (TAURI && e.path)) return;
  try {
    const h = await WSDB.get("h", e.id);
    if (!h || (await h.queryPermission({ mode: "readwrite" })) !== "granted")
      toast("Autoguardado en archivo en pausa: pulsa Guardar en el menú de espacios para reactivarlo");
  } catch (_) {}
}
async function setWsAuto(on) {
  const id = board.wsId,
    e = wsIndex().find((x) => x.id === id) || {};
  if (!on) {
    wsUpsert(id, { auto: false });
    renderWs();
    return;
  }
  if (!wsCanSave()) {
    toast("Tu navegador no puede escribir archivos: usa Chrome o Edge");
    return;
  }
  if (!(e.file || e.path) || e.lost) {
    if (!(await saveWs({ as: true }))) return; // hace falta un archivo donde escribir
  } else if (!(TAURI && e.path)) {
    try {
      const h = await WSDB.get("h", id);
      if (!h) throw 0;
      if ((await h.queryPermission({ mode: "readwrite" })) !== "granted" && (await h.requestPermission({ mode: "readwrite" })) !== "granted") {
        toast("Sin permiso para escribir en el archivo");
        return;
      }
    } catch (_) {
      if (!(await saveWs({ as: true }))) return;
    }
  }
  wsUpsert(id, { auto: true });
  fwWarned = false;
  renderWs();
  toast(board.nodes.length ? "Autoguardado activado" : "Autoguardado activado: empezará cuando haya al menos un nodo");
  wsAutoFile();
}
$("#wsSave").innerHTML = wsSvg("save") + 'Guardar<span class="wskbd">Ctrl+S</span>';
$("#wsSaveAs").innerHTML = wsSvg("saveas") + "Guardar como…";
$("#wsSave").onclick = () => saveWs();
$("#wsSaveAs").onclick = () => saveWs({ as: true });
const wsAutoEl = $("#wsAuto");
wsAutoEl.innerHTML = wsSvg("auto") + "Autoguardado";
wsAutoEl.addEventListener("click", () => setWsAuto(!wsAutoEl.classList.contains("on")));
async function importFile() {
  try {
    if (TAURI && TAURI.dialog) {
      const p = await TAURI.dialog.open({
        multiple: false,
        filters: [{ name: "MindForge", extensions: ["json"] }],
      });
      if (p) {
        const r = await adoptBoard(JSON.parse(await invoke("read_file", { path: p })), { path: p, name: String(p).split(/[\\/]/).pop() });
        if (r !== false) toast(r === "same" ? "Archivo ya vinculado: se abrió su espacio" : "Importado ✓");
      }
    } else if (window.showOpenFilePicker) {
      const [h] = await window.showOpenFilePicker({
        types: [{ description: "MindForge", accept: { "application/json": [".json"] } }],
      });
      const f = await h.getFile();
      const r = await adoptBoard(JSON.parse(await f.text()), { handle: h, name: f.name });
      if (r !== false) toast(r === "same" ? "Archivo ya vinculado: se abrió su espacio" : "Importado ✓");
    } else $("#fileIn").click();
  } catch (e) {
    if (e && e.name === "AbortError") return;
    if (e && e.name === "SecurityError") return $("#fileIn").click();
    toast("⚠ " + (e.message || e));
  }
}
$("#fileIn").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    await adoptBoard(JSON.parse(await f.text()), null);
    toast("Importado ✓");
  } catch (err) {
    toast("⚠ " + err.message);
  }
  e.target.value = "";
});

/* ---- Aviso al cerrar con cambios sin guardar en el archivo vinculado ----
   Solo si el espacio tiene archivo (.json) y el autoguardado está apagado. Se lee el archivo y se compara su contenido con el
   tablero actual (se ignoran el título y la posición de la vista, igual que al reabrir un archivo ya vinculado). */
async function fileUnsaved() {
  const e = wsIndex().find((x) => x.id === board.wsId);
  if (!e || e.auto || e.lost || !(e.path || e.file)) return false;
  try {
    let txt;
    if (TAURI && e.path && invoke) txt = await invoke("read_file", { path: e.path });
    else {
      const h = await WSDB.get("h", e.id);
      if (!h || (await h.queryPermission({ mode: "read" })) !== "granted") return false; // no se puede comprobar: no molestar
      txt = await (await h.getFile()).text();
    }
    const strip = (o) => JSON.stringify({ ...o, title: "", wsId: "", view: null });
    return strip(JSON.parse(txt)) !== strip(board);
  } catch (_) {
    return false;
  }
}
let fileDirty = false;
async function fileDirtyRefresh() {
  fileDirty = await fileUnsaved();
}
// true = se puede cerrar
async function closeGuard() {
  if (!(await fileUnsaved())) return true;
  const r = await dialog("Hay cambios que no están guardados en el archivo vinculado. La app los conserva, pero el archivo .json se quedará sin ellos. ¿Guardarlos en el archivo antes de salir?", { yes: "Guardar y salir", alt: "Salir sin guardar en el archivo" });
  if (r === true) return await saveWs();
  return r === "alt";
}
window.addEventListener("beforeunload", (e) => {
  if (TAURI || !fileDirty) return; // en la app de escritorio se usa onCloseRequested
  e.preventDefault();
  e.returnValue = "";
});
try {
  const w = TAURI && TAURI.window && TAURI.window.getCurrentWindow && TAURI.window.getCurrentWindow();
  if (w && w.onCloseRequested)
    w.onCloseRequested(async (ev) => {
      await persist().catch(() => {});
      if (!(await closeGuard())) ev.preventDefault();
    });
} catch (err) {
  console.warn("cierre:", err);
}
