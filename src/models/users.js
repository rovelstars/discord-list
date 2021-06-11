const mongoose = require('mongoose');
  const { Schema } = mongoose;
  const Users = new Schema({
   id: {type: String, unique: true, required: true},
   _id: {
    default: () => new Date(),
    type: Date
  }, //added at
  username: {type: String, unique: true, required: true},
  avatar: {type: String, required: true},
  discriminator: {type: String, required: true},
  email: {type: String, unique: true},
   bal: {type: Number, default: 10},
   bio: {type: String, default: "The user doesn't have bio set!"},
   badges: [{type: String}],
   promoted: {type: Boolean, default: false},
  },{ versionKey: false, toJSON: { virtuals: true }, toObject: { virtuals: true }});

Users.virtual('avatarURL').get(function(){
  if((this.avatar=="1")||(this.avatar=="2")||(this.avatar=="3")||(this.avatar=="4")){ return `https://cdn.discordapp.com/embed/avatars/${this.avatar}.png`;}
  else{
 var ani=false;
 if(this.avatar.startsWith("a_")) ani=true;
 const aniurl=`https://cdn.discordapp.com/avatars/${this.id}/${this.avatar}.gif`;
 const nonurl=`https://cdn.discordapp.com/avatars/${this.id}/${this.avatar}.png`;
 const url = (ani)?aniurl:nonurl;
 return url;
  }
});
Users.virtual('tag').get(function(){
 return `${this.username}#${this.discriminator}`;
})

var users;
try{
console.log("[DB] Compiling Schema into Model - Users");
users = mongoose.model('Users', Users);
}
catch(e){
 users = mongoose.model('Users');
}
module.exports = users;