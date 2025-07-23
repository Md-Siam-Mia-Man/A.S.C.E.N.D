// renderer.js
let currentDevice = null;
let currentDeviceList = [];
let sessionLog, logcatLog;
let debloatDB = {};
let currentDevicePath = "/sdcard/";
let fileViewMode = "list";
let selectedFileItem = null;
let contextMenuTarget = null;
let currentAppFilter = "all";
let devToggles = { layout: false, overdraw: false, pointer: false };
let isBusy = false;

const path = {
  join: (...args) =>
    args
      .map((arg) => arg.replace(/\/$/, ""))
      .filter(Boolean)
      .join("/")
      .replace(/\/+/g, "/"),
};

function setBusy(state) {
  isBusy = state;
  document.body.classList.toggle("is-busy", state);
  document.getElementById("busy-indicator").classList.toggle("active", state);
}

function runCommand(
  command,
  args = [],
  isBackgroundTask = false,
  commandKey = null
) {
  if (!isBackgroundTask) setBusy(true);
  window.electronAPI.executeCommand(command, args, commandKey);
}

function logToSession(message, type = "INFO") {
  if (!sessionLog) return;
  const entry = document.createElement("div");
  entry.textContent = `[${new Date().toLocaleTimeString()}] [${type}] ${message}`;
  sessionLog.appendChild(entry);
  sessionLog.scrollTop = sessionLog.scrollHeight;
}

function getSelectedDevice() {
  return currentDevice;
}

function refreshDevices(isAutoRefresh = false) {
  if (!isAutoRefresh && !isBusy)
    logToSession("Refreshing device list...", "CMD");
  runCommand("adb.exe", ["devices"], true, "adb-devices");
}

function populateDeviceList(data) {
  const newDeviceList = [];
  const lines = data.split("\n").slice(1);
  lines.forEach((line) => {
    if (line.trim() && line.includes("device"))
      newDeviceList.push(line.split("\t")[0].trim());
  });
  if (JSON.stringify(newDeviceList) === JSON.stringify(currentDeviceList))
    return;
  currentDeviceList = newDeviceList;
  logToSession(
    `Device update: Found ${currentDeviceList.length} device(s).`,
    "SUCCESS"
  );
  const dropdownMenu = document.querySelector(
    "#device-dropdown .dropdown-menu"
  );
  const selectedText = document.getElementById("selected-device-text");
  dropdownMenu.innerHTML = "";
  if (currentDeviceList.length > 0) {
    currentDeviceList.forEach((deviceId) => {
      const item = document.createElement("div");
      item.className = "dropdown-item";
      item.textContent = deviceId;
      item.dataset.value = deviceId;
      item.addEventListener("click", () => {
        selectedText.textContent = deviceId;
        currentDevice = deviceId;
        dropdownMenu.classList.remove("open");
        logToSession(`Selected device: ${currentDevice}`);
        refreshCurrentTabData();
      });
      dropdownMenu.appendChild(item);
    });
    const oldSelectedDevice = currentDevice;
    currentDevice = currentDeviceList.includes(currentDevice)
      ? currentDevice
      : currentDeviceList[0];
    selectedText.textContent = currentDevice;
    if (oldSelectedDevice !== currentDevice) {
      refreshCurrentTabData();
    }
  } else {
    currentDevice = null;
    selectedText.textContent = "No devices found";
    clearDashboard();
    document.getElementById("device-file-list-container").innerHTML = "";
    document.getElementById("app-list").innerHTML = "";
  }
}

function refreshCurrentTabData() {
  if (!currentDevice) return;
  const activeTabEl = document.querySelector(".app-nav .nav-btn.active");
  if (!activeTabEl) return;
  const activeTabId = activeTabEl.dataset.tab;
  if (activeTabId === "dashboard-tab") updateDashboard();
  else if (activeTabId === "files-tab") listDeviceFiles(currentDevicePath);
  else if (activeTabId === "apps-tab") listApps(currentAppFilter);
  else if (activeTabId === "device-tab") checkAllToggleStates();
}

function clearDashboard() {
  document.getElementById("info-model").textContent = "...";
  document.getElementById("info-brand").textContent = "...";
  document.getElementById("info-version").textContent = "...";
  document.getElementById("info-build").textContent = "...";
  document.getElementById("info-cpu").textContent = "...";
  document.getElementById("info-battery").textContent = "...";
  document.getElementById("info-ram-text").textContent = "...";
  document.getElementById("info-ram-bar").style.width = "0%";
  document.getElementById("info-resolution").textContent = "...";
  document.getElementById("info-density").textContent = "...";
  document.getElementById("info-ip").textContent = "...";
  document.getElementById("info-mac").textContent = "...";
}

function updateDashboard() {
  const device = getSelectedDevice();
  if (!device) return;
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
    runCommand("adb.exe", ["-s", device, ...commands[key]], true, key);
  }
}

function parseDashboardData(data, commandKey) {
  try {
    if (commandKey === "props") {
      const getProp = (key) =>
        (data.match(new RegExp(`\\[${key}\\]: \\[(.*?)\\]`)) || [])[1];
      document.getElementById("info-model").textContent =
        getProp("ro.product.model") || "N/A";
      document.getElementById("info-brand").textContent =
        getProp("ro.product.brand") || "N/A";
      document.getElementById("info-version").textContent = `Android ${
        getProp("ro.build.version.release") || "?"
      } (API ${getProp("ro.build.version.sdk") || "?"})`;
      document.getElementById("info-build").textContent =
        getProp("ro.build.display.id") || "N/A";
    } else if (commandKey === "battery") {
      const level = (data.match(/level: (\d+)/) || [])[1];
      const statusNum = (data.match(/status: (\d+)/) || [])[1];
      const statusMap = {
        2: "Charging",
        3: "Discharging",
        4: "Not Charging",
        5: "Full",
      };
      document.getElementById("info-battery").textContent = level
        ? `${level}% (${statusMap[statusNum] || "Unknown"})`
        : "N/A";
    } else if (commandKey === "network") {
      const ip = (data.match(/inet (\d+\.\d+\.\d+\.\d+)/) || [])[1];
      const mac = (data.match(/link\/ether ([\da-fA-F:]+)/) || [])[1];
      document.getElementById("info-ip").textContent = ip || "N/A";
      document.getElementById("info-mac").textContent = mac || "N/A";
    } else if (commandKey === "cpu") {
      const load = (data.match(/Load: ([\d.]+)/) || [])[1];
      document.getElementById("info-cpu").textContent = load
        ? `${load}`
        : "N/A";
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
        document.getElementById("info-ram-text").textContent = `${(
          usedRamKB /
          1024 /
          1024
        ).toFixed(2)} GB / ${(totalRamKB / 1024 / 1024).toFixed(2)} GB`;
        document.getElementById("info-ram-bar").style.width = `${percentage}%`;
      }
    } else if (commandKey === "screenSize") {
      const resolution = (data.match(/Physical size: ([\dx]+)/) || [])[1];
      document.getElementById("info-resolution").textContent =
        resolution || "N/A";
    } else if (commandKey === "screenDensity") {
      const density = (data.match(/Physical density: (\d+)/) || [])[1];
      document.getElementById("info-density").textContent = density
        ? `${density} dpi`
        : "N/A";
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

function renderBreadcrumbs() {
  const container = document.getElementById("file-breadcrumbs");
  container.innerHTML = "";
  const parts = currentDevicePath.split("/").filter((p) => p);
  let pathOnClick = "/";
  const rootEl = document.createElement("span");
  rootEl.className = "breadcrumb-item";
  rootEl.textContent = "/";
  rootEl.onclick = () => listDeviceFiles("/");
  container.appendChild(rootEl);
  parts.forEach((part) => {
    pathOnClick = path.join(pathOnClick, part);
    const separator = document.createElement("span");
    separator.className = "breadcrumb-separator";
    separator.textContent = "›";
    container.appendChild(separator);
    const el = document.createElement("span");
    el.className = "breadcrumb-item";
    el.textContent = part;
    const finalPath = pathOnClick;
    el.onclick = () => listDeviceFiles(finalPath);
    container.appendChild(el);
  });
}

function listDeviceFiles(dirPath) {
  const device = getSelectedDevice();
  if (!device) {
    document.getElementById("device-file-list-container").innerHTML =
      '<div style="text-align:center; color: var(--cool-gray); padding: 20px;">Please select a device.</div>';
    return;
  }
  currentDevicePath = dirPath;
  selectedFileItem = null;
  renderBreadcrumbs();
  runCommand(
    "adb.exe",
    ["-s", device, "shell", `ls -F "${dirPath}"`],
    false,
    "device-ls"
  );
}

function parseAndRenderDeviceFiles(data) {
  const files = data
    .split("\n")
    .map((name) => name.trim())
    .filter(
      (name) => name && !name.startsWith("ls:") && name !== "." && name !== ".."
    );
  const fileObjects = files.map((name) => ({
    name: name.replace(/\/$/, ""),
    isDirectory: name.endsWith("/"),
  }));
  const listEl = document.getElementById("device-file-list-container");
  listEl.innerHTML = "";
  listEl.className = `file-list-container ${fileViewMode}-view`;
  fileObjects.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });
  if (fileObjects.length === 0) {
    listEl.innerHTML =
      '<div style="grid-column: 1 / -1; text-align: center; color: var(--cool-gray);">Folder is empty.</div>';
    return;
  }
  fileObjects.forEach((file) => {
    const item = document.createElement("div");
    item.className = "file-item";
    item.dataset.name = file.name;
    item.dataset.isDirectory = file.isDirectory;
    const icon = file.isDirectory ? "fa-folder" : "fa-file-alt";
    item.innerHTML = `<i class="fa-solid ${icon}"></i> <span title="${file.name}">${file.name}</span>`;
    listEl.appendChild(item);
  });
}

function showContextMenu(x, y) {
  const menu = document.getElementById("file-context-menu");
  const isFolder = contextMenuTarget && contextMenuTarget.isDirectory;
  const isFile = contextMenuTarget && !contextMenuTarget.isDirectory;
  const isNothing = !contextMenuTarget;
  menu.querySelector('[data-action="open"]').style.display = isFolder
    ? "flex"
    : "none";
  menu.querySelector('[data-action="download"]').style.display = isFile
    ? "flex"
    : "none";
  menu.querySelector('[data-action="rename"]').style.display = isNothing
    ? "none"
    : "flex";
  menu.querySelector('[data-action="delete"]').style.display = isNothing
    ? "none"
    : "flex";
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.style.display = "block";
}

function hideContextMenu() {
  document.getElementById("file-context-menu").style.display = "none";
}

function showInputModal(title, promptText, initialValue = "") {
  return new Promise((resolve) => {
    const modal = document.getElementById("input-modal");
    const input = document.getElementById("input-modal-field");
    const okBtn = document.getElementById("input-modal-ok");
    const cancelBtn = document.getElementById("input-modal-cancel");
    const closeBtn = document.getElementById("input-modal-close");
    document.getElementById("input-modal-title").textContent = title;
    document.getElementById("input-modal-prompt").textContent = promptText;
    input.value = initialValue;
    const cleanupAndResolve = (value) => {
      modal.classList.remove("active");
      okBtn.removeEventListener("click", okHandler);
      cancelBtn.removeEventListener("click", cancelHandler);
      closeBtn.removeEventListener("click", closeHandler);
      resolve(value);
    };
    const okHandler = () => cleanupAndResolve(input.value);
    const cancelHandler = () => cleanupAndResolve(null);
    const closeHandler = () => cleanupAndResolve(null);
    okBtn.addEventListener("click", okHandler, { once: true });
    cancelBtn.addEventListener("click", cancelHandler, { once: true });
    closeBtn.addEventListener("click", closeHandler, { once: true });
    modal.classList.add("active");
    input.focus();
    input.select();
  });
}

function listApps(filter) {
  const device = getSelectedDevice();
  if (!device) return;
  document.getElementById("app-list").innerHTML =
    '<div class="app-list-placeholder">Loading apps...</div>';
  let args = ["shell", "pm", "list", "packages", "-e"];
  if (filter === "system") args.push("-s");
  if (filter === "user") args.push("-3");
  runCommand("adb.exe", ["-s", device, ...args], false, "list-apps");
}

function populateAppList(data) {
  const appList = document.getElementById("app-list");
  appList.innerHTML = "";
  const apps = data
    .split("\n")
    .map((line) => line.replace("package:", "").trim())
    .filter(Boolean);
  if (apps.length === 0) {
    appList.innerHTML =
      '<div class="app-list-placeholder">No apps found.</div>';
    return;
  }
  apps.sort().forEach((pkg) => {
    const item = document.createElement("div");
    item.className = "app-item";
    item.dataset.pkg = pkg;
    item.innerHTML = `<div class="app-item-name" title="${pkg}">${pkg}</div>`;
    appList.appendChild(item);
  });
  applyAppSearchFilter();
}

function applyAppSearchFilter() {
  const filter = document
    .getElementById("app-search-input")
    .value.toLowerCase();
  let visibleCount = 0;
  document.querySelectorAll("#app-list .app-item").forEach((item) => {
    const pkg = item.dataset.pkg.toLowerCase();
    const name = item.querySelector(".app-item-name").textContent.toLowerCase();
    const isVisible = name.includes(filter) || pkg.includes(filter);
    item.style.display = isVisible ? "flex" : "none";
    if (isVisible) visibleCount++;
  });
  if (
    visibleCount === 0 &&
    document.getElementById("app-list").children.length > 0
  ) {
    if (!document.getElementById("no-results")) {
      const noResults = document.createElement("div");
      noResults.id = "no-results";
      noResults.className = "app-list-placeholder";
      noResults.textContent = "No matching apps found.";
      document.getElementById("app-list").appendChild(noResults);
    }
  } else {
    document.getElementById("no-results")?.remove();
  }
}

function showAppDetails(pkg) {
  document.getElementById("app-details-placeholder").classList.add("hidden");
  const content = document.getElementById("app-details-content");
  content.classList.remove("hidden");
  content.dataset.pkg = pkg;

  const dbInfo = debloatDB[pkg] || {};

  const info = {
    id: pkg,
    name: dbInfo.name || pkg.split(".").pop(),
    description:
      dbInfo.description ||
      "No information available for this package. Research before taking any action.",
    safety: dbInfo.safety || "unknown",
  };

  document.getElementById("details-app-name").textContent = info.name;
  document.getElementById("details-app-pkg").textContent = info.id;
  document.getElementById("details-app-desc").textContent = info.description;

  const safetyBadge = document.getElementById("details-app-safety");

  const safetyText = (info.safety || "unknown")
    .toLowerCase()
    .replace("recommended", "safe");

  safetyBadge.textContent = safetyText;
  let safetyClass = "unknown";
  if (["safe"].includes(safetyText)) safetyClass = "safe";
  else if (["caution", "advanced"].includes(safetyText))
    safetyClass = "caution";
  else if (["unsafe", "expert"].includes(safetyText)) safetyClass = "unsafe";
  safetyBadge.className = `safety-badge ${safetyClass}`;
}

function checkAllToggleStates() {
  const device = getSelectedDevice();
  if (!device) return;
  Object.keys(devToggles).forEach((key) => checkToggleState(key, true));
}

function checkToggleState(stateKey, isBackgroundTask = false) {
  const device = getSelectedDevice();
  if (!device) return;
  const propMap = {
    layout: "debug.layout",
    overdraw: "debug.hwui.show_overdraw",
    pointer: "debug.pointer_location",
  };
  runCommand(
    "adb.exe",
    ["-s", device, "shell", "getprop", propMap[stateKey]],
    isBackgroundTask,
    `toggle-${stateKey}`
  );
}

async function parseDebloatDB(dbArray) {
  const formattedDB = {};
  if (!Array.isArray(dbArray)) {
    logToSession(
      "ERROR: Could not parse debloat_db.json. It must be an array of objects.",
      "ERROR"
    );
    return {};
  }
  for (const item of dbArray) {
    if (item && item.id) {
      formattedDB[item.id] = {
        name: item.name || item.list || item.id.split(".").pop(),
        description: item.description || "No description available.",
        safety: item.safety || item.removal || "unknown",
      };
    }
  }
  return formattedDB;
}

document.addEventListener("DOMContentLoaded", async () => {
  const logoImg = document.getElementById("header-logo-img");
  try {
    const logoPath = await window.electronAPI.getLogoPath();
    logoImg.src = logoPath.replace(/\\/g, "/");
  } catch (error) {
    console.error("Failed to load logo:", error);
  }

  sessionLog = document.getElementById("session-log");
  try {
    const rawDebloatDB = await window.electronAPI.getDebloatInfo();
    debloatDB = await parseDebloatDB(rawDebloatDB);
  } catch (e) {
    logToSession(
      "FATAL: Failed to load or parse debloat_db.json. " + e.message,
      "ERROR"
    );
  }

  const getEl = (id) => document.getElementById(id);

  window.electronAPI.onCommandOutput((output, commandKey) => {
    setBusy(false);
    const msg = output.replace(/^(ERROR|SUCCESS):/i, "").trim();
    if (commandKey === "adb-devices") {
      populateDeviceList(msg);
      return;
    }
    if (commandKey === "device-ls") {
      parseAndRenderDeviceFiles(msg);
      return;
    }
    if (commandKey === "list-apps") {
      populateAppList(msg);
      return;
    }
    if (commandKey && commandKey.startsWith("toggle-")) {
      const key = commandKey.split("-")[1];
      devToggles[key] = msg.includes("true") || msg.includes("1");
      const buttonId = `toggle-${key
        .replace("overdraw", "gpu-overdraw")
        .replace("pointer", "pointer-location")
        .replace("layout", "layout-bounds")}`;
      getEl(buttonId)?.classList.toggle("active", devToggles[key]);
      return;
    }
    if (commandKey) {
      parseDashboardData(msg, commandKey);
      return;
    }
    if (output.startsWith("ERROR:") || !/Success/i.test(msg)) {
      logToSession(
        output.replace(/^(ERROR|SUCCESS):/i, "").trim(),
        output.startsWith("ERROR:") ? "ERROR" : "INFO"
      );
    }
  });

  document.querySelectorAll(".app-nav .nav-btn").forEach((btn) =>
    btn.addEventListener("click", (e) => {
      const targetTab = e.currentTarget.dataset.tab;
      document
        .querySelectorAll(".app-nav .nav-btn, .app-main-content .tab-content")
        .forEach((el) => el.classList.remove("active"));
      e.currentTarget.classList.add("active");
      getEl(targetTab).classList.add("active");
      refreshCurrentTabData();
    })
  );

  getEl("refresh-devices-btn").addEventListener("click", () =>
    refreshDevices(false)
  );
  const deviceDropdown = getEl("device-dropdown");
  deviceDropdown
    .querySelector(".dropdown-selected")
    .addEventListener("click", (e) => {
      e.stopPropagation();
      deviceDropdown.querySelector(".dropdown-menu").classList.toggle("open");
    });

  getEl("start-scrcpy-btn").addEventListener("click", () => {
    const device = getSelectedDevice();
    if (!device) return;
    const args = [];
    if (getEl("bit-rate").value)
      args.push("--video-bit-rate", getEl("bit-rate").value);
    if (getEl("record-screen").checked)
      args.push("--record", `scrcpy-record-${Date.now()}.mp4`);
    if (getEl("fullscreen").checked) args.push("--fullscreen");
    if (getEl("turn-screen-off").checked) args.push("--turn-screen-off");
    if (getEl("show-touches").checked) args.push("--show-touches");
    if (getEl("stay-awake").checked) args.push("--stay-awake");
    if (getEl("power-off-on-close").checked) args.push("--power-off-on-close");
    runCommand("scrcpy.exe", ["-s", device, ...args], true);
  });

  const fileListContainer = getEl("device-file-list-container");
  fileListContainer.addEventListener("click", (e) => {
    const itemEl = e.target.closest(".file-item");
    if (!itemEl) return;
    fileListContainer
      .querySelectorAll(".file-item.selected")
      .forEach((el) => el.classList.remove("selected"));
    itemEl.classList.add("selected");
    selectedFileItem = {
      name: itemEl.dataset.name,
      isDirectory: itemEl.dataset.isDirectory === "true",
    };
  });
  fileListContainer.addEventListener("dblclick", (e) => {
    const itemEl = e.target.closest(".file-item");
    if (itemEl && itemEl.dataset.isDirectory === "true") {
      listDeviceFiles(path.join(currentDevicePath, itemEl.dataset.name));
    }
  });
  fileListContainer.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const itemEl = e.target.closest(".file-item");
    contextMenuTarget = itemEl
      ? {
          name: itemEl.dataset.name,
          isDirectory: itemEl.dataset.isDirectory === "true",
        }
      : null;
    if (itemEl) {
      fileListContainer
        .querySelectorAll(".file-item.selected")
        .forEach((el) => el.classList.remove("selected"));
      itemEl.classList.add("selected");
      selectedFileItem = contextMenuTarget;
    }
    showContextMenu(e.clientX, e.clientY);
  });
  getEl("file-view-list-btn").addEventListener("click", () => {
    fileViewMode = "list";
    listDeviceFiles(currentDevicePath);
  });
  getEl("file-view-icon-btn").addEventListener("click", () => {
    fileViewMode = "icon";
    listDeviceFiles(currentDevicePath);
  });
  getEl("file-context-menu").addEventListener("click", async (e) => {
    hideContextMenu();
    const action = e.target.closest(".context-item")?.dataset.action;
    if (!action) return;
    const item = contextMenuTarget;
    const device = getSelectedDevice();
    if (!device) return;
    const targetPath = item
      ? path.join(currentDevicePath, item.name)
      : currentDevicePath;
    if (action === "open" && item?.isDirectory) {
      listDeviceFiles(targetPath);
    } else if (action === "download" && item && !item.isDirectory) {
      const destination = await window.electronAPI.saveFile(item.name);
      if (!destination) return;
      runCommand("adb.exe", [
        "-s",
        device,
        "pull",
        `"${targetPath}"`,
        `"${destination}"`,
      ]);
    } else if (action === "rename" && item) {
      const newName = await showInputModal(
        "Rename",
        `Enter new name for "${item.name}":`,
        item.name
      );
      if (newName && newName !== item.name) {
        runCommand("adb.exe", [
          "-s",
          device,
          "shell",
          `mv "${targetPath}" "${path.join(currentDevicePath, newName)}"`,
        ]);
        setTimeout(() => listDeviceFiles(currentDevicePath), 500);
      }
    } else if (action === "delete" && item) {
      if (
        confirm(`Are you sure you want to permanently delete "${item.name}"?`)
      ) {
        runCommand("adb.exe", [
          "-s",
          device,
          "shell",
          `rm -rf "${targetPath}"`,
        ]);
        setTimeout(() => listDeviceFiles(currentDevicePath), 500);
      }
    } else if (action === "new-folder") {
      const folderName = await showInputModal(
        "New Folder",
        "Enter new folder name:"
      );
      if (folderName) {
        runCommand("adb.exe", [
          "-s",
          device,
          "shell",
          `mkdir "${path.join(currentDevicePath, folderName)}"`,
        ]);
        setTimeout(() => listDeviceFiles(currentDevicePath), 500);
      }
    }
  });

  document.querySelectorAll(".app-filter-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document
        .querySelectorAll(".app-filter-btn")
        .forEach((b) => b.classList.remove("active"));
      e.currentTarget.classList.add("active");
      currentAppFilter = e.currentTarget.dataset.filter;
      listApps(currentAppFilter);
    });
  });
  getEl("refresh-app-list-btn").addEventListener("click", () =>
    listApps(currentAppFilter)
  );
  getEl("app-search-input").addEventListener("input", applyAppSearchFilter);
  getEl("app-list").addEventListener("click", (e) => {
    const itemEl = e.target.closest(".app-item");
    if (!itemEl) return;
    document
      .querySelectorAll("#app-list .app-item.selected")
      .forEach((el) => el.classList.remove("selected"));
    itemEl.classList.add("selected");
    showAppDetails(itemEl.dataset.pkg);
  });
  getEl("app-details-content").addEventListener("click", (e) => {
    const button = e.target.closest("button");
    if (!button) return;
    const actionId = button.id;
    const pkg = e.currentTarget.dataset.pkg;
    const device = getSelectedDevice();
    if (!pkg || !device) return;
    let cmd, args;
    if (actionId === "details-action-uninstall") {
      if (
        !confirm(
          `Uninstalling apps can be risky. Are you sure you want to uninstall ${pkg}?`
        )
      )
        return;
      cmd = "shell";
      args = ["pm", "uninstall", "-k", "--user", "0", pkg];
    } else if (actionId === "details-action-disable") {
      if (
        !confirm(`Disable ${pkg}? This is generally safer than uninstalling.`)
      )
        return;
      cmd = "shell";
      args = ["pm", "disable-user", "--user", "0", pkg];
    } else if (actionId === "details-action-clear") {
      if (
        !confirm(`This will permanently delete all data for ${pkg}. Continue?`)
      )
        return;
      cmd = "shell";
      args = ["pm", "clear", pkg];
    } else if (actionId === "details-action-stop") {
      cmd = "shell";
      args = ["am", "force-stop", pkg];
    }
    if (cmd) {
      runCommand("adb.exe", ["-s", device, ...args]);
      if (actionId.includes("uninstall") || actionId.includes("disable")) {
        setTimeout(() => listApps(currentAppFilter), 1000);
      }
    }
  });

  const rebootBtns = {
    "reboot-system-btn": "reboot",
    "reboot-recovery-btn": "reboot recovery",
    "reboot-bootloader-btn": "reboot bootloader",
    "reboot-safemode-btn": "reboot userspace",
  };
  Object.entries(rebootBtns).forEach(([id, cmd]) =>
    getEl(id).addEventListener("click", () => {
      const d = getSelectedDevice();
      if (d && confirm(`Are you sure you want to ${cmd}?`))
        runCommand("adb.exe", ["-s", d, ...cmd.split(" ")]);
    })
  );
  getEl("screenshot-btn").addEventListener("click", async () => {
    const d = getSelectedDevice();
    if (!d) return;
    const remotePath = `/sdcard/screenshot_${Date.now()}.png`;
    const destination = await window.electronAPI.saveFile(
      remotePath.split("/").pop()
    );
    if (!destination) return;
    runCommand("adb.exe", ["-s", d, "shell", "screencap", "-p", remotePath]);
    setTimeout(() => {
      runCommand("adb.exe", ["-s", d, "pull", remotePath, `"${destination}"`]);
      setTimeout(
        () => runCommand("adb.exe", ["-s", d, "shell", "rm", remotePath]),
        2000
      );
    }, 1000);
  });
  getEl("enable-wireless-btn").addEventListener("click", () => {
    const d = getSelectedDevice();
    if (d) runCommand("adb.exe", ["-s", d, "tcpip", "5555"]);
  });
  getEl("connect-ip-btn").addEventListener("click", () => {
    const ip = getEl("device-ip").value;
    if (ip) runCommand("adb.exe", ["connect", `${ip}:5555`]);
  });
  Object.entries({
    "toggle-layout-bounds": "layout",
    "toggle-gpu-overdraw": "overdraw",
    "toggle-pointer-location": "pointer",
  }).forEach(([id, key]) => {
    getEl(id).addEventListener("click", (e) => {
      const d = getSelectedDevice();
      if (!d) return;
      devToggles[key] = !devToggles[key];
      e.currentTarget.classList.toggle("active", devToggles[key]);
      runCommand("adb.exe", [
        "-s",
        d,
        "shell",
        "setprop",
        `debug.${key === "overdraw" ? "hwui.show_overdraw" : key}`,
        devToggles[key] ? "true" : "false",
      ]);
      setTimeout(
        () =>
          runCommand("adb.exe", [
            "-s",
            d,
            "shell",
            "service",
            "call",
            "activity",
            "1599295570",
          ]),
        200
      );
    });
  });
  getEl("set-screen-props").addEventListener("click", () => {
    const d = getSelectedDevice();
    if (!d) return;
    const r = getEl("set-resolution").value;
    const p = getEl("set-density").value;
    if (r) runCommand("adb.exe", ["-s", d, "shell", "wm", "size", r]);
    if (p)
      setTimeout(
        () => runCommand("adb.exe", ["-s", d, "shell", "wm", "density", p]),
        200
      );
  });
  getEl("reset-screen-props").addEventListener("click", () => {
    const d = getSelectedDevice();
    if (!d) return;
    runCommand("adb.exe", ["-s", d, "shell", "wm", "size", "reset"]);
    setTimeout(
      () => runCommand("adb.exe", ["-s", d, "shell", "wm", "density", "reset"]),
      200
    );
  });
  const quickCmdDropdown = getEl("quick-command-dropdown");
  const quickCmds = {
    "Battery Stats": "dumpsys battery",
    "Display Info": "dumpsys display",
    "Memory Info": "dumpsys meminfo",
    "Active Services": "dumpsys activity services",
    "Get All Props": "getprop",
  };
  Object.entries(quickCmds).forEach(([n, c]) => {
    const i = document.createElement("div");
    i.className = "dropdown-item";
    i.textContent = n;
    i.dataset.value = c;
    i.addEventListener("click", () => {
      quickCmdDropdown.querySelector("span").textContent = n;
      quickCmdDropdown.dataset.value = c;
    });
    quickCmdDropdown.querySelector(".dropdown-menu").appendChild(i);
  });
  quickCmdDropdown
    .querySelector(".dropdown-selected")
    .addEventListener("click", (e) => {
      e.stopPropagation();
      quickCmdDropdown.querySelector(".dropdown-menu").classList.toggle("open");
    });
  getEl("run-quick-command").addEventListener("click", () => {
    const d = getSelectedDevice();
    const c = quickCmdDropdown.dataset.value;
    if (!d || !c) return;
    runCommand(
      "adb.exe",
      ["-s", d, "shell", ...c.split(" ")],
      false,
      "dumpsys"
    );
  });
  const remoteKeycodes = {
    "remote-dpad-up": 19,
    "remote-dpad-down": 20,
    "remote-dpad-left": 21,
    "remote-dpad-right": 22,
    "remote-dpad-center": 23,
    "remote-home-btn": 3,
    "remote-back-btn": 4,
    "remote-recents-btn": 187,
    "remote-vol-up-btn": 24,
    "remote-vol-down-btn": 25,
    "remote-prev-btn": 88,
    "remote-next-btn": 87,
    "remote-play-pause-btn": 85,
  };
  Object.entries(remoteKeycodes).forEach(([id, keycode]) =>
    getEl(id).addEventListener("click", () => {
      const d = getSelectedDevice();
      if (d)
        runCommand(
          "adb.exe",
          ["-s", d, "shell", "input", "keyevent", keycode],
          true
        );
    })
  );
  const sendText = () => {
    const d = getSelectedDevice();
    const t = getEl("send-text-input");
    if (d && t.value) {
      runCommand(
        "adb.exe",
        [
          "-s",
          d,
          "shell",
          "input",
          "text",
          `"${t.value.replace(/"/g, '\\"')}"`,
        ],
        true
      );
      t.value = "";
    }
  };
  getEl("send-text-btn").addEventListener("click", sendText);
  getEl("send-text-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendText();
  });

  document.addEventListener("click", () => {
    hideContextMenu();
    deviceDropdown.querySelector(".dropdown-menu").classList.remove("open");
  });
  setInterval(() => refreshDevices(true), 5000);
  refreshDevices();
  logToSession("A.S.C.E.N.D. Initialized. Awaiting device connection...");
});
