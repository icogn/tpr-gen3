use std::sync::LazyLock;

use serde::Deserialize;
use serde_json::Error;

static BUILD_VARS_JSON: &str = std::include_str!("./build_vars.json");

pub struct Vars {
    pub central_name: &'static str,
}

#[derive(Deserialize)]
struct BuildVarsJson<'a> {
    central_name: Option<&'a str>,
}

pub static VARS: LazyLock<Vars> = LazyLock::new(|| {
    let mut out = Vars {
        central_name: "stable",
    };

    let res: Result<BuildVarsJson, Error> = serde_json::from_str(BUILD_VARS_JSON);
    if let Ok(root) = res {
        if let Some(x) = root.central_name {
            out.central_name = x;
        }
    }
    out
});
