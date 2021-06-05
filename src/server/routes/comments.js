let router = require("express").Router();
router.use(require("express").json());

router.get("/",(req, res)=>{
 res.send("wip");
})

module.exports = router;