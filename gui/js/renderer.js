// renderer.js
import { initShell } from "./shell.js";
import { initAdb, runCommand } from "./adb.js";
import { initDashboard } from "./dashboard.js";
import { initScrcpy } from "./scrcpy.js";
import { initDebloater } from "./debloater.js";
import { initDeviceControls } from "./device.js";
import { initFileExplorer } from "./files.js";
import { initRemote } from "./remote.js";
import { initModals } from "./modals.js";
import { state } from "./state.js";
import { log } from "./utils.js";

document.addEventListener("DOMContentLoaded", async () => {
  initShell();
  initAdb();
  initDashboard();
  initScrcpy();
  initDebloater();
  initDeviceControls();
  initFileExplorer();
  initRemote();
  initModals();

  try {
    const rawDb = await window.electronAPI.getDebloatInfo();
    const formattedDB = {};
    if (Array.isArray(rawDb)) {
      for (const item of rawDb) {
        if (item && item.id) {
          formattedDB[item.id] = {
            name: item.name || item.list || item.id.split(".").pop(),
            description: item.description || "No description available.",
            safety: item.safety || item.removal || "unknown",
          };
        }
      }
    }
    state.debloatDB = formattedDB;
  } catch (e) {
    log(
      `FATAL: Failed to load or parse debloat_db.json. ${e.message}`,
      "ERROR"
    );
  }

  runCommand("adb", ["start-server"], true);

  setTimeout(() => {
    runCommand("adb", ["devices"], true, "adb-devices");
    setInterval(() => {
      if (!state.isBusy) {
        runCommand("adb", ["devices"], true, "adb-devices");
      }
    }, 5000);
  }, 500);

  log("A.S.C.E.N.D. Initialized. Awaiting device connection...");
});
