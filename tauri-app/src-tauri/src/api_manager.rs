use std::borrow::BorrowMut;
use std::path::PathBuf;
use std::process::{Child, Command};
use tauri::AppHandle;
// use tauri::api::process::Command as TCommand;
// use tauri_plugin_shell::process::Command as TCommand;
use tauri_plugin_shell::ShellExt;

// Very good guide at: https://github.com/tauri-apps/tauri/discussions/3273#discussioncomment-5610385

pub struct APIManager {
    cmd: Command,
    child: Option<Child>,
    // api_process: Option<GroupChild>,
}

impl APIManager {
    pub fn new(app_handle: &AppHandle, path_buf: PathBuf) -> APIManager {
        let tt = app_handle
            .shell()
            .sidecar("node_v20_17_0")
            .unwrap()
            .env("HOSTNAME", "127.0.0.1")
            .args(["website/server.js"])
            .current_dir(path_buf);

        // let t = TCommand::new_sidecar("node_v20_17_0").expect("启动API服务器失败");
        // let tt = TCommand::new("./windx_api/windx_api");
        // let cmd_from_sidecar: Command = t.into();
        APIManager {
            cmd: tt.into(),
            child: None,
            // api_process: None,
        }
    }

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
