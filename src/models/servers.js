const mongoose = require('mongoose');
const { Schema } = mongoose;
const Servers = new Schema({
   id: {type: String, required: true},
   _id: {
    default: () => new Date(),
    type: Date
  }, //added at
   short: {type: String, default: "Short description is not Updated."},
   name: {type: String, required: true},
   desc: {type: String, default: "Description is not updated."},
   owner: {type: String, required: true},
   icon: {type: String, required: true},
   invite: {type: String, required: true},
   promoted: {type: Boolean, default: false},
   badges: [{type: String}],
  },{ versionKey: false, toJSON: { virtuals: true }, toObject: { virtuals: true }});
  
  Servers.virtual('iconURL').get(function(){
 var ani=false;
 if(this.icon.startsWith("a_")) ani=true;
 const aniurl=`https://cdn.discordapp.com/guilds/${this.id}/${this.icon}.gif`;
 const nonurl=`https://cdn.discordapp.com/avatars/${this.id}/${this.icon}.png`;
 const url = (ani)?aniurl:nonurl;
 return url;
});
  
  var servers;
  try{
  console.log("[DB] Compiling Schema into Model - Servers");
  servers = mongoose.model('Servers', Servers);
  }
  catch(e){
 servers = mongoose.model('Servers');
}
module.exports = servers;
