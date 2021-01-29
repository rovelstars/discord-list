const mongoose = require('mongoose');
const { Schema } = mongoose;
const Emojis = new Schema({
   id: Number,
   desc: String,
   gif: {type: Boolean, default: false},
  });
  console.log("[DB] Compiling Schema into Model - Emojis");
  module.exports = mongoose.model('Emojis', Emojis);