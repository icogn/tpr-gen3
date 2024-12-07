fn main() {
    // Added so we can reference the targetTriple to compare against the keys in
    // asset_info.json. From:
    // https://stackoverflow.com/questions/48967583/how-to-get-executables-full-target-triple-as-a-compile-time-constant-without-us
    println!(
        "cargo:rustc-env=TARGET={}",
        std::env::var("TARGET").unwrap()
    );

    tauri_build::build()
}
