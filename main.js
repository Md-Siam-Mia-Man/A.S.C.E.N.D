const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs").promises;
const { execFile, spawn } = require("child_process");

const isDev = !app.isPackaged;
const resourcesPath = isDev ? __dirname : process.resourcesPath;

const assetsPath = path.join(resourcesPath, "assets");
const binPath = path.join(resourcesPath, "bin");
const dbPath = path.join(isDev ? __dirname : resourcesPath, "debloat_db.json");

let logcatProcess = null;

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 750,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(assetsPath, "img/icon.ico"),
  });

  win.setMenu(null);
  win.loadFile("renderer/index.html");

  if (isDev) {
    win.webContents.openDevTools();
  }
};

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (logcatProcess) logcatProcess.kill();
  if (process.platform !== "darwin") app.quit();
});

ipcMain.on(
  "execute-command",
  (event, command, args = [], commandKey = null) => {
    const executablePath = path.join(binPath, command);

    if (command.startsWith("scrcpy")) {
      spawn(executablePath, args, { cwd: binPath });
      return;
    }

    execFile(
      executablePath,
      args,
      { cwd: binPath },
      (error, stdout, stderr) => {
        if (error) {
          event.reply(
            "command-output",
            `ERROR: ${stderr || error.message}`,
            commandKey
          );
          return;
        }
        const output = stdout || stderr;
        event.reply("command-output", `SUCCESS: ${output}`, commandKey);
      }
    );
  }
);

ipcMain.on("start-logcat", (event, deviceId) => {
  if (logcatProcess) logcatProcess.kill();
  const args = deviceId ? ["-s", deviceId, "logcat"] : ["logcat"];
  logcatProcess = spawn(path.join(binPath, "adb.exe"), args, { cwd: binPath });
  event.reply("command-output", "SUCCESS: Logcat stream started.");
  logcatProcess.stdout.on("data", (data) =>
    event.reply("logcat-data", data.toString())
  );
  logcatProcess.stderr.on("data", (data) =>
    event.reply("logcat-data", `ERROR: ${data.toString()}`)
  );
  logcatProcess.on("close", () =>
    event.reply("command-output", "INFO: Logcat stream stopped.")
  );
});

ipcMain.on("stop-logcat", () => {
  if (logcatProcess) {
    logcatProcess.kill();
    logcatProcess = null;
  }
});

ipcMain.handle("get-logo-path", () => {
  return path.join(assetsPath, "logo.svg");
});

ipcMain.handle("get-debloat-info", async () => {
  try {
    const data = await fs.readFile(dbPath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to read debloat_db.json:", error);
    return [];
  }
});

ipcMain.handle("dialog:saveFile", async (event, defaultName) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: path.join(app.getPath("downloads"), defaultName),
  });
  return !canceled ? filePath : null;
});
