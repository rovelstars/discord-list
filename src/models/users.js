const mongoose = require('mongoose');
  const { Schema } = mongoose;
  const Users = new Schema({
   id: String,
   _id: {
    default: () => new Date(),
    type: Date
  }, //added at
   bal: Number,
   bio: String,
   badges: [{type: String}],
   promoted: {type: Boolean, default: false},
  });
  console.log("[DB] Compiling Schema into Model - Users");
  module.exports = mongoose.model('Users', Users);