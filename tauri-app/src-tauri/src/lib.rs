pub mod api_manager;
pub mod global;
pub mod path;
pub mod query;

use anyhow::Result;
use api_manager::APIManager;
use deduplicate::{Deduplicate, DeduplicateFuture};
use query::ReqMgr;
use std::{
    path::PathBuf,
    sync::{Arc, Mutex, OnceLock},
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
    req_mgr: ReqMgr,
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

#[tauri::command]
async fn get_config() -> String {
    let custom_state = app_handle().state::<CustomState>();

    let a = custom_state.req_mgr.get_fn4.get(10).await;
    let opt = match a {
        Ok(x) => x,
        Err(_) => {
            return "Err".into();
        }
    };

    if let Some(x) = opt {
        println!("{}", x);
        x
    } else {
        "None".into()
    }
}

async fn do_sth(
    with: Arc<
        Deduplicate<
            Box<dyn Fn(usize) -> DeduplicateFuture<String> + Send + Sync + 'static>,
            usize,
            String,
        >,
    >,
    key: usize,
) -> Result<()> {
    let str = with.get(key).await?;
    let start = std::time::SystemTime::now();
    println!(
        "@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@await finished, time: {:?}",
        start
    );
    if let Some(s) = str {
        println!("{}", s);
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    println!("central_name is ''{}''", global::VARS.central_name);

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
        .invoke_handler(tauri::generate_handler![greet, get_config])
        .build(tauri::generate_context!())
        .unwrap();

    APP_HANDLE.set(app.app_handle().to_owned()).unwrap();
    println!("Just set APP_HANDLE");

    let app_handle = app_handle();

    // TODO: handle swapping between branches. Should have info stored in the DB
    // which corresponds to what we have locally so this info is available
    // immediately (and also if we are truly offline). Then we also want to
    // fetch data from the github repo in order to determine which ones have
    // updates. We will need a bunch of github API calls from rust already, so
    // probably actually easier to handle everything on that side (even the
    // basic call to update our list of branches that we can swap to). We can
    // send the intent to the backend which will actually do the download,
    // verification, and branch swap.

    // 'Update available' part for each branch should be derived. We can just
    // store current_version and latest_version.

    // TODO: default_branch should come from the database.
    let api_manager = APIManager::new(app_handle, "stable");
    let ams = APIManagerState {
        api_manager_mutex: Mutex::new(api_manager),
    };

    let volume_dir = path::volume_dir(app_handle).unwrap();
    println!("volume_dir:{:?}", volume_dir);

    let a = query::ReqMgr::new();

    let start = std::time::SystemTime::now();
    let since_the_epoch = start
        .duration_since(std::time::UNIX_EPOCH)
        .expect("Time went backwards");
    println!("Time: {:?}", since_the_epoch);

    let me = Arc::clone(&a.get_fn4);
    // tauri::async_runtime::spawn(do_sth(a.get_fn4));
    tauri::async_runtime::spawn(do_sth(me, 10));
    let me2 = Arc::clone(&a.get_fn4);
    tauri::async_runtime::spawn(do_sth(me2, 10));

    let custom_state = CustomState {
        abc: ams,
        volume_dir,
        req_mgr: a,
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
