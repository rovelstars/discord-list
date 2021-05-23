const {fetch} = require("rovel.js");
function log(text){
 fetch(process.env.CONSOLE_LOG, {
  method: "POST",
  headers: {
   "Content-Type": "application/json"
  },
  body: JSON.stringify({
   "username": "RDL console.log",
   "content": text
  })
 })
 globalThis.logg(text);
}

function error(text){
 fetch(process.env.CONSOLE_LOG, {
  method: "POST",
  headers: {
   "Content-Type": "application/json"
  },
  body: JSON.stringify({
   "username": "RDL console.error",
   "content": text
  })
 })
 globalThis.logerr(text);
}

function warn(text){
 fetch(process.env.CONSOLE_LOG, {
  method: "POST",
  headers: {
   "Content-Type": "application/json"
  },
  body: JSON.stringify({
   "username": "RDL console.warn",
   "content": text
  })
 })
 globalThis.warnn(text);
}
module.exports = {log, err, warn};