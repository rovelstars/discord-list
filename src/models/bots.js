const mongoose = require('mongoose');
const { Schema } = mongoose;

const Bots = new Schema({
 _id: Number,
 owners: [{ id: Number }],
 desc: String,
 verified: { type: Boolean, default: false },
 support: Number,
 bg: String,
 github: String,
 website: String,
 donate: String,
 invite: String,
 servers: Number,
 ramUsed: { type: Number, default: 0 },
 ramLeft: { type: Number, default: 0 },
 msgGot: { type: Number, default: 0 },
 cmdGot: { type: Number, default: 0 },
 msgSent: { type: Number, default: 0 },
 servers: Number,
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