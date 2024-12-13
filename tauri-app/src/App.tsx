import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './App.css';
import SettingsModal from './settings-modal';
import { Branch } from './types';
import {
  useBranchesQuery,
  useGetInstalledBranchesQuery,
} from './state/api-slice';

function App() {
  // const [greetMsg, setGreetMsg] = useState('');
  const [port, setPort] = useState<number | undefined>();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [open, setOpen] = useState(false);

  const { data, error, isLoading } = useGetInstalledBranchesQuery();
  useBranchesQuery();
  console.log('-------------------------------');
  console.log('@@@@@@@@@@@@@data');
  console.log(data);
  console.log(`isLoading: ${isLoading}`);
  console.log('error');
  console.log(error);

  async function greet() {
    const res = (await invoke('greet', { name: 'my_name' })) as {
      port: number;
    };
    console.log('res');
    console.log(res);
    // setGreetMsg(res.message);
    setPort(res.port);

    // console.log(`bef3: ${Date.now()}`);
    // const bef = Date.now();
    // const res3 = (await invoke('get_installed_branches')) as Branch[];
    // console.log(`after3: ${Date.now() - bef}`);
    // console.log('res3');
    // console.log(res3);
    // setBranches(res3);

    // // Note: setup where we start call early in core process causes the call to
    // // start about 606-615 ms sooner (in dev mode at least).
    // console.log(Date.now());
    // try {
    //   const res2 = await invoke('get_possible_branches', {});
    //   console.log('res2');
    //   console.log(res2);
    // } catch (e) {
    //   console.error('Found error:');
    //   console.error(e);
    // }
  }

  useEffect(() => {
    greet();
  }, []);

  return (
    // <div className="container">
    <div className="container2 dark">
      {/* <select
        style={{
          color: 'black',
          width: 500,
        }}
      >
        {branches.map((branch) => {
          return <option key={branch.id}>{branch.display_name}</option>;
        })}
      </select> */}
      <button
        onClick={() => {
          setOpen(true);
        }}
      >
        Click
      </button>

      {port != null && (
        <iframe src={`http://127.0.0.1:${port}`} className="testing"></iframe>
      )}

      {open && (
        <SettingsModal
          onClose={() => {
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

export default App;
