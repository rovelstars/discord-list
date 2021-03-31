let router = require("express").Router();
var {fetch} = require("rovel.js");
let auth = require("@utils/auth.js");
let Users = require("@models/users.js");
router.use(require("express").json());

router.get("/", (req, res)=>{
 Users.find({}).then(users=>{
  res.json(users);
 })
});
router.get("/coins", (req, res)=>{
 Users.findOne({id: "602902050677981224"}).then(user=>{
  user.coins+=10;
  user.save();
  res.send(user.coins);
 })
})
module.exports = router;