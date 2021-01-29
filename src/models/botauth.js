const mongoose = require('mongoose');
const { Schema } = mongoose;
const tjs = require('@meanie/mongoose-to-json');
const Auth = new Schema({
 _id: Number,
 code: String
});
Auth.plugin(tjs);
console.log("[DB] Compiling Schema into Model - BotAuth");
module.exports = mongoose.model('BotAuth', BotAuth);