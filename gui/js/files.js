import { state, path } from "./state.js";
import { runCommand } from "./adb.js";
import { showInputModal } from "./ui.js";

function renderBreadcrumbs() {
  const container = document.getElementById("file-breadcrumbs");
  container.innerHTML = "";
  const parts = state.currentDevicePath.split("/").filter((p) => p);

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

export function listDeviceFiles(dirPath) {
  if (!state.currentDevice) {
    document.getElementById("device-file-list-container").innerHTML =
      '<div style="text-align:center; color: var(--light-grey); padding: 20px;">Please select a device.</div>';
    return;
  }
  state.currentDevicePath = dirPath;
  state.selectedFileItem = null;
  renderBreadcrumbs();
  runCommand(
    "adb.exe",
    ["-s", state.currentDevice, "shell", `ls -F "${dirPath}"`],
    false,
    "device-ls"
  );
}

export function parseAndRenderDeviceFiles(data) {
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
  listEl.className = `file-list-container ${state.fileViewMode}-view`;

  fileObjects.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });

  if (fileObjects.length === 0) {
    listEl.innerHTML =
      '<div style="grid-column: 1 / -1; text-align: center; color: var(--light-grey);">Folder is empty.</div>';
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
  const isFolder =
    state.contextMenuTarget && state.contextMenuTarget.isDirectory;
  const isFile =
    state.contextMenuTarget && !state.contextMenuTarget.isDirectory;
  const isNothing = !state.contextMenuTarget;

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

export function initFileExplorer() {
  const fileListContainer = document.getElementById(
    "device-file-list-container"
  );

  fileListContainer.addEventListener("click", (e) => {
    const itemEl = e.target.closest(".file-item");
    if (!itemEl) return;
    fileListContainer
      .querySelectorAll(".file-item.selected")
      .forEach((el) => el.classList.remove("selected"));
    itemEl.classList.add("selected");
    state.selectedFileItem = {
      name: itemEl.dataset.name,
      isDirectory: itemEl.dataset.isDirectory === "true",
    };
  });

  fileListContainer.addEventListener("dblclick", (e) => {
    const itemEl = e.target.closest(".file-item");
    if (itemEl && itemEl.dataset.isDirectory === "true") {
      listDeviceFiles(path.join(state.currentDevicePath, itemEl.dataset.name));
    }
  });

  fileListContainer.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const itemEl = e.target.closest(".file-item");
    state.contextMenuTarget = itemEl
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
      state.selectedFileItem = state.contextMenuTarget;
    }
    showContextMenu(e.clientX, e.clientY);
  });

  document
    .getElementById("file-view-list-btn")
    .addEventListener("click", () => {
      state.fileViewMode = "list";
      parseAndRenderDeviceFiles(fileListContainer.innerHTML);
    });

  document
    .getElementById("file-view-icon-btn")
    .addEventListener("click", () => {
      state.fileViewMode = "icon";
      parseAndRenderDeviceFiles(fileListContainer.innerHTML);
    });

  document
    .getElementById("file-context-menu")
    .addEventListener("click", async (e) => {
      hideContextMenu();
      const action = e.target.closest(".context-item")?.dataset.action;
      if (!action) return;

      const item = state.contextMenuTarget;
      if (!state.currentDevice) return;
      const targetPath = item
        ? path.join(state.currentDevicePath, item.name)
        : state.currentDevicePath;

      if (action === "open" && item?.isDirectory) {
        listDeviceFiles(targetPath);
      } else if (action === "download" && item && !item.isDirectory) {
        const destination = await window.electronAPI.saveFile(item.name);
        if (!destination) return;
        runCommand("adb.exe", [
          "-s",
          state.currentDevice,
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
            state.currentDevice,
            "shell",
            `mv "${targetPath}" "${path.join(
              state.currentDevicePath,
              newName
            )}"`,
          ]);
          setTimeout(() => listDeviceFiles(state.currentDevicePath), 500);
        }
      } else if (action === "delete" && item) {
        if (
          confirm(`Are you sure you want to permanently delete "${item.name}"?`)
        ) {
          runCommand("adb.exe", [
            "-s",
            state.currentDevice,
            "shell",
            `rm -rf "${targetPath}"`,
          ]);
          setTimeout(() => listDeviceFiles(state.currentDevicePath), 500);
        }
      } else if (action === "new-folder") {
        const folderName = await showInputModal(
          "New Folder",
          "Enter new folder name:"
        );
        if (folderName) {
          runCommand("adb.exe", [
            "-s",
            state.currentDevice,
            "shell",
            `mkdir "${path.join(state.currentDevicePath, folderName)}"`,
          ]);
          setTimeout(() => listDeviceFiles(state.currentDevicePath), 500);
        }
      }
    });

  document.addEventListener("click", () => hideContextMenu());
}
