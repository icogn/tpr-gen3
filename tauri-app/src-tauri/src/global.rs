use std::sync::OnceLock;

use serde::Deserialize;
use serde_json::Error;
use tauri::AppHandle;

use crate::path;

static BUILD_VARS_JSON: &str = std::include_str!("./build_vars.json");

const TARGET: &str = env!("TARGET");

#[derive(Debug)]
pub struct Vars {
    pub db_url: &'static str,
    pub user_repo: &'static str,
    pub central_name: &'static str,
    pub target: &'static str,
}

#[derive(Deserialize)]
struct BuildVarsJson<'a> {
    user_repo: Option<&'a str>,
    central_name: Option<&'a str>,
}

static VARS: OnceLock<Vars> = OnceLock::new();

pub fn vars<'a>() -> &'a Vars {
    VARS.get().expect("Failed to get VARS")
}

// pub static VARS: LazyLock<Vars> = LazyLock::new(|| {
//     let mut out = Vars {
//         user_repo: "icogn/tpr-gen3",
//         central_name: "stable",
//     };

//     let res: Result<BuildVarsJson, Error> = serde_json::from_str(BUILD_VARS_JSON);
//     if let Ok(root) = res {
//         if let Some(x) = root.user_repo {
//             out.user_repo = x;
//         }
//         if let Some(x) = root.central_name {
//             out.central_name = x;
//         }
//     }
//     out
// });

pub fn init<'a>(app_handle: &'a AppHandle) {
    if let Some(_) = VARS.get() {
        // Already initialized
        return;
    }

    // Calculate core.db path
    let volume_dir =
        path::volume_dir(app_handle).expect("Failed to find volume_dir during global init.");
    let db_url = volume_dir
        .join("core.db")
        .into_os_string()
        .into_string()
        .expect("Failed to convert db PathBuf to String");
    let db_url_ref = Box::leak(db_url.into_boxed_str());

    let mut out = Vars {
        db_url: db_url_ref,
        user_repo: "icogn/tpr-gen3",
        central_name: "stable",
        target: &TARGET,
    };

    let res: Result<BuildVarsJson, Error> = serde_json::from_str(BUILD_VARS_JSON);
    if let Ok(root) = res {
        if let Some(x) = root.user_repo {
            out.user_repo = x;
        }
        if let Some(x) = root.central_name {
            out.central_name = x;
        }
    }

    VARS.set(out).expect("Failed to set VARS");
}
