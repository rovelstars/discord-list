(async()=>{
const OAuthClient = await require('disco-oauth');
const auth = await new OAuthClient(process.env.ID, process.env.SECRET);
auth.scopes = ['identify', 'guilds'];
auth.redirectURI = "https://bots.rovelstars.ga/auth";
module.exports = auth;
});