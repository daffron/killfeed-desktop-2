import { contextBridge } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import { join } from 'path';
import { fileURLToPath } from 'url';

// Custom APIs for renderer
const api = {
  getDirname: () => __dirname,
  getUserData: (key) => electronAPI.ipcRenderer.sendSync('get-user-data', key),
  setUserData: (key, value) => electronAPI.ipcRenderer.send('set-user-data', { key, value }),
  toggleOverlay: (enable) => electronAPI.ipcRenderer.send('toggle-overlay', enable),
  sendKillfeedData: (data) => electronAPI.ipcRenderer.send('update-killfeed-data', data)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
console.log('Preload script loaded');
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
