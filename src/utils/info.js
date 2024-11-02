import { fetch } from "rovel.js";
async function info(id) {
  return await fetch(`${process.env.DOMAIN}/api/client/users/${id}`).then((r) =>
    r.json()
  );
}
export default info;
