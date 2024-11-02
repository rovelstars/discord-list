import OAuthClient from "disco-oauth";
const auth = new OAuthClient(process.env.ID, process.env.SECRET);
auth.scopes = ["identify", "email", "guilds.join"];
auth.redirectURI = `${process.env.DOMAIN}/api/auth`;
export default auth;
