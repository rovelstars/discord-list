const { fetch } = require("rovel.js");
async function info(id) {
  return await fetch(`${process.env.DOMAIN}/api/client/users/${id}`).then((r) =>
    r.json()
  );
}
module.exports = info;
