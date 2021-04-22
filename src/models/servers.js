const mongoose = require('mongoose');
const { Schema } = mongoose;
const Servers = new Schema({
   id: Number,
   _id: {
    default: () => new Date(),
    type: Date
  }, //added at
   short: String,
   desc: String,
   owner: String,
   invite: String,
   promoted: {type: Boolean, default: false},
   badges: [{type: String}],
  });
  console.log("[DB] Compiling Schema into Model - Servers");
  module.exports = mongoose.model('Servers', Servers);