pub mod api_manager;

use anyhow::Result;
use api_manager::APIManager;
use std::{
    path::PathBuf,
    sync::{Mutex, OnceLock},
};
use tauri::{AppHandle, Manager, Window, WindowEvent};

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
fn greet(name: &str) -> String {
    let custom_state = app_handle().state::<CustomState>();

    format!(
        "Hello, {}! You've been greeted from Rust!\nvolume_dir:{:?}",
        name, custom_state.volume_dir
    )
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(move |app| {
            println!("in setup!!!");

            // let am: State<APIManagerState> = app.state();
            let am = app.state::<CustomState>();
            am.abc
                .api_manager_mutex
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
    println!("Just set APP_HANDLE");

    let app_handle = app_handle();

    let website_dir = app_handle
        .path()
        .resolve("resources/standalone", tauri::path::BaseDirectory::Resource)
        .unwrap();

    let api_manager = APIManager::new(app_handle, website_dir);
    let ams = APIManagerState {
        api_manager_mutex: Mutex::new(api_manager),
    };

    let volume_dir = get_volume_dir().unwrap();
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

// Can see about only including this fn for dev. Right now have to include for
// both dev and build.
fn get_root_dir() -> Result<PathBuf, std::io::Error> {
    use std::io::Error;
    use std::io::ErrorKind::NotFound;

    let mut current_dir = std::fs::canonicalize(std::env::current_dir()?)?;
    println!("current_dir is: {:?}", current_dir);

    loop {
        let git_dir = current_dir.join(".git");

        let exists = git_dir.try_exists()?;

        if exists {
            return Ok(current_dir);
        } else {
            match current_dir.parent() {
                Some(x) => {
                    current_dir = x.to_path_buf();
                }
                None => {
                    return Err(Error::new(NotFound, "Failed to find root dir"));
                }
            }
        }
    }
}

fn get_volume_dir() -> Result<PathBuf> {
    let root_dir;
    if cfg!(dev) {
        root_dir = get_root_dir()?;
    } else {
        // For windows this is <user>/AppData/Roaming/<bundleIdentifier in
        // tauri.conf.json like com.tauri-app.app>. VSCode has around 2 GB here
        // for me, so we should be fine from a size perspective. -isaac
        root_dir = app_handle().path().app_data_dir()?;
    }

    Ok(root_dir.join("volume"))
}
