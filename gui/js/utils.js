// utils.js

/**
 * Shorthand for document.getElementById
 * @param {string} id The ID of the element to find.
 * @returns {HTMLElement | null}
 */
export const $ = (id) => document.getElementById(id);

/**
 * Shorthand for document.querySelector
 * @param {string} selector The CSS selector.
 * @returns {HTMLElement | null}
 */
export const sel = (selector) => document.querySelector(selector);

/**
 * Shorthand for document.querySelectorAll
 * @param {string} selector The CSS selector.
 * @returns {NodeListOf<HTMLElement>}
 */
export const selAll = (selector) => document.querySelectorAll(selector);

/**
 * Logs a message to the session log in the Settings modal.
 * @param {string} message The message to log.
 * @param {'INFO'|'ERROR'|'SUCCESS'|'CMD'} type The type of log entry.
 */
export function log(message, type = "INFO") {
  const sessionLog = $("session-log");
  if (!sessionLog) return;
  const entry = document.createElement("div");
  entry.className = `log-entry log-${type.toLowerCase()}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] [${type}] ${message}`;
  sessionLog.appendChild(entry);
  sessionLog.scrollTop = sessionLog.scrollHeight;
}
