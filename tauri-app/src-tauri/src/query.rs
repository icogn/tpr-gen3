use deduplicate::Deduplicate;
use std::time::Duration;
// use deduplicate::DeduplicateError;
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
        let deduplicate_with_fn = Deduplicate::new(a);

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
        // let num = 1500;
        // // let num = rand::thread_rng().gen_range(1000..2000);
        // // tokio::time::sleep(tokio::time::Duration::from_millis(num)).await;

        // Some(format!("key: {}, duration: {}", key, num))
        // // Some(format!("key: {}, duration: {}", "fish", num))

        println!("Doing with key {}; same key prevents multiple", key);

        // let first = reqwest::get("https://www.rust-lang.org").await;

        // TODO: this should be be provided as a build resource or something
        // similar for production builds? Also need to know which "central" to
        // use.
        let first = reqwest::get("https://raw.githubusercontent.com/icogn/tpr-gen3/refs/heads/config_branch/config_branch.json").await;
        tokio::time::sleep(Duration::from_millis(3000)).await;

        let text = match first {
            Ok(x) => x,
            Err(_) => {
                return None;
            }
        };

        let aa = text.text().await;

        let body = match aa {
            Ok(x) => x,
            Err(_) => {
                return None;
            }
        };

        // .text()
        // .await?;

        // .text()
        // .await?;

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
