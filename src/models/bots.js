const mongoose = require('mongoose');
const { Schema } = mongoose;
const {fetch} = require("rovel.js");
const Bots = new Schema({
 _id: {
    default: function(){ new Date()},
    type: Date
  }, //added at
 id: {
  type: String , 
  unique: true,
  required: true
  }, //botId
 owners: [{type: String}], //owners
 lib: {type: String},
 short: String, //short desc
 desc: String, //description
 prefix: String, //bot prefix
 verified: { type: Boolean, default: false }, //verified bot or not
 added: {type: Boolean, default: false},
 support: String, //support server id
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
 voted: Number,
 badges: [{ type: String }],
},{ versionKey: false, toJSON: { virtuals: true }, toObject: { virtuals: true }});
Bots.virtual('user').get(
async function(){
  const url = `${process.env.DOMAIN}/api/client/users/${this.id}`
  const res = await fetch(url);
  const data = await res.json();//assuming data is json
  await console.log(data);
  return await data;
}
)
Bots.index({'$**': 'text'});
console.log("[DB] Compiling Schema into Model - Bots");
module.exports = mongoose.model('Bots', Bots);