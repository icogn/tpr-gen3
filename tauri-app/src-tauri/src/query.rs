use deduplicate::Deduplicate;
use deduplicate::DeduplicateFuture;
use reqwest::Response;
use serde::de::DeserializeOwned;
use serde::Serialize;
use simple_error::SimpleError;
use std::any::Any;
use std::any::TypeId;
use std::collections::HashMap;
use std::sync::Arc;
use std::sync::LazyLock;
use std::sync::Mutex;

use crate::config::AssetInfo;
use crate::config::Config;
use crate::global;

static CACHE: LazyLock<Mutex<Cache>> = LazyLock::new(|| Mutex::new(Cache::new()));

#[derive(Serialize, Clone)]
struct PossibleBranch {
    branch_name: String,
    version: String,
    display_name: String,
}

struct Cache {
    map: HashMap<TypeId, Box<dyn Any + Send>>,
}

impl Cache {
    fn new() -> Self {
        Cache {
            map: HashMap::new(),
        }
    }

    fn clone_val<T: Clone + 'static>(&self) -> Option<T> {
        let type_id = TypeId::of::<T>();
        self.map
            .get(&type_id)
            .and_then(|a| a.downcast_ref::<T>())
            .and_then(|b| Some((*b).clone()))
    }

    fn insert<T>(&mut self, value: T)
    where
        T: Send + 'static,
    {
        let type_id = TypeId::of::<T>();
        self.map.insert(type_id, Box::new(value));
    }
}

fn cache_clone_val<T: Clone + 'static>() -> Option<T> {
    let cache = CACHE.lock().expect("Failed to lock CACHE.");
    cache.clone_val::<T>()
}

fn cache_insert<T>(value: T)
where
    T: Send + 'static,
{
    let mut cache = CACHE.lock().expect("Failed to lock CACHE.");
    cache.insert(value)
}

pub struct ReqMgr {
    pub get_fn4: Arc<
        Deduplicate<
            Box<
                dyn Fn(usize) -> DeduplicateFuture<Result<String, Arc<(String, anyhow::Error)>>>
                    + Send
                    + Sync
                    + 'static,
            >,
            usize,
            Result<String, Arc<(String, anyhow::Error)>>,
        >,
    >,
}

impl ReqMgr {
    pub fn new() -> ReqMgr {
        let a: Box<
            dyn Fn(usize) -> DeduplicateFuture<Result<String, Arc<(String, anyhow::Error)>>>
                + Send
                + Sync
                + 'static,
        > = Box::new(&get);
        // Capacity 0 to disable caching.
        let deduplicate_with_fn = Deduplicate::with_capacity(a, 0);

        ReqMgr {
            get_fn4: Arc::new(deduplicate_with_fn),
        }
    }
}

fn prep_error<E, T>(source: &str, error: E) -> Result<T, Arc<(String, anyhow::Error)>>
where
    E: core::error::Error + Send + Sync + 'static,
{
    Err(Arc::new((source.to_string(), anyhow::Error::new(error))))
}

fn prep_anyhow_error<T>(
    source: &str,
    anyhow_error: anyhow::Error,
) -> Result<T, Arc<(String, anyhow::Error)>> {
    Err(Arc::new((source.to_string(), anyhow_error)))
}

fn prep_str_error<T>(source: &str, err_str: String) -> Result<T, Arc<(String, anyhow::Error)>> {
    let simple_error = SimpleError::new(err_str);
    Err(Arc::new((
        source.to_string(),
        anyhow::Error::new(simple_error),
    )))
}

async fn request_with_retries(endpoint: &str) -> Result<Response, anyhow::Error> {
    // TODO: Could add some form of backoff
    let retries = 3;
    for i in 0..retries {
        let req_result = reqwest::get(endpoint).await;

        match req_result {
            Ok(x) => {
                return Ok(x);
            }
            Err(e) => {
                if i == retries - 1 {
                    return Err(anyhow::Error::new(e));
                }
            }
        }
    }
    unreachable!()
}

async fn do_call<T>(endpoint: &str) -> Result<T, Arc<(String, anyhow::Error)>>
where
    T: Serialize + DeserializeOwned + Clone + Send + 'static,
{
    let result: T = match cache_clone_val::<T>() {
        Some(x) => x,
        None => {
            // tokio::time::sleep(std::time::Duration::from_millis(3000)).await;
            let body = request_with_retries(endpoint)
                .await
                .or_else(|e| prep_anyhow_error("api call failed", e))?
                .text()
                .await
                .or_else(|e| prep_error("api call 'text()'", e))?;

            let value =
                serde_json::from_str::<T>(&body).or_else(|e| prep_error("body serde parse", e))?;
            cache_insert(value.clone());
            value
        }
    };
    Ok(result)
}

// This is our slow accessor function. Note that we must take a single
// key argument and return a [`DeduplicateFuture`] with our value.
// All of our specific logic is enclosed within an async block. We
// are using move to move the key into the block.  Finally, we pin
// the block and return it.
pub fn get(_key: usize) -> DeduplicateFuture<Result<String, Arc<(String, anyhow::Error)>>> {
    println!("QWQWQWQWQWQWQWQWQWQWQW inside get, doing the work");

    let future = async move {
        // Fetch config file.
        let endpoint = format!(
            "https://raw.githubusercontent.com/{}/refs/heads/config_branch/config_branch.json",
            global::vars().user_repo
        );

        let config_res = do_call::<Config>(&endpoint).await;
        let config = match config_res {
            Ok(x) => x,
            Err(e) => {
                return Some(Err(e));
            }
        };

        let central_name = global::vars().central_name;

        let config_central = match config.central.get(central_name) {
            Some(x) => x,
            None => {
                return Some(prep_str_error(
                    "query",
                    format!("Failed to find central for '{}' in config.", central_name),
                ));
            }
        };

        let central_branches = &config_central.branches;
        if central_branches.len() < 1 {
            // Skip fetching asset_info.json and return an empty array.
            return Some(Ok("[]".to_string()));
        }

        // Fetch asset_info.json
        let release_tag = &config_central.release_tag;

        let asset_info_url = format!(
            "https://github.com/{}/releases/download/{}/asset_info.json",
            global::vars().user_repo,
            release_tag
        );
        let asset_info_res = do_call::<AssetInfo>(&asset_info_url).await;
        let asset_info = match asset_info_res {
            Ok(x) => x,
            Err(e) => {
                return Some(Err(e));
            }
        };

        // Build results list.
        let target = global::vars().target;
        let mut entries: Vec<PossibleBranch> = vec![];

        for branch in central_branches {
            if let Some(asset_info_branch) = asset_info.branches.get(branch) {
                if asset_info_branch.site_zips.contains_key(target) {
                    if let Some(config_branch) = config.branches.get(branch) {
                        entries.push(PossibleBranch {
                            branch_name: branch.clone(),
                            version: asset_info_branch.version.clone(),
                            display_name: config_branch.name.clone(),
                        });
                    }
                }
            }
        }

        let result = match serde_json::to_string(&entries) {
            Ok(x) => Ok(x),
            Err(e) => prep_error("entries serialize", e),
        };
        Some(result)
    };
    Box::pin(future)
}

// // All the comments from the get function apply here. In this case
// // we are choosing to provide a closure rather than a function.
// let closure = |key: usize| -> DeduplicateFuture<String> {
//     let fut = async move {
//         let num = rand::thread_rng().gen_range(1000..2000);
//         tokio::time::sleep(tokio::time::Duration::from_millis(num)).await;

//         Some(format!("key: {}, duration: {}", key, num))
//     };
//     Box::pin(fut)
// };

// // We create two deduplicate instances, one from our function and one
// // from our closure for purposes of illustration. We'd only create one
// // in a real application.
// let deduplicate_with_fn = Deduplicate::new(get);
// let deduplicate_with_closure = Deduplicate::new(closure);
// // Our get is async, so use tokio_test::block_on to execute it.
// let value = tokio_test::block_on(deduplicate_with_fn.get(42));
// println!("value: {:?}", value);
