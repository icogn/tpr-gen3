import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './App.css';
import SettingsModal from './settings-modal';

type Branch = {
  id: number;
  branch_name: string;
  display_name: string;
  branch_version: string;
};

function App() {
  const [greetMsg, setGreetMsg] = useState('');
  const [name, setName] = useState('');
  const [port, setPort] = useState<number | undefined>();
  const [branches, setBranches] = useState<Branch[]>([]);

  async function greet() {
    const res = await invoke('greet', { name });
    console.log('res');
    console.log(res);
    setGreetMsg(res.message);
    setPort(res.port);

    console.log(`bef3: ${Date.now()}`);
    const bef = Date.now();
    const res3 = await invoke('get_installed_branches');
    console.log(`after3: ${Date.now() - bef}`);
    console.log('res3');
    console.log(res3);
    setBranches(res3);

    // Note: setup where we start call early in core process causes the call to
    // start about 606-615 ms sooner (in dev mode at least).
    console.log(Date.now());
    const res2 = await invoke('get_config', {});
    console.log('res2');
    console.log(res2);
  }

  useEffect(() => {
    greet();
  }, []);

  return (
    // <div className="container">
    <div className="container2">
      <select
        style={{
          color: 'black',
          width: 500,
        }}
      >
        {branches.map((branch) => {
          return <option key={branch.id}>{branch.display_name}</option>;
        })}
      </select>

      {port != null && (
        <iframe src={`http://127.0.0.1:${port}`} className="testing"></iframe>
      )}

      <SettingsModal open />
    </div>
  );
}

export default App;
