import { fetch } from "rovel.js";
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
  if (process.env.CONSOLE_LOG) globalThis.logg(text);
}

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
  if (process.env.CONSOLE_LOG) globalThis.logerr(text);
}

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
  if (process.env.CONSOLE_LOG) globalThis.warnn(text);
}
export { log, error, warn };
