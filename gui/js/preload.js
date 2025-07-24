const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  minimizeWindow: () => ipcRenderer.send("window:minimize"),
  maximizeWindow: () => ipcRenderer.send("window:maximize"),
  closeWindow: () => ipcRenderer.send("window:close"),

  executeCommand: (command, args, commandKey) => {
    ipcRenderer.send("execute:command", command, args, commandKey);
  },

  onCommandOutput: (callback) => {
    ipcRenderer.on("command:output", (event, output, commandKey) => {
      callback(output, commandKey);
    });
  },

  getDebloatInfo: () => ipcRenderer.invoke("get:debloat-db"),
  saveFile: (defaultName) => ipcRenderer.invoke("dialog:saveFile", defaultName),
});
