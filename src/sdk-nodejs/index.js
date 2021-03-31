let router = require("express").Router();
var {fetch} = require("rovel.js");
router.use(require("express").json());

class RDL {
 constructor(key){
  this.key = key;
 }
 Botinfo(){
  const self = this;
  async function hmm(){
   return await fetch("https://discord.rovelstars.com/api/bots").then(function(){r.json()});
  }
  return hmm();
 }
}