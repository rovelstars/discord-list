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
router.get("/delete/:id", (req, res)=>{
 Users.deleteOne({id: req.params.id})
 res.send("deleted");
})
module.exports = router;