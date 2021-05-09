const OAuthClient = require('disco-oauth');
const auth = new OAuthClient(process.env.ID, process.env.SECRET);
auth.scopes = ['identify'];
auth.redirectURI = `${process.env.DOMAIN}/api/auth`;
module.exports = auth;