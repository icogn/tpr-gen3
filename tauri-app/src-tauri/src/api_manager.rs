use std::borrow::BorrowMut;
use std::process::{Child, Command};
use tauri::AppHandle;
// use tauri::api::process::Command as TCommand;
// use tauri_plugin_shell::process::Command as TCommand;
use tauri_plugin_shell::ShellExt;

use crate::path;

// Very good guide at: https://github.com/tauri-apps/tauri/discussions/3273#discussioncomment-5610385

pub struct APIManager {
    cmd: Command,
    child: Option<Child>,
    // api_process: Option<GroupChild>,
}

fn build_cmd(app_handle: &AppHandle, branch_name: &str) -> Command {
    let branch_root_dir = path::branch_root_dir(app_handle, branch_name).unwrap();
    let branch_volume_dir = path::branch_volume_dir(app_handle, branch_name).unwrap();

    // Ensure branch_volume_dir exists
    std::fs::create_dir_all(&branch_volume_dir).unwrap_or_else(|_| {
        panic!(
            "create_dir_all failed for branch_volume_dir: {:?}",
            branch_volume_dir
        );
    });

    // TODO: read the package.json from the website's root folder in order to
    // find the command property. This is what we pass to "args", rather than
    // hardcoding it.

    let tt = app_handle
        .shell()
        .sidecar("node_v20_17_0")
        .unwrap()
        .env("HOSTNAME", "127.0.0.1")
        .env("VOLUME_DIR", branch_volume_dir)
        .args(["website/server.js"])
        .current_dir(branch_root_dir);
    tt.into()
}

impl APIManager {
    pub fn new(app_handle: &AppHandle, branch_name: &str) -> APIManager {
        let cmd = build_cmd(app_handle, branch_name);

        APIManager { cmd, child: None }
    }

    // pub fn replace_cmd(&mut self, app_handle: &AppHandle, path_buf: PathBuf) {
    //     // terminate the backend (this sets child to None)

    //     self.cmd = Some(tt.into());
    // }

    pub fn start_backend(&mut self) -> Result<String, String> {
        match self.child.borrow_mut() {
            Some(_) => {
                let info = "The API service subprocess is not empty and will not be created again.";
                println!("{}", &info);
                Ok(info.into())
            }
            None => {
                let child = self.cmd.spawn();
                match child {
                    Ok(v) => {
                        self.child = Some(v);
                        let info = "api start successful";
                        println!("{}", &info);
                        Ok(info.into())
                    }
                    Err(_) => {
                        let info = "api start failed";
                        println!("{}", &info);
                        Err(info.into())
                    }
                }
            }
        }
    }

    pub fn terminate_backend(&mut self) -> Result<String, String> {
        match self.child.borrow_mut() {
            Some(child) => {
                // child.wait().expect("Some error happened when killing child process");
                child
                    .kill()
                    .expect("Some error happened when killing child process");
                self.child = None;
                let info = "Kill already existed child process then set it to None";
                println!("{}", &info);
                Ok(info.into())
            }
            _ => {
                let info = "API子进程当前不存在，无须操作";
                println!("{}", &info);
                Ok(info.into())
            }
        }
    }

    pub fn restart_backend(&mut self) -> Result<String, String> {
        let terminate_result = self.terminate_backend();
        match terminate_result {
            Ok(_) => {
                println!("已执行API终止动作");
                match self.start_backend() {
                    Ok(_) => {
                        let info = "重启API服务器成功";
                        println!("{}", &info);
                        Ok(info.into())
                    }
                    Err(e) => {
                        println!("{}", &e);
                        return Err(e.into());
                    }
                }
            }
            Err(e) => {
                println!("{}", &e);
                return Err(e);
            }
        }
    }
}
