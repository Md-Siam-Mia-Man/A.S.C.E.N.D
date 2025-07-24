// adb.js
import { state } from "./state.js";
import { setBusy } from "./shell.js";
import { log } from "./utils.js";
import {
  populateDeviceList,
  updateDashboardData,
  getDashboardData,
} from "./dashboard.js";
import { populateAppList, listApps } from "./debloater.js";
import { checkAllToggleStates, parseToggleState } from "./device.js";
import { parseAndRenderDeviceFiles, listDeviceFiles } from "./files.js";

export function initAdb() {
  window.electronAPI.onCommandOutput((output, commandKey) => {
    setBusy(false);
    const msg = output.replace(/^ERROR:/i, "").trim();

    if (commandKey === "adb-devices") {
      populateDeviceList(output);
    } else if (commandKey && commandKey.startsWith("dashboard-")) {
      updateDashboardData(msg, commandKey);
    } else if (commandKey === "list-apps") {
      populateAppList(msg);
    } else if (commandKey === "device-ls") {
      parseAndRenderDeviceFiles(msg);
    } else if (commandKey && commandKey.startsWith("toggle-")) {
      parseToggleState(msg, commandKey);
    } else if (commandKey === "dumpsys") {
      document.getElementById("dumpsys-output").value = msg;
    } else if (output.startsWith("ERROR:")) {
      log(msg, "ERROR");
    } else if (msg) {
      log(msg, "INFO");
    }
  });
}

export function runCommand(
  command,
  args = [],
  isBackgroundTask = false,
  commandKey = null
) {
  const isDeviceCommand = [
    "shell",
    "pull",
    "push",
    "tcpip",
    "reboot",
    "screencap",
    "logcat",
  ].some((cmd) => args.includes(cmd));
  const isConnectionCommand =
    command === "adb" &&
    (args[0] === "connect" ||
      args[0] === "devices" ||
      args[0] === "start-server");

  if (isDeviceCommand && !state.currentDevice) {
    log("No device selected. Command aborted.", "ERROR");
    return;
  }

  const finalArgs = isDeviceCommand
    ? ["-s", state.currentDevice, ...args]
    : args;

  if (!isBackgroundTask) setBusy(true);
  window.electronAPI.executeCommand(command, finalArgs, commandKey);
}

export function refreshView() {
  if (!state.currentDevice) {
    log("Cannot refresh view, no device selected.", "INFO");
    return;
  }

  switch (state.activeTab) {
    case "dashboard-tab":
      getDashboardData();
      break;
    case "apps-tab":
      listApps();
      break;
    case "files-tab":
      listDeviceFiles(state.currentDevicePath);
      break;
    case "device-tab":
      checkAllToggleStates();
      break;
    default:
      break;
  }
}
