import { state } from "./state.js";
import { runCommand } from "./adb.js";

const getEl = (id) => document.getElementById(id);

export function parseToggleState(msg, commandKey) {
  const key = commandKey.split("-")[1];
  state.devToggles[key] = msg.includes("true") || msg.includes("1");
  const buttonId = `toggle-${key
    .replace("overdraw", "gpu-overdraw")
    .replace("pointer", "pointer-location")
    .replace("layout", "layout-bounds")}`;
  getEl(buttonId)?.classList.toggle("active", state.devToggles[key]);
}

export function checkAllToggleStates() {
  if (!state.currentDevice) return;
  Object.keys(state.devToggles).forEach((key) => checkToggleState(key, true));
}

function checkToggleState(stateKey, isBackgroundTask = false) {
  if (!state.currentDevice) return;
  const propMap = {
    layout: "debug.layout",
    overdraw: "debug.hwui.show_overdraw",
    pointer: "debug.pointer_location",
  };
  runCommand(
    "adb.exe",
    ["-s", state.currentDevice, "shell", "getprop", propMap[stateKey]],
    isBackgroundTask,
    `toggle-${stateKey}`
  );
}

export function initScrcpyTab() {
  getEl("start-scrcpy-btn").addEventListener("click", () => {
    if (!state.currentDevice) return;
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
    runCommand("scrcpy.exe", ["-s", state.currentDevice, ...args], true);
  });
}

export function initDeviceTab() {
  const rebootBtns = {
    "reboot-system-btn": "reboot",
    "reboot-recovery-btn": "reboot recovery",
    "reboot-bootloader-btn": "reboot bootloader",
    "reboot-safemode-btn": "reboot userspace",
  };
  Object.entries(rebootBtns).forEach(([id, cmd]) =>
    getEl(id).addEventListener("click", () => {
      if (state.currentDevice && confirm(`Are you sure you want to ${cmd}?`))
        runCommand("adb.exe", ["-s", state.currentDevice, ...cmd.split(" ")]);
    })
  );

  getEl("screenshot-btn").addEventListener("click", async () => {
    if (!state.currentDevice) return;
    const remotePath = `/sdcard/screenshot_${Date.now()}.png`;
    const destination = await window.electronAPI.saveFile(
      remotePath.split("/").pop()
    );
    if (!destination) return;
    runCommand("adb.exe", [
      "-s",
      state.currentDevice,
      "shell",
      "screencap",
      "-p",
      remotePath,
    ]);
    setTimeout(() => {
      runCommand("adb.exe", [
        "-s",
        state.currentDevice,
        "pull",
        remotePath,
        `"${destination}"`,
      ]);
      setTimeout(
        () =>
          runCommand("adb.exe", [
            "-s",
            state.currentDevice,
            "shell",
            "rm",
            remotePath,
          ]),
        2000
      );
    }, 1000);
  });

  getEl("enable-wireless-btn").addEventListener("click", () => {
    if (state.currentDevice)
      runCommand("adb.exe", ["-s", state.currentDevice, "tcpip", "5555"]);
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
      if (!state.currentDevice) return;
      state.devToggles[key] = !state.devToggles[key];
      e.currentTarget.classList.toggle("active", state.devToggles[key]);
      const prop =
        key === "overdraw" ? "debug.hwui.show_overdraw" : `debug.${key}`;
      runCommand("adb.exe", [
        "-s",
        state.currentDevice,
        "shell",
        "setprop",
        prop,
        state.devToggles[key] ? "true" : "false",
      ]);
      setTimeout(
        () =>
          runCommand("adb.exe", [
            "-s",
            state.currentDevice,
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
    if (!state.currentDevice) return;
    const res = getEl("set-resolution").value;
    const den = getEl("set-density").value;
    if (res)
      runCommand("adb.exe", [
        "-s",
        state.currentDevice,
        "shell",
        "wm",
        "size",
        res,
      ]);
    if (den)
      setTimeout(
        () =>
          runCommand("adb.exe", [
            "-s",
            state.currentDevice,
            "shell",
            "wm",
            "density",
            den,
          ]),
        200
      );
  });

  getEl("reset-screen-props").addEventListener("click", () => {
    if (!state.currentDevice) return;
    runCommand("adb.exe", [
      "-s",
      state.currentDevice,
      "shell",
      "wm",
      "size",
      "reset",
    ]);
    setTimeout(
      () =>
        runCommand("adb.exe", [
          "-s",
          state.currentDevice,
          "shell",
          "wm",
          "density",
          "reset",
        ]),
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
  Object.entries(quickCmds).forEach(([name, cmd]) => {
    const item = document.createElement("div");
    item.className = "dropdown-item";
    item.textContent = name;
    item.dataset.value = cmd;
    item.addEventListener("click", () => {
      quickCmdDropdown.querySelector("span").textContent = name;
      quickCmdDropdown.dataset.value = cmd;
    });
    quickCmdDropdown.querySelector(".dropdown-menu").appendChild(item);
  });

  getEl("run-quick-command").addEventListener("click", () => {
    const cmd = quickCmdDropdown.dataset.value;
    if (!state.currentDevice || !cmd) return;
    runCommand(
      "adb.exe",
      ["-s", state.currentDevice, "shell", ...cmd.split(" ")],
      false,
      "dumpsys"
    );
  });
}
