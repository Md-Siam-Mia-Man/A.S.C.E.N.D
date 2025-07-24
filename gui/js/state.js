// state.js

export const state = {
  // Device State
  currentDevice: null,
  currentDeviceList: [],

  // UI State
  isBusy: false,
  activeTab: "dashboard-tab",
  isSidebarCollapsed: true,

  // Debloater State
  debloatDB: {},
  currentAppFilter: "all",
  selectedApp: null,

  // File Explorer State
  currentDevicePath: "/sdcard/",
  fileViewMode: "list",
  selectedFileItem: null,
  contextMenuTarget: null,

  // Device Toggles State
  devToggles: {
    layout: false,
    overdraw: false,
    pointer: false,
  },
};
