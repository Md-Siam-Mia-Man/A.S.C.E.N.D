import { state } from "./state.js";
import { runCommand } from "./adb.js";

export function listApps(filter) {
  if (!state.currentDevice) return;
  document.getElementById("app-list").innerHTML =
    '<div class="app-list-placeholder">Loading apps...</div>';
  let args = ["shell", "pm", "list", "packages", "-e"];
  if (filter === "system") args.push("-s");
  if (filter === "user") args.push("-3");
  runCommand(
    "adb.exe",
    ["-s", state.currentDevice, ...args],
    false,
    "list-apps"
  );
}

export function populateAppList(data) {
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

  const noResultsEl = document.getElementById("no-results");
  if (
    visibleCount === 0 &&
    document.getElementById("app-list").children.length > 0
  ) {
    if (!noResultsEl) {
      const noResults = document.createElement("div");
      noResults.id = "no-results";
      noResults.className = "app-list-placeholder";
      noResults.textContent = "No matching apps found.";
      document.getElementById("app-list").appendChild(noResults);
    }
  } else if (noResultsEl) {
    noResultsEl.remove();
  }
}

function showAppDetails(pkg) {
  document.getElementById("app-details-placeholder").classList.add("hidden");
  const content = document.getElementById("app-details-content");
  content.classList.remove("hidden");
  content.dataset.pkg = pkg;

  const dbInfo = state.debloatDB[pkg] || {};
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

export async function parseDebloatDB(dbArray) {
  const formattedDB = {};
  if (!Array.isArray(dbArray)) {
    console.error(
      "Could not parse debloat_db.json. It must be an array of objects."
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

export function initAppsTab() {
  document.querySelectorAll(".app-filter-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document
        .querySelectorAll(".app-filter-btn")
        .forEach((b) => b.classList.remove("active"));
      e.currentTarget.classList.add("active");
      state.currentAppFilter = e.currentTarget.dataset.filter;
      listApps(state.currentAppFilter);
    });
  });

  document
    .getElementById("refresh-app-list-btn")
    .addEventListener("click", () => listApps(state.currentAppFilter));
  document
    .getElementById("app-search-input")
    .addEventListener("input", applyAppSearchFilter);

  document.getElementById("app-list").addEventListener("click", (e) => {
    const itemEl = e.target.closest(".app-item");
    if (!itemEl) return;
    document
      .querySelectorAll("#app-list .app-item.selected")
      .forEach((el) => el.classList.remove("selected"));
    itemEl.classList.add("selected");
    showAppDetails(itemEl.dataset.pkg);
  });

  document
    .getElementById("app-details-content")
    .addEventListener("click", (e) => {
      const button = e.target.closest("button");
      if (!button) return;
      const actionId = button.id;
      const pkg = e.currentTarget.dataset.pkg;
      if (!pkg || !state.currentDevice) return;

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
          !confirm(
            `This will permanently delete all data for ${pkg}. Continue?`
          )
        )
          return;
        cmd = "shell";
        args = ["pm", "clear", pkg];
      } else if (actionId === "details-action-stop") {
        cmd = "shell";
        args = ["am", "force-stop", pkg];
      }

      if (cmd) {
        runCommand("adb.exe", ["-s", state.currentDevice, ...args]);
        if (actionId.includes("uninstall") || actionId.includes("disable")) {
          setTimeout(() => listApps(state.currentAppFilter), 1000);
        }
      }
    });
}
