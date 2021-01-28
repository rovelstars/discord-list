const mongoose = require('mongoose');
  const { Schema } = mongoose;

  const Servers = new Schema({
   _id: Number,
   short: String,
   desc: String,
   owner: Number,
   invite: String,
   promoted: {type: Boolean, default: false},
   badges: [{type: String}],
  });
  
  console.log("[DB] Compiling Schema into Model - Servers");
  module.exports = mongoose.model('Servers', Servers);