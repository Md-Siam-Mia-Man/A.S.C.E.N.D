// scrcpy.js
import { state } from "./state.js";
import { runCommand } from "./adb.js";
import { $ } from "./utils.js";

export function initScrcpy() {
  $("start-scrcpy-btn")?.addEventListener("click", () => {
    if (!state.currentDevice) return;
    const args = [];
    if ($("bit-rate").value) args.push("--video-bit-rate", $("bit-rate").value);
    if ($("record-screen").checked)
      args.push("--record", `scrcpy-record-${Date.now()}.mp4`);
    if ($("fullscreen").checked) args.push("--fullscreen");
    if ($("turn-screen-off").checked) args.push("--turn-screen-off");
    if ($("show-touches").checked) args.push("--show-touches");
    if ($("stay-awake").checked) args.push("--stay-awake");
    if ($("power-off-on-close").checked) args.push("--power-off-on-close");
    runCommand("scrcpy", args, true);
  });
}
