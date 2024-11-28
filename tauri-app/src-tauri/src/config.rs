use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConfigBranch {
    pub name: String,
    pub owner: String,
    pub repo: String,
    pub public_key: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConfigCentral {
    pub release_tag: String,
    pub branches: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Config {
    pub branches: HashMap<String, ConfigBranch>,
    pub central: HashMap<String, ConfigCentral>,
}
