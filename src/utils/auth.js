const OAuthClient = require('disco-oauth');
const auth = new OAuthClient(process.env.ID, process.env.SECRET);
auth.scopes = ['identify', 'guilds'];
auth.redirectURI = "https://discord.rovelstars.com/api/auth";
module.exports = auth;