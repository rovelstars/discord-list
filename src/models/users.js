const mongoose = require('mongoose');
  const { Schema } = mongoose;
  const Users = new Schema({
   id: Number,
   _id: Number,
   bal: Number,
   bio: String,
   connections: [{name: String, type: String, id: Number}],
   voted: [{botid: Number, at: {type: Date, default: Date.now}}],
   badges: [{type: String}],
   promoted: {type: Boolean, default: false},
  });
  console.log("[DB] Compiling Schema into Model - Users");
  module.exports = mongoose.model('Users', Users);