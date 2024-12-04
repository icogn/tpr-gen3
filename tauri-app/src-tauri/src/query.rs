use deduplicate::Deduplicate;
// use std::time::Duration;
// use deduplicate::DeduplicateError;
use deduplicate::DeduplicateFuture;
use std::sync::Arc;
use std::sync::LazyLock;
use std::sync::Mutex;

use crate::config::Config;
use crate::global;

static CACHED_CONFIG: LazyLock<Mutex<Option<Config>>> = LazyLock::new(|| Mutex::new(None));

fn has_cached_config() -> bool {
    let val = CACHED_CONFIG
        .lock()
        .expect("Failed to lock cached_config mutex");
    if let Some(_) = *val {
        return true;
    }
    false
}

fn clone_cached_config() -> Option<Config> {
    let val = CACHED_CONFIG
        .lock()
        .expect("Failed to lock cached_config mutex");
    return (*val).clone();
}

fn set_cached_config(config_opt: Option<Config>) {
    let mut val = CACHED_CONFIG
        .lock()
        .expect("Failed to lock CACHED_CONFIG mutex");
    *val = config_opt;
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

fn prep_error<E, T>(source: &str, error: E) -> Option<Result<T, Arc<(String, anyhow::Error)>>>
where
    E: core::error::Error + Send + Sync + 'static,
{
    Some(Err(Arc::new((
        source.to_string(),
        anyhow::Error::new(error),
    ))))
}

fn prep_str_error<T>(source: &str, msg: &str) -> Option<Result<T, Arc<(String, anyhow::Error)>>> {
    let error = std::io::Error::new(std::io::ErrorKind::AddrInUse, msg.to_string());
    Some(Err(Arc::new((
        source.to_string(),
        anyhow::Error::new(error),
    ))))
}

// use rand::Rng;

// This is our slow accessor function. Note that we must take a single
// key argument and return a [`DeduplicateFuture`] with our value.
// All of our specific logic is enclosed within an async block. We
// are using move to move the key into the block.  Finally, we pin
// the block and return it.
pub fn get(key: usize) -> DeduplicateFuture<Result<String, Arc<(String, anyhow::Error)>>> {
    // let fut = async move {
    let future = async move {
        use std::time::Instant;
        // let num = 1500;
        // // let num = rand::thread_rng().gen_range(1000..2000);
        // // tokio::time::sleep(tokio::time::Duration::from_millis(num)).await;

        // Some(format!("key: {}, duration: {}", key, num))
        // // Some(format!("key: {}, duration: {}", "fish", num))

        println!("Doing with key {}; same key prevents multiple", key);
        let now = Instant::now();

        // let first = reqwest::get("https://www.rust-lang.org").await;

        // TODO: this should be be provided as a build resource or something
        // similar for production builds? Also need to know which "central" to
        // use.

        if !has_cached_config() {
            let endpoint = format!(
                "https://raw.githubusercontent.com/{}/refs/heads/config_branch/config_branch.json",
                global::vars().user_repo
            );

            let req_result = reqwest::get(endpoint).await;
            let resp = match req_result {
                Ok(x) => x,
                Err(e) => {
                    return prep_error("config api call request", e);
                }
            };
            let resp_text = resp.text().await;
            let body = match resp_text {
                Ok(x) => x,
                Err(e) => {
                    return prep_error("config api call 'text()'", e);
                }
            };

            // Need to figure out what we are returning from this.

            // The frontend needs to know the following:
            // - normalized data about each branch (includes the latest version info
            //   if we successfully get this info)
            // --- We should also only include this info if there is a siteZip that
            // matches the current platform.
            // - Ordered list of the branch_names so we know the order for the select
            // - It does not need to know the detailed asset_info.json info.
            // --- However, we do need to store this data on the backend.

            // TODO: this call seems to take about 320 ms the first time, and 43 ms
            // after that, so we should cache the result on the rust side for some
            // amount of time. Potentially could do something like 15 or 30s?

            let elapsed = now.elapsed();
            println!("Elapsed: {:.2?}", elapsed);

            // tokio::time::sleep(Duration::from_millis(3000)).await;

            // We must be able to return to the frontend info about the available
            // branches. We also must know the branch to default to /
            // current_branch. This info would be stored in the core DB to use on
            // startup. When the frontend requests this info, it happens async. We
            // merge the static info with the info we get dynamically from the
            // calls. Some of this info might not be there if the call fails or the
            // user is offline, etc. For example, the latest version for a site
            // might not be known, so in that case, the frontend will not know that
            // an update is available for that site, which is fine.

            // When the user successfully "installs" a site, we MUST store the
            // relevant info about that site in the core DB (such as its name). We
            // probably don't actually need to store any other info like
            // owner/repo/publicKey since this info is not relevant when offline.

            // Maybe the frontend should handle asking about the startup data and
            // the fetch data separately as well? We want to have the startup data
            // ASAP, and we can refresh the list with a slight delay.

            // The startup data would just be the installed branch data.

            // TODO: next thing is probably getting the core DB working so we can
            // read/write data about the installed branches and the default/current
            // branch.

            // We should cache the body

            let value: Result<Config, serde_json::Error> = serde_json::from_str(&body);
            match value {
                Ok(aaa) => {
                    set_cached_config(Some(aaa));
                }
                Err(e) => {
                    return prep_error("config body serde parse", e);
                }
            }
        }

        // TODO: next thing to do is fetch the asset_info and cache it. We only
        // indicate that a branch has an available version if its rust triple
        // siteZip exists for the current OS. We probably don't need to check if
        // it is on the release. If people get errors, we would rather know that
        // it somehow isn't there rather than just have it not show up for
        // people and delay us finding out there was an issue.

        // We probably do want to go ahead and provide a derived list of branch
        // data about all non-stable branches. It's okay that the same branch
        // might appear in installedBranches and this list. Resolving both sets
        // of data will happen on the client side. Also this way we aren't
        // sending huge publicKeys and signatures which are not used by the
        // client.

        // asset_info comes from the config data, so we have to fetch them
        // sequentially.

        let result = match clone_cached_config() {
            Some(x) => match serde_json::to_string(&x) {
                Ok(str) => str,
                Err(e) => {
                    return prep_error("config serde serialize", e);
                }
            },
            None => {
                return prep_str_error("cloned cached config", "Config was 'None'.");
            }
        };

        Some(Ok(result))
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
