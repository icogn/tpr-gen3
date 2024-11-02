use anyhow::Result;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

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

pub fn get_volume_dir(app_handle: &AppHandle) -> Result<PathBuf> {
    let root_dir;
    if cfg!(dev) {
        root_dir = get_root_dir()?;
    } else {
        // For windows this is <user>/AppData/Roaming/<bundleIdentifier in
        // tauri.conf.json like com.tauri-app.app>. VSCode has around 2 GB here
        // for me, so we should be fine from a size perspective. -isaac
        root_dir = app_handle.path().app_data_dir()?;
    }

    Ok(root_dir.join("volume"))
}

pub fn get_branch_root_dir(app_handle: &AppHandle, branch_name: &str) -> Result<PathBuf> {
    if branch_name == "stable" {
        let dir = app_handle
            .path()
            .resolve("resources/standalone", tauri::path::BaseDirectory::Resource)?;
        Ok(dir)
    } else {
        let volume_dir = get_volume_dir(app_handle)?;
        Ok(volume_dir.join("branches").join(branch_name))
    }
}

pub fn get_branch_volume_dir(app_handle: &AppHandle, branch_name: &str) -> Result<PathBuf> {
    let volume_dir = get_volume_dir(app_handle)?;

    Ok(volume_dir.join("branch_app_data").join(branch_name))
}
