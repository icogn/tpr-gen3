For tauri-dev:
From "tauri-app" dir, run `yarn tauri dev` for dev mode of the tauri app.

For tauri-build:
From "tauri-app" dir, run `yarn tauri build`.

For github actions:

- Go to Settings > Actions > General > Workflow permissions, and change to "Read and write permissions".

TODO (big items):

Ref for auto-update (v1): https://www.youtube.com/watch?v=ZXjlZBisYPQ

Ref for different update channels: https://github.com/tauri-apps/tauri/issues/2595

- guide on auto-updating: https://github.com/tauri-apps/tauri/discussions/2776
- look at SSRando artifact stuff (see if this is possible after looking into auto-updating)
- some sort of script which copies the standalone output to the resources dir (create if needed) in the src-tauri folder.
  Node that node_modules DOES need to be copied in.
  Can possibly remove some files, but can worry about slightly optimizing the installed size at the end.
- package and use drizzle with nextjs website (volume, etc. working with tauri in AppData?)

asdf

- What if only auto-update on stable branch
- People would be allowed to publish the website code as something to switch to.
- No reason to give people the ability to change the main program (swapping between branches, etc.)
- We also then don't need to share the private key info at all

Next steps:

- Store what the package.json version was last time we ran (1.2.0 for example).
- We don't care about whether or not it was "dev", "isaac", etc.; only the number comparison matters
- The name for the branch can be set with a variable in the environment.
  It is called "dev" for all forks, but they can set the exact name in a var.
- This name is used to create the version like "1.2.0-dev.8".
- When we start, if the previous semver exists and is LESS than the current semver one, then reset to 0.
  It will get changed to 1 and never 0, but that is fine.
- We also want to write the version to an artifact "config.json" which will be read by our stable workflow.
  This workflow will update a json file in a branch which will be used by API endpoints to get info about branches.
  For example, site URL, latest version, artifact URLs, possibly store the artifact signatures here as well.
  This would allow us to validate the zip file that we download to make sure what we end up downloading to their
  site matches what we expect.

Next steps:

- Centralized workflow which queues against itself if there are multiple.
- Needs to verify the sender has permission to make the request.
- Need to validate the input from the requester and update a file in a branch for the config
  which is used by the menus

---

For developing website in tauri context, we do not need the sidecar. Things that
would be passed to it should be statically known, such as the port (let's say 3000)
and the volume path.

We will also need a way to test the sidecar version.
Should already have top-level `yarn build:website` to put the output
in the resources folder. When running the sidecar, it should load this
(which it is already doing).

The no-sidecar version can be the one which does NOT include `--no-watch` since
watching it is safe when there are no problems related to the sidecar.
We would still need to pass an environment variable in to indicate that we should
not run the sidecar.

## Notes

- We have to use `--no-watch` when running tauri in dev mode.
  This is because there is no event we can respond to when the rebuild starts, meaning our Node sidecar keeps running and the build process is unable to delete the `src-tauri/target` folder.
  If you get something like an "PermissionDenied" error for `build-script-build`, then it is likely for this reason.
  You can try to stop the Node process with task manager or restart your computer.
  You should use `yarn tauri:dev` which includes the `--no-watch` flag for you and not `yarn tauri dev` for this reason (though `yarn tauri dev` would not start the Vite server on 1420 because of the changes listed later in this document).

  - If you need to do tauri-specific dev which does not need the Node sidecar running, you could temporarily disable that code and run `yarn tauri dev`, or we could potentially make a command which leaves off the no-watch flag and provides and env var which we use in the code to skip starting the sidecar.

- From `tauri.conf.json`: had to remove 'build.beforeDevCommand: yarn dev' part since there is a bug on windows where the Vite process would not die when closing the tauri application (which ends the tauri dev process) when using `--no-watch`.
  So running the dev command again would not work since port 1420 would be in use.
  The solution is that we use the `concurrently` package which works quite well, so probably fine there.

- The window showing up with a light background for a little before the content displays is a limitation of the webview used on Windows.
  It seems like they are working toward an option to allow setting the background color for this to help a little.
  The options are either deal with it or put an arbitrary X second delay before showing the window (which is unreliable and makes the app seem slow).
  Interestingly, the content has loaded and React code is executing before the webview can show the content, so waiting on these events does not work.K
  - Skipping over the sidecar did not fix the issue either, and it is not clear if that even made things faster (was not easily perceptible at least).
