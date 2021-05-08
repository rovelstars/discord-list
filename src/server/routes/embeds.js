let router = require("express").Router();
var {fetch} = require("rovel.js");
const JSDOM = require("jsdom").JSDOM;
var domtoimg = require("dom-to-image");

router.get("/bots/:id/status", (req,res)=>{
 fetch(`${process.env.DOMAIN}/bots/${req.params.id}`).then(r=>r.text()).then(d=>{
  const dom = new JSDOM(d);
  const node = dom.window.document.getElementById("status");
  domtoimg.toSvg(node).then((data)=>{
   res.send(data);
  });
 })
});

module.exports = router;