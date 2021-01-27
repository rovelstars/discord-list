const mongoose = require('mongoose');
  const { Schema } = mongoose;

  const Emojis = new Schema({
   _id: Number,
   desc: String,
   format: String,
  });
  
  console.log("[DB] Compiling Schema into Model - Emojis");
  module.exports = mongoose.model('Emojis', Emojis);