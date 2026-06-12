const { ipcRenderer } = require('electron');

// Expõe API de arquivo para o renderer sem abrir nodeIntegration completo
window.ringueFS = {
  save(slot, jsonStr) {
    const result = ipcRenderer.sendSync('save', slot, jsonStr);
    return result?.ok === true;
  },
  load(slot) {
    return ipcRenderer.sendSync('load', slot);
  },
  listSaves() {
    return ipcRenderer.sendSync('list-saves');
  },
  deleteSave(slot) {
    const result = ipcRenderer.sendSync('delete-save', slot);
    return result?.ok === true;
  },
};
