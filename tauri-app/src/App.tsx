import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './App.css';

function App() {
  const [greetMsg, setGreetMsg] = useState('');
  const [name, setName] = useState('');
  const [port, setPort] = useState<number | undefined>();

  async function greet() {
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

    const res3 = await invoke('get_installed_branches');
    console.log('res3');
    console.log(res3);
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
