const mongoose = require('mongoose');
const { Schema } = mongoose;
const BotAuth = new Schema({
 id: Number,
 _id: {
    default: () => new Date(),
    type: Date
  },
 code: String
});
console.log("[DB] Compiling Schema into Model - BotAuth");
module.exports = mongoose.model('BotAuth', BotAuth);