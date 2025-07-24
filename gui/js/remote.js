// remote.js
import { state } from "./state.js";
import { runCommand } from "./adb.js";
import { $ } from "./utils.js";

export function initRemote() {
  const remoteKeycodes = {
    "remote-dpad-up": 19,
    "remote-dpad-down": 20,
    "remote-dpad-left": 21,
    "remote-dpad-right": 22,
    "remote-dpad-center": 66,
    "remote-home-btn": 3,
    "remote-back-btn": 4,
    "remote-recents-btn": 187,
    "remote-vol-up-btn": 24,
    "remote-vol-down-btn": 25,
    "remote-prev-btn": 88,
    "remote-next-btn": 87,
    "remote-play-pause-btn": 85,
  };

  Object.entries(remoteKeycodes).forEach(([id, keycode]) => {
    $(id)?.addEventListener("click", () => {
      runCommand("adb", ["shell", "input", "keyevent", keycode], true);
    });
  });

  const sendText = () => {
    const textInput = $("send-text-input");
    if (textInput.value) {
      runCommand(
        "adb",
        ["shell", "input", "text", textInput.value.replace(/ /g, "%s")],
        true
      );
      textInput.value = "";
    }
  };

  $("send-text-btn")?.addEventListener("click", sendText);
  $("send-text-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendText();
  });
}
