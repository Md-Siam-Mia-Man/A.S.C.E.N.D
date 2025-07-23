export const state = {
  currentDevice: null,
  currentDeviceList: [],
  debloatDB: {},
  currentDevicePath: "/sdcard/",
  fileViewMode: "list",
  selectedFileItem: null,
  contextMenuTarget: null,
  currentAppFilter: "all",
  devToggles: {
    layout: false,
    overdraw: false,
    pointer: false,
  },
  isBusy: false,
};

export const dom = {
  sessionLog: document.getElementById("session-log"),
  logcatLog: document.getElementById("logcat-log"),
};

export const path = {
  join: (...args) =>
    args
      .map((arg) => arg.replace(/\/$/, ""))
      .filter(Boolean)
      .join("/")
      .replace(/\/+/g, "/"),
};
