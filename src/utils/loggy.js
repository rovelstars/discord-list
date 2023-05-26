const { fetch } = require("rovel.js");

/**
 * Logs a message to a specified console log endpoint.
 * @param {string} text - The text to be logged.
 */
function log(text) {
  fetch(process.env.CONSOLE_LOG, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: "RDL console.log",
      content: text,
    }),
  });

  // Call the globalThis.logg() function if CONSOLE_LOG is defined
  if (process.env.CONSOLE_LOG) {
    globalThis.logg(text);
  }
}

/**
 * Logs an error message to a specified console log endpoint.
 * @param {string} text - The text of the error message.
 */
function error(text) {
  fetch(process.env.CONSOLE_LOG, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: "RDL console.error",
      content: text,
    }),
  });

  // Call the globalThis.logerr() function if CONSOLE_LOG is defined
  if (process.env.CONSOLE_LOG) {
    globalThis.logerr(text);
  }
}

/**
 * Logs a warning message to a specified console log endpoint.
 * @param {string} text - The text of the warning message.
 */
function warn(text) {
  fetch(process.env.CONSOLE_LOG, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: "RDL console.warn",
      content: text,
    }),
  });

  // Call the globalThis.warnn() function if CONSOLE_LOG is defined
  if (process.env.CONSOLE_LOG) {
    globalThis.warnn(text);
  }
}

module.exports = { log, error, warn };
