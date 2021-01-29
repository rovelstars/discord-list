const mongoose = require('mongoose');
const { Schema } = mongoose;
const tjs = require('@meanie/mongoose-to-json');
const Emojis = new Schema({
   _id: Number,
   desc: String,
   gif: {type: Boolean, default: false},
  });
Emojis.plugin(tjs);
  console.log("[DB] Compiling Schema into Model - Emojis");
  module.exports = mongoose.model('Emojis', Emojis);