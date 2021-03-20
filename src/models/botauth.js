const mongoose = require('mongoose');
const { Schema } = mongoose;
const BotAuth = new Schema({
 id: {
  type: String,
  unique: true
 },
 _id: {
    default: () => new Date(),
    type: Date
  },
 code: String
}, {versionKey: false});
console.log("[DB] Compiling Schema into Model - BotAuth");
module.exports = mongoose.model('BotAuth', BotAuth);