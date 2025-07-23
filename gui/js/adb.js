import { state } from "./state.js";
import {
  setBusy,
  logToSession,
  clearDashboard,
  updateDashboardUI,
  updateRamUI,
} from "./ui.js";
import { refreshCurrentTabData } from "./renderer.js";
import { parseAndRenderDeviceFiles } from "./files.js";
import { populateAppList, parseToggleState } from "./apps.js";

export function runCommand(
  command,
  args = [],
  isBackgroundTask = false,
  commandKey = null
) {
  if (!isBackgroundTask) setBusy(true);
  window.electronAPI.executeCommand(command, args, commandKey);
}

export function refreshDevices(isAutoRefresh = false) {
  if (!isAutoRefresh && !state.isBusy)
    logToSession("Refreshing device list...", "CMD");
  runCommand("adb.exe", ["devices"], true, "adb-devices");
}

export function populateDeviceList(data) {
  const newDeviceList = [];
  const lines = data.split("\n").slice(1);
  lines.forEach((line) => {
    if (line.trim() && line.includes("device")) {
      newDeviceList.push(line.split("\t")[0].trim());
    }
  });

  if (JSON.stringify(newDeviceList) === JSON.stringify(state.currentDeviceList))
    return;

  state.currentDeviceList = newDeviceList;
  logToSession(
    `Device update: Found ${state.currentDeviceList.length} device(s).`,
    "SUCCESS"
  );

  const dropdownMenu = document.querySelector(
    "#device-dropdown .dropdown-menu"
  );
  const selectedText = document.getElementById("selected-device-text");
  dropdownMenu.innerHTML = "";

  if (state.currentDeviceList.length > 0) {
    state.currentDeviceList.forEach((deviceId) => {
      const item = document.createElement("div");
      item.className = "dropdown-item";
      item.textContent = deviceId;
      item.dataset.value = deviceId;
      item.addEventListener("click", () => {
        selectedText.textContent = deviceId;
        state.currentDevice = deviceId;
        dropdownMenu.classList.remove("open");
        logToSession(`Selected device: ${state.currentDevice}`);
        refreshCurrentTabData();
      });
      dropdownMenu.appendChild(item);
    });

    const oldSelectedDevice = state.currentDevice;
    state.currentDevice = state.currentDeviceList.includes(state.currentDevice)
      ? state.currentDevice
      : state.currentDeviceList[0];
    selectedText.textContent = state.currentDevice;
    if (oldSelectedDevice !== state.currentDevice) {
      refreshCurrentTabData();
    }
  } else {
    state.currentDevice = null;
    selectedText.textContent = "No devices found";
    clearDashboard();
    document.getElementById("device-file-list-container").innerHTML = "";
    document.getElementById("app-list").innerHTML = "";
  }
}

export function getDashboardData() {
  if (!state.currentDevice) return;
  clearDashboard();
  const commands = {
    props: ["shell", "getprop"],
    battery: ["shell", "dumpsys battery"],
    network: ["shell", "ip addr show wlan0"],
    cpu: ["shell", "dumpsys cpuinfo"],
    ram: ["shell", "cat /proc/meminfo"],
    screenSize: ["shell", "wm size"],
    screenDensity: ["shell", "wm density"],
  };
  for (const key in commands) {
    runCommand(
      "adb.exe",
      ["-s", state.currentDevice, ...commands[key]],
      true,
      key
    );
  }
}

export function parseDashboardData(data, commandKey) {
  try {
    if (commandKey === "props") {
      const getProp = (key) =>
        (data.match(new RegExp(`\\[${key}\\]: \\[(.*?)\\]`)) || [])[1];
      updateDashboardUI("info-model", getProp("ro.product.model") || "N/A");
      updateDashboardUI("info-brand", getProp("ro.product.brand") || "N/A");
      updateDashboardUI(
        "info-version",
        `Android ${getProp("ro.build.version.release") || "?"} (API ${
          getProp("ro.build.version.sdk") || "?"
        })`
      );
      updateDashboardUI("info-build", getProp("ro.build.display.id") || "N/A");
    } else if (commandKey === "battery") {
      const level = (data.match(/level: (\d+)/) || [])[1];
      const statusNum = (data.match(/status: (\d+)/) || [])[1];
      const statusMap = {
        2: "Charging",
        3: "Discharging",
        4: "Not Charging",
        5: "Full",
      };
      updateDashboardUI(
        "info-battery",
        level ? `${level}% (${statusMap[statusNum] || "Unknown"})` : "N/A"
      );
    } else if (commandKey === "network") {
      const ip = (data.match(/inet (\d+\.\d+\.\d+\.\d+)/) || [])[1];
      const mac = (data.match(/link\/ether ([\da-fA-F:]+)/) || [])[1];
      updateDashboardUI("info-ip", ip || "N/A");
      updateDashboardUI("info-mac", mac || "N/A");
    } else if (commandKey === "cpu") {
      const load = (data.match(/Load: ([\d.]+)/) || [])[1];
      updateDashboardUI("info-cpu", load ? `${load}` : "N/A");
    } else if (commandKey === "ram") {
      const totalRamKB = parseInt(
        (data.match(/MemTotal:\s+(\d+) kB/) || [])[1]
      );
      const availableRamKB = parseInt(
        (data.match(/MemAvailable:\s+(\d+) kB/) || [])[1]
      );
      if (totalRamKB && availableRamKB) {
        const usedRamKB = totalRamKB - availableRamKB;
        const percentage = ((usedRamKB / totalRamKB) * 100).toFixed(1);
        const text = `${(usedRamKB / 1024 / 1024).toFixed(2)} GB / ${(
          totalRamKB /
          1024 /
          1024
        ).toFixed(2)} GB`;
        updateRamUI(text, percentage);
      }
    } else if (commandKey === "screenSize") {
      updateDashboardUI(
        "info-resolution",
        (data.match(/Physical size: ([\dx]+)/) || [])[1] || "N/A"
      );
    } else if (commandKey === "screenDensity") {
      updateDashboardUI(
        "info-density",
        `${(data.match(/Physical density: (\d+)/) || [])[1]} dpi` || "N/A"
      );
    } else if (commandKey === "dumpsys") {
      document.getElementById("dumpsys-output").value = data;
    }
  } catch (e) {
    logToSession(
      `Error parsing dashboard data for ${commandKey}: ${e.message}`,
      "ERROR"
    );
  }
}

export function handleCommandOutput(output, commandKey) {
  setBusy(false);
  const msg = output.replace(/^(ERROR|SUCCESS):/i, "").trim();

  if (commandKey === "adb-devices") populateDeviceList(msg);
  else if (commandKey === "device-ls") parseAndRenderDeviceFiles(msg);
  else if (commandKey === "list-apps") populateAppList(msg);
  else if (commandKey && commandKey.startsWith("toggle-"))
    parseToggleState(msg, commandKey);
  else if (commandKey) parseDashboardData(msg, commandKey);
  else if (output.startsWith("ERROR:") || !/Success/i.test(msg)) {
    logToSession(msg, output.startsWith("ERROR:") ? "ERROR" : "INFO");
  }
}
