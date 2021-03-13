let router = require("express").Router();
let auth = require("@utils/auth.js");
router.use(require("expressjs").json());
router.get("/user", async (req, res)=>{
 if(req.query.key){
  try {
  const user = await auth.getUser(req.query.key);
  await res.json(user);
 }
  catch(e){
   res.json({error: e});
  }
 }
 else res.json({error: "no_key"});
});
module.exports = router;