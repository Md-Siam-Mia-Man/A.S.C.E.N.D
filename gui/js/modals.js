// modals.js
import { $ } from "./utils.js";

export function initModals() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const activeModal = document.querySelector(".modal-overlay.active");
      if (activeModal) {
        const cancelButton = activeModal.querySelector(".btn-secondary");
        if (cancelButton) cancelButton.click();
        else activeModal.classList.remove("active");
      }
    }
  });
}

export function showInputModal(title, promptText, initialValue = "") {
  return new Promise((resolve) => {
    const modal = $("input-modal");
    const input = $("input-modal-field");
    const okBtn = $("input-modal-ok");
    const cancelBtn = $("input-modal-cancel");

    $("input-modal-title").textContent = title;
    $("input-modal-prompt").textContent = promptText;
    input.value = initialValue;

    const cleanup = () => {
      modal.classList.remove("active");
      okBtn.removeEventListener("click", okHandler);
      cancelBtn.removeEventListener("click", cancelHandler);
      input.removeEventListener("keydown", enterHandler);
    };

    const okHandler = () => {
      cleanup();
      resolve(input.value);
    };
    const cancelHandler = () => {
      cleanup();
      resolve(null);
    };
    const enterHandler = (e) => {
      if (e.key === "Enter") okHandler();
    };

    okBtn.addEventListener("click", okHandler);
    cancelBtn.addEventListener("click", cancelHandler);
    input.addEventListener("keydown", enterHandler);

    modal.classList.add("active");
    input.focus();
    input.select();
  });
}

export function showConfirmModal(promptText, title = "Confirm Action") {
  return new Promise((resolve) => {
    const modal = $("confirm-modal");
    const okBtn = $("confirm-modal-ok");
    const cancelBtn = $("confirm-modal-cancel");

    $("confirm-modal-title").textContent = title;
    $("confirm-modal-prompt").textContent = promptText;

    const cleanup = () => {
      modal.classList.remove("active");
      okBtn.removeEventListener("click", okHandler);
      cancelBtn.removeEventListener("click", cancelHandler);
    };

    const okHandler = () => {
      cleanup();
      resolve(true);
    };
    const cancelHandler = () => {
      cleanup();
      resolve(false);
    };

    okBtn.addEventListener("click", okHandler);
    cancelBtn.addEventListener("click", cancelHandler);

    modal.classList.add("active");
    okBtn.focus();
  });
}
