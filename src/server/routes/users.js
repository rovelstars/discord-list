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
router.get("/delete", async (req, res)=>{
 await Users.deleteOne({});
 await res.send(Users.find({}));
})
module.exports = router;