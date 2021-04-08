let router = require("express").Router();
var {fetch} = require("rovel.js");
let auth = require("@utils/auth.js");
let Users = require("@models/users.js");
router.use(require("express").json());

router.get("/", (req, res) => {
 if (req.query.q) {
  const q = decodeURI(req.query.q);
  Users.find({ $text: { $search: q } }).exec((err, doc) => {
   if (err) return res.json({ err });
   res.json(doc);
  })
 }
 else {
  Users.find(function(err, users) {
   if (err) return console.error(err);
   res.send(users);
  })
 }
});
router.get("/:id", (req, res) => {
 Users.findOne({ id: req.params.id }).then(user => {
  res.json(user);
 });
});
router.get("/coins", (req, res)=>{
 Users.findOne({id: "602902050677981224"}).then(user=>{
  user.bal+=10;
  user.save();
  res.json({bal: user.bal});
 })
})
module.exports = router;