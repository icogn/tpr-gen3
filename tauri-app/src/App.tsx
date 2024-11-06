import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './App.css';
// import { Command } from '@tauri-apps/plugin-shell';
// import { resolveResource, resolve } from '@tauri-apps/api/path';

// const nodeVerCommand = Command.sidecar('bin/node_v20_17_0', ['-v']);

// const resourcePath = await resolveResource('resources/website/server.js');
// console.log('resourcePath');
// console.log(resourcePath);

// const websiteDir = await resolve(resourcePath, '..');
// console.log('websiteDir');
// console.log(websiteDir);

// const websiteCommand = Command.sidecar('bin/node_v20_17_0', ['server.js'], {
//   cwd: websiteDir,
// });

// websiteCommand.stderr.on('data', (a, b) => {
//   console.log(a, b);
// });

// websiteCommand.stdout.on('data', (a, b) => {
//   console.log(a, b);
// });

// websiteCommand
//   .execute()
//   .then((a) => {
//     console.log('a');
//     console.log(a);
//   })
//   .catch((e) => {
//     console.log('e');
//     console.log(e);
//   });

// Reference video: https://www.youtube.com/watch?v=dMJKXUFxD0Y
// Using tauri v1, but still can be helpful

function App() {
  const [greetMsg, setGreetMsg] = useState('');
  const [name, setName] = useState('');
  const [port, setPort] = useState<number | undefined>();

  // useEffect(() => {
  //   async function a() {
  //     const unlisten = await listen('eee', (event) => {
  //       console.log('event');
  //       console.log(event);
  //     });
  //   }
  //   a();

  //   // return unlisten;
  // }, []);

  async function greet() {
    // // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    const res = await invoke('greet', { name });
    console.log('res');
    console.log(res);
    setGreetMsg(res.message);
    setPort(res.port);

    // Note: setup where we start call early in core process causes the call to
    // start about 606-615 ms sooner (in dev mode at least).
    console.log(Date.now());
    const res2 = await invoke('get_config', {});
    console.log('res2');
    console.log(res2);

    // const result = await invoke('greet', { name });
    // setGreetMsg(result);

    // try {
    //   const output = await nodeVerCommand.execute();
    //   console.log('output');
    //   console.log(output.stdout);
    //   setGreetMsg(result + ' ' + output.stdout);
    // } catch (e) {
    //   console.log('e');
    //   console.log(e);
    // }
  }

  useEffect(() => {
    greet();
  }, []);

  return (
    // <div className="container">
    <div className="container2">
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          id="greet-input"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
        />
        <button type="submit">Greet</button>
      </form>

      <p>{greetMsg}</p>

      {port != null && (
        <iframe src={`http://127.0.0.1:${port}`} className="testing"></iframe>
      )}
    </div>
  );
}

export default App;
