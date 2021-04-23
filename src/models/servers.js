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
  },{ versionKey: false, toJSON: { virtuals: true }, toObject: { virtuals: true }});
  var servers;
  try{
  console.log("[DB] Compiling Schema into Model - Servers");
  servers = mongoose.model('Servers', Servers);
  }
  catch(e){
 servers = mongoose.model('Servers');
}
module.exports = servers;