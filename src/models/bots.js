const mongoose = require('mongoose');
const { Schema } = mongoose;
const {fetch} = require("rovel.js");
const Bots = new Schema({
 _id: {
    default: () => new Date(),
    type: Date
  }, //added at
 id: {
  type: String , 
  unique: true,
  required: true
  }, //botId
  username: {type: String, unique: true, required: true},
  avatar: {type: String, unique: true, required: true},
  discriminator: {type: String, required: true},
  status: String,
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

Bots.virtual('avatarURL').get(function(){
 if(typeof(this.avatar)==Number){
  if(this.avatar<5) return this.defaultavatarURL;
 }
 var ani=false;
 if(this.avatar.startsWith("a_")) ani=true;
 const aniurl=`https://cdn.discordapp.com/avatars/${this.id}/${this.avatar}.gif`;
 const nonurl=`https://cdn.discordapp.com/avatars/${this.id}/${this.avatar}.png`;
 const url = (ani)?aniurl:nonurl;
 return url;
});
Bots.virtual('defaultavatarURL').get(function(){
 var num = this.discriminator % 5;
 return `https://cdn.discordapp.com/embed/avatars/${num}.png`;
})

Bots.virtual('tag').get(function(){
 return `${this.username}#${this.discriminator}`;
})

Bots.index({'$**': 'text'});
var bots;
try{
console.log("[DB] Compiling Schema into Model - Bots");
bots = mongoose.model('Bots', Bots);
}
catch(e){
 bots = mongoose.model('Bots');
}
module.exports = bots;