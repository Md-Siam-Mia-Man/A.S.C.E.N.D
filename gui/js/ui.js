import { state, dom } from "./state.js";
import { refreshCurrentTabData } from "./renderer.js";

export function setBusy(isBusy) {
  state.isBusy = isBusy;
  document.body.classList.toggle("is-busy", isBusy);
  document.getElementById("busy-indicator").classList.toggle("active", isBusy);
}

export function logToSession(message, type = "INFO") {
  if (!dom.sessionLog) return;
  const entry = document.createElement("div");
  entry.textContent = `[${new Date().toLocaleTimeString()}] [${type}] ${message}`;
  dom.sessionLog.appendChild(entry);
  dom.sessionLog.scrollTop = dom.sessionLog.scrollHeight;
}

export function showInputModal(title, promptText, initialValue = "") {
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

export function initTabs() {
  document.querySelectorAll(".app-nav .nav-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const targetTab = e.currentTarget.dataset.tab;
      document
        .querySelectorAll(".app-nav .nav-btn, .app-main-content .tab-content")
        .forEach((el) => el.classList.remove("active"));
      e.currentTarget.classList.add("active");
      document.getElementById(targetTab).classList.add("active");
      refreshCurrentTabData();
    });
  });
}

export function initDropdowns() {
  const deviceDropdown = document.getElementById("device-dropdown");
  deviceDropdown
    .querySelector(".dropdown-selected")
    .addEventListener("click", (e) => {
      e.stopPropagation();
      deviceDropdown.querySelector(".dropdown-menu").classList.toggle("open");
    });

  const quickCmdDropdown = document.getElementById("quick-command-dropdown");
  quickCmdDropdown
    .querySelector(".dropdown-selected")
    .addEventListener("click", (e) => {
      e.stopPropagation();
      quickCmdDropdown.querySelector(".dropdown-menu").classList.toggle("open");
    });

  document.addEventListener("click", () => {
    deviceDropdown.querySelector(".dropdown-menu").classList.remove("open");
    quickCmdDropdown.querySelector(".dropdown-menu").classList.remove("open");
  });
}

export function clearDashboard() {
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

export function updateDashboardUI(key, value) {
  const element = document.getElementById(key);
  if (element) {
    element.textContent = value;
  }
}

export function updateRamUI(text, percentage) {
  document.getElementById("info-ram-text").textContent = text;
  document.getElementById("info-ram-bar").style.width = `${percentage}%`;
}
