// preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  executeCommand: (command, args, commandKey) =>
    ipcRenderer.send("execute-command", command, args, commandKey),
  onCommandOutput: (callback) =>
    ipcRenderer.on("command-output", (_event, value, commandKey) =>
      callback(value, commandKey)
    ),
  startLogcat: (deviceId) => ipcRenderer.send("start-logcat", deviceId),
  stopLogcat: () => ipcRenderer.send("stop-logcat"),
  onLogcatData: (callback) =>
    ipcRenderer.on("logcat-data", (_event, value) => callback(value)),
  getDebloatInfo: () => ipcRenderer.invoke("get-debloat-info"),
  saveFile: (defaultName) => ipcRenderer.invoke("dialog:saveFile"),
  getLogoPath: () => ipcRenderer.invoke("get-logo-path"),
});
