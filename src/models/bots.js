const mongoose = require('mongoose');
const { Schema } = mongoose;
const Bots = new Schema({
 id: Number, //botid
 _id: Number,
 owners: [{_id: Number}], //owners
 short: String, //short desc
 desc: String, //description
 verified: { type: Boolean, default: false }, //verified bot or not
 support: Number, //support server id
 bg: String, // background image link
 github: String, //github link
 website: String, //website link
 donate: String, //donate account link
 invite: String, // invite link
 servers: Number, //servers number
 ramUsed: { type: Number, default: 0 },
 ramLeft: { type: Number, default: 0 },
 msgGot: { type: Number, default: 0 },
 cmdGot: { type: Number, default: 0 },
 msgSent: { type: Number, default: 0 },
 promoted: { type: Boolean, default: false },
 votes: { type: Number, default: 0 },
 voted: [{
  voter: Number,
  at: { type: Date, default: Date.now },
  votes: { type: Number, default: 1 },
    }],
 badges: [{ type: String }],
});
console.log("[DB] Compiling Schema into Model - Bots");
module.exports = mongoose.model('Bots', Bots);