const mongoose = require('mongoose');
const { Schema } = mongoose;
const Servers = new Schema({
   id: Number,
   _id: {
    default: () => new Date(),
    type: Date
  }, //added at
   short: {type: String, default: "Short description is not Updated."},
   desc: {type: String, default: "Description is not updated."},
   owner: {type: String, required: true},
   invite: {type: String, required: true},
   promoted: {type: Boolean, default: false},
   badges: [{type: String}],
  });
  console.log("[DB] Compiling Schema into Model - Servers");
  module.exports = mongoose.model('Servers', Servers);