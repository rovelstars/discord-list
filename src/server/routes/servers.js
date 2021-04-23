let router = require("express").Router();
var {fetch} = require("rovel.js");
let Users = require("@models/users.js");
let Servers = require("@models/servers.js");
router.use(require("express").json());

router.get("/", (req, res) => {
 if (req.query.q) {
  const q = decodeURI(req.query.q);
  Servers.find({ $text: { $search: q } },{_id: false}).exec((err, doc) => {
   if (err) return res.json({ err });
   res.json(doc);
  })
 }
 else {
  Servers.find({},{_id: false}).exec(function(err, servers) {
   if (err) return console.error(err);
   res.send(servers);
  })
 }
});

module.exports = router;