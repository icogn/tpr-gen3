pub mod api_manager;
pub mod path;

use api_manager::APIManager;
use std::{
    path::PathBuf,
    sync::{Mutex, OnceLock},
};
use tauri::{AppHandle, Manager, Window, WindowEvent};

// the payload type must implement `Serialize` and `Clone`.
#[derive(Clone, serde::Serialize)]
struct Payload {
    message: String,
    port: u16,
}

struct APIManagerState {
    api_manager_mutex: Mutex<APIManager>,
}

struct CustomState {
    abc: APIManagerState,
    volume_dir: PathBuf,
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
fn greet(name: &str) -> Payload {
    let custom_state = app_handle().state::<CustomState>();

    let a = custom_state.abc.api_manager_mutex.lock().unwrap();

    Payload {
        port: a.port,
        message: format!(
            "Hello, {}! You've been greeted from Rust!\nvolume_dir:{:?}\nport:{}",
            name, custom_state.volume_dir, a.port
        ),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(move |app| {
            println!("in setup!!!");

            if get_do_sidecar() {
                // let am: State<APIManagerState> = app.state();
                let am = app.state::<CustomState>();
                am.abc
                    .api_manager_mutex
                    .lock()
                    .unwrap()
                    .start_backend()
                    .expect("backend start failed");
            }

            Ok(())
        })
        .on_window_event(on_window_event)
        .invoke_handler(tauri::generate_handler![greet])
        .build(tauri::generate_context!())
        .unwrap();

    APP_HANDLE.set(app.app_handle().to_owned()).unwrap();
    println!("Just set APP_HANDLE");

    let app_handle = app_handle();

    // TODO: handle swapping between branches.

    // TODO: default_branch should come from the database.
    let api_manager = APIManager::new(app_handle, "stable");
    let ams = APIManagerState {
        api_manager_mutex: Mutex::new(api_manager),
    };

    let volume_dir = path::volume_dir(app_handle).unwrap();
    println!("volume_dir:{:?}", volume_dir);

    let custom_state = CustomState {
        abc: ams,
        volume_dir,
    };

    // app_handle.manage(ams);
    app_handle.manage(custom_state);

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
            let am = window.state::<CustomState>();
            am.abc
                .api_manager_mutex
                .lock()
                .unwrap()
                .terminate_backend()
                .expect("Terminate backend on WindowEvent::Destroyed was not successful");
        }
        _ => {}
    }
}

fn get_do_sidecar() -> bool {
    if let Ok(val) = std::env::var("SIDECAR") {
        println!("SIDECAR val is {}", val);
        if val == "false" {
            return false;
        }
    } else {
        println!("Did not find val for SIDECAR; default is true");
    }
    true
}
