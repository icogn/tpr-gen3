use deduplicate::Deduplicate;
use std::time::Duration;
// use deduplicate::DeduplicateError;
use crate::global::VARS;
use deduplicate::DeduplicateFuture;
use std::sync::Arc;

pub struct ReqMgr {
    pub get_fn4: Arc<
        Deduplicate<
            Box<dyn Fn(usize) -> DeduplicateFuture<String> + Send + Sync + 'static>,
            usize,
            String,
        >,
    >,
}

impl ReqMgr {
    pub fn new() -> ReqMgr {
        let a: Box<dyn Fn(usize) -> DeduplicateFuture<String> + Send + Sync + 'static> =
            Box::new(&get);
        // Capacity 0 to disable caching.
        let deduplicate_with_fn = Deduplicate::with_capacity(a, 0);

        ReqMgr {
            get_fn4: Arc::new(deduplicate_with_fn),
        }
    }
}

// use rand::Rng;

// This is our slow accessor function. Note that we must take a single
// key argument and return a [`DeduplicateFuture`] with our value.
// All of our specific logic is enclosed within an async block. We
// are using move to move the key into the block.  Finally, we pin
// the block and return it.
pub fn get(key: usize) -> DeduplicateFuture<String> {
    // let fut = async move {
    let fut = async move {
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

        let endpoint = format!(
            "https://raw.githubusercontent.com/{}/refs/heads/config_branch/config_branch.json",
            VARS.user_repo
        );

        let req_result = reqwest::get(endpoint).await;
        let resp = match req_result {
            Ok(x) => x,
            Err(_) => {
                return None;
            }
        };
        let resp_text = resp.text().await;
        let body = match resp_text {
            Ok(x) => x,
            Err(_) => {
                return None;
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

        tokio::time::sleep(Duration::from_millis(3000)).await;

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

        Some(format!("body = {body:?}"))
    };
    Box::pin(fut)
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
