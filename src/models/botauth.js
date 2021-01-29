const mongoose = require('mongoose');
const { Schema } = mongoose;
const Auth = new Schema({
 id: Number,
 code: String
});
console.log("[DB] Compiling Schema into Model - BotAuth");
module.exports = mongoose.model('BotAuth', BotAuth);