import { state } from "./state.js";
import { runCommand } from "./adb.js";

export function initRemoteTab() {
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
    document.getElementById(id).addEventListener("click", () => {
      if (state.currentDevice)
        runCommand(
          "adb.exe",
          ["-s", state.currentDevice, "shell", "input", "keyevent", keycode],
          true
        );
    })
  );

  const sendText = () => {
    const textInput = document.getElementById("send-text-input");
    if (state.currentDevice && textInput.value) {
      runCommand(
        "adb.exe",
        [
          "-s",
          state.currentDevice,
          "shell",
          "input",
          "text",
          `"${textInput.value.replace(/"/g, '\\"')}"`,
        ],
        true
      );
      textInput.value = "";
    }
  };

  document.getElementById("send-text-btn").addEventListener("click", sendText);
  document
    .getElementById("send-text-input")
    .addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendText();
    });
}
