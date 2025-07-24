const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");

const isDev = process.env.NODE_ENV !== "production";
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: isDev ? 1500 : 1200,
    height: 800,
    minWidth: 940,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#0f0f0f",
    icon: path.join(__dirname, "..", "../assets/img/logo.png"),
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.loadFile(path.join(__dirname, "..", "index.html"));
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.on("window:minimize", () => mainWindow.minimize());
ipcMain.on("window:maximize", () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});
ipcMain.on("window:close", () => mainWindow.close());

ipcMain.handle("dialog:saveFile", async (event, defaultName) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
  });
  return canceled ? null : filePath;
});

ipcMain.handle("get:debloat-db", () => {
  try {
    const dbPath = path.join(__dirname, "..", "..", "data", "debloat_db.json");
    const rawData = fs.readFileSync(dbPath);
    return JSON.parse(rawData);
  } catch (error) {
    console.error("Failed to read or parse debloat_db.json:", error);
    return [];
  }
});

ipcMain.on("execute:command", (event, command, args, commandKey) => {
  const binPath = isDev
    ? path.join(__dirname, "..", "..", "bin")
    : path.join(process.resourcesPath, "bin");

  const executableName =
    process.platform === "win32" ? `${command}.exe` : command;
  const executable = path.join(binPath, executableName);

  if (!fs.existsSync(executable)) {
    event.reply(
      "command:output",
      `ERROR: Executable not found at ${executable}`,
      commandKey
    );
    return;
  }

  let stdoutData = "";
  let stderrData = "";

  try {
    const child = spawn(executable, args);

    child.stdout.on("data", (data) => {
      stdoutData += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderrData += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        event.reply("command:output", stdoutData, commandKey);
      } else {
        const errorMessage =
          stderrData || stdoutData || `Command failed with exit code ${code}`;
        event.reply("command:output", `ERROR: ${errorMessage}`, commandKey);
      }
    });

    child.on("error", (err) => {
      event.reply(
        "command:output",
        `ERROR: Failed to start command: ${err.message}`,
        commandKey
      );
    });
  } catch (error) {
    event.reply(
      "command:output",
      `ERROR: Spawn failed: ${error.message}`,
      commandKey
    );
  }
});
