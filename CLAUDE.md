# MindForge — instrucciones para Claude (léelas SIEMPRE al empezar una sesión)

Editor de diagramas/mapas mentales de escritorio: Tauri v2 + Rust; frontend en JS/CSS/HTML sin framework (scripts clásicos
en ámbito global, orden `00…35` en `src/js`). El usuario habla español: responde en español. Mapa del código en
`docs/GUIA-DESARROLLO.md`; funcionamiento en `docs/DOCUMENTACION-TECNICA.md`.

## Checklist OBLIGATORIA en cada sesión

Antes de dar nada por terminado, marca cada punto (usa la lista de tareas y no cierres la sesión con alguno pendiente):

1. **Tests**: toda función nueva, cambio de comportamiento o bug corregido lleva su test en `tests/*.test.js`
   (reutiliza `tests/helpers.js`: `launch({tauri, ui, root})`). Si un test antiguo deja de ser cierto, se actualiza, no se borra.
   Ejecuta `npm test` (aquí: `NODE_PATH=/opt/npm-tools/node_modules node --test --test-concurrency=1 tests/*.test.js`) y
   que pase **entero** y sin `pageerror`.
2. **README** (`README.md`): actualizar con todo lo nuevo, siempre (petición permanente del usuario). Sin secciones de «changelog».
3. **Docs**: `docs/DOCUMENTACION-TECNICA.md` (cómo funciona), `docs/GUIA-DESARROLLO.md` (mapa mecánica→código, recetas,
   checklist) y `MANUAL-JERARQUIA-Y-GRUPOS.md` si se toca jerarquía, grupos o plegado.
4. **Idiomas**: texto de interfaz en español como clave + entrada en `EN` (o `EN_PAT`) de `js/00-i18n.js`; usar `t()` en
   textos generados por JS; `title`/`aria-label` también; revisar con `lang: "en"` que no queda español. Panel de ayuda
   (`data-i18n-html`): la clave es el HTML exacto.
5. **Ayuda y atajos**: si hay botón/atajo/menú nuevo, reflejarlo en el panel de ayuda del `index.html` y en sus iconos
   (`js/35-icons-help-touch.js`).
6. **Documentos antiguos**: campos nuevos opcionales y `loadBoard`/import los toleran; `board.avoid`-style: los ajustes que
   no van al historial se guardan con `scheduleSave()`, no con `commit()`.
7. **Sin errores de consola** en ES y EN; estilo de menús/diálogos flotantes coherente (último bloque de `css/12-wheel.css`).
8. **Sincronizar con el equipo del usuario** (ver abajo) y verificar con `cmp`.
9. **Informar con honestidad** de lo que NO se pudo probar.

## Reglas del proyecto

- No cambies la etiqueta de versión «RubiEdition V1.0.0» (ayuda) salvo en una versión de lanzamiento.
- Rust y la app Tauri real **no se pueden compilar aquí**: valida solo con `rustfmt`, un crate de prueba aparte para la lógica
  pura y el mock de Tauri de los tests; di claramente que hay que recompilar (`npm run build`) y que no se probó en la app real.
- Permisos nuevos del webview → `src-tauri/capabilities/default.json`. Comandos nuevos → `main.rs` + `invoke_handler`.
- Las fuentes locales se generan con `npm run fonts` (necesita internet; el sandbox no tiene). No se pueden descargar aquí.
- No añadas dependencias sin necesidad; el frontend no usa bundler.
- Al cambiar el tamaño/aspecto de los botones del lienzo, mantén los dos bloques separados por `.fabsep` (ver §2.1 técnica).

## Sincronización con el equipo del usuario (puente de dispositivo)

Carpeta del usuario: `C:\Users\firoh\Desktop\mindforge` (frontend `src\`, Rust `src-tauri\`, docs `docs\`). Copia de trabajo:
`/home/claude/proj`. Tras cambiar archivos:

1. Antes de **editar** un archivo que solo está en el equipo (p. ej. `main.rs`), tráelo con `device_stage_files` y trabaja sobre esa copia.
2. Antes de sobrescribir README/docs, compara con la versión del equipo (puede tener cambios del usuario).
3. `device_stage_files` del destino para obtener su `mtimeMs`; luego `device_commit_files` con `expectedMtimeMs`.
4. Verifica: vuelve a traer el archivo y compáralo con `cmp`. Si devuelve contenido antiguo, repite el commit con el nuevo `mtimeMs`.
5. Los archivos nuevos (tests, scripts, CLAUDE.md) se crean con commit sin `expectedMtimeMs`.
6. Tras `npm install` en el equipo: `npx playwright install chromium` (una vez) y `npm test`.
