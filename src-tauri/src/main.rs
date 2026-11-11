#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{fs, path::PathBuf};
use tauri::Manager;
use tauri_plugin_opener::OpenerExt;

/// Ruta del autoguardado: carpeta de datos de la app del sistema
/// (Windows: %APPDATA%\com.mindforge.app, macOS: ~/Library/Application Support, Linux: ~/.local/share)
fn board_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("board.json"))
}

#[tauri::command]
fn save_board(app: tauri::AppHandle, data: String) -> Result<(), String> {
    fs::write(board_path(&app)?, data).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_board(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let p = board_path(&app)?;
    if p.exists() {
        fs::read_to_string(p).map(Some).map_err(|e| e.to_string())
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn write_file(path: String, data: String) -> Result<(), String> {
    fs::write(path, data).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_bytes(path: String, data: Vec<u8>) -> Result<(), String> {
    fs::write(path, data).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| e.to_string())
}

/// Carpeta de respaldos: `backups` dentro de la carpeta de datos de la app (Windows: %APPDATA%\com.mindforge.app\backups).
/// Está fuera de la carpeta de instalación, así que sobrevive a actualizar o desinstalar el programa.
fn backups_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let p = app.path().app_data_dir().map_err(|e| e.to_string())?.join("backups");
    fs::create_dir_all(&p).map_err(|e| e.to_string())?;
    // versiones anteriores guardaban los respaldos junto al ejecutable: se traen una sola vez (best-effort)
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            migrate_legacy_backups(&dir.join("backups"), &p);
        }
    }
    Ok(p)
}

/// Mueve las carpetas de respaldo de `old` a `new` (las que ya existan en `new` se dejan como están). Nunca falla:
/// si algo no se puede mover, el respaldo antiguo se queda donde estaba.
fn migrate_legacy_backups(old: &std::path::Path, new: &std::path::Path) {
    if old == new || !old.is_dir() {
        return;
    }
    if let Ok(rd) = fs::read_dir(old) {
        for e in rd.filter_map(|e| e.ok()) {
            let dst = new.join(e.file_name());
            if !dst.exists() {
                let _ = fs::rename(e.path(), dst);
            }
        }
    }
    let _ = fs::remove_dir(old); // solo si ha quedado vacía
}

/// Deja solo letras, cifras, `-` y `_` (para usarlo como nombre de carpeta o de archivo)
fn clean_name(s: &str, max: usize) -> String {
    s.chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_' || *c == ' ')
        .take(max)
        .collect::<String>()
        .trim()
        .to_string()
}

/// Escribe un respaldo `<root>/<id>/<marca>_<nombre>.json` y conserva solo los `keep` más recientes de ese espacio
fn backup_into(root: &std::path::Path, id: &str, name: &str, stamp: &str, data: &str, keep: usize) -> Result<PathBuf, String> {
    let dir = root.join(clean_name(id, 40));
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let nm = clean_name(name, 60);
    let file = format!("{}_{}.json", clean_name(stamp, 30), if nm.is_empty() { "esquema".to_string() } else { nm });
    fs::write(dir.join(file), data).map_err(|e| e.to_string())?;
    let mut all: Vec<String> = fs::read_dir(&dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .map(|e| e.file_name().to_string_lossy().to_string())
        .filter(|n| n.ends_with(".json"))
        .collect();
    all.sort(); // la marca de fecha va primero: orden alfabético = orden cronológico
    while all.len() > keep.max(1) {
        let _ = fs::remove_file(dir.join(all.remove(0)));
    }
    Ok(dir)
}

/// Respaldo de un espacio de trabajo en la carpeta `backups`. Devuelve la carpeta donde se guardó
#[tauri::command]
fn backup_board(app: tauri::AppHandle, id: String, name: String, stamp: String, data: String, keep: usize) -> Result<String, String> {
    let root = backups_root(&app)?;
    backup_into(&root, &id, &name, &stamp, &data, keep).map(|p| p.to_string_lossy().to_string())
}

/// Abre un enlace http(s) en el navegador predeterminado
#[tauri::command]
fn open_url(app: tauri::AppHandle, url: String) -> Result<(), String> {
    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return Err("URL no válida".into());
    }
    app.opener().open_url(url, None::<&str>).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            save_board, load_board, write_file, read_file, write_bytes, open_url, backup_board
        ])
        .run(tauri::generate_context!())
        .expect("error al iniciar MindForge");
}
