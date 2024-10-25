pub mod api_manager;

use api_manager::APIManager;
use std::sync::{Mutex, OnceLock};
use tauri::{AppHandle, Manager, State, Window, WindowEvent};

struct APIManagerState {
    api_manager_mutex: Mutex<APIManager>,
}

// From: https://github.com/tauri-apps/tauri/discussions/6309#discussioncomment-10295527
static APP_HANDLE: OnceLock<AppHandle> = OnceLock::new();

fn app_handle<'a>() -> &'a AppHandle {
    APP_HANDLE.get().unwrap()
}

// // Enjoy:
// fn foo() {
//   let app_handle = app_handle();
// }

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(move |app| {
            let am: State<APIManagerState> = app.state();
            am.api_manager_mutex
                .lock()
                .unwrap()
                .start_backend()
                .expect("backend start failed");
            Ok(())
        })
        .on_window_event(on_window_event)
        .invoke_handler(tauri::generate_handler![greet])
        .build(tauri::generate_context!())
        .unwrap();

    APP_HANDLE.set(app.app_handle().to_owned()).unwrap();

    let app_handle = app_handle();

    let website_dir = app_handle
        .path()
        .resolve("resources/standalone", tauri::path::BaseDirectory::Resource)
        .unwrap();

    let api_manager = APIManager::new(app_handle, website_dir);
    let ams = APIManagerState {
        api_manager_mutex: Mutex::new(api_manager),
    };

    app_handle.manage(ams);

    // let sidecar_command = app_handle.shell().sidecar("node_v20_17_0").unwrap();

    // let mut command = StdCommand::from(sidecar_command);

    // let (mut rx, mut _child) = sidecar_command
    //     .args(["server.js"])
    //     .current_dir(website_dir)
    //     .spawn()
    //     .expect("failed to spawn sidecar");

    app.run(|_, _| {});
}

fn on_window_event(window: &Window, event: &WindowEvent) {
    match &event {
        WindowEvent::Destroyed => {
            let am: State<APIManagerState> = window.state();
            am.api_manager_mutex
                .lock()
                .unwrap()
                .terminate_backend()
                .expect("");
        }
        _ => {}
    }
}
