const OAuthClient = require('disco-oauth');
const auth = new OAuthClient(process.env.ID, process.env.SECRET);
auth.scopes = ['identify', 'guilds'];
auth.redirectURI = "https://bots.rovelstars.ga/auth";
module.exports = auth;