let router = require("express").Router();
router.use(require("express").json());
let Bots = require("@models/bots.js");

router.get("/",(req, res)=>{
 res.send("wip");
})

module.exports = router;