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

#[derive(Serialize, Deserialize, Clone)]
pub struct AssetInfo {
    pub branches: HashMap<String, AssetInfoBranch>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AssetInfoBranch {
    pub version: String,
    pub site_zips: HashMap<String, AssetInfoSiteZip>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct AssetInfoSiteZip {
    pub asset_id: u64,
    pub signature: String,
}
