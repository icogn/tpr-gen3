import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './globals.css';
import { Provider } from 'react-redux';
import { store } from './state/store';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

let latestValue = -1;

try {
  const fromStorage = window.localStorage.getItem('latestValue');
  console.log(`fromStorage: ${fromStorage}`);
} catch (e) {
  console.error(e);
}

// TODO: this can wait until after the thing itself is working without
// refreshing the page. We can cache the values from the state here so we can
// refresh it on page refresh (maybe ignore them if the timestamp is more than
// 3s for example so we don't wind up with bogus data from a previous launch of
// the app or something; could also store a random ID from the tauri side so
// that the timestamp and ID have to line up, meaning we pretty much run no risk
// of things going wrong there). Look into redux-remember. redux-persist seems
// mostly unmaintained. Note that in dev mode anyway, localStorage does appear
// to persist between different app launches from nothing.
window.onbeforeunload = () => {
  window.localStorage.setItem('latestValue', latestValue);
};

// tauri automatically unlistens on page refresh. Events appear to be sent in
// the correct order, even with multiple in the same ms.
console.log('About to call listen(branch-install)');
listen('branch-install', (e) => {
  console.log('on branch-install');
  console.log(e);
  latestValue = e.payload.number;
});

invoke('install_branch', { branchName: 'devv' });

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
