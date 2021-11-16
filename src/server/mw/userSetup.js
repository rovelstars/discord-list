const { langs } = require("../../data.js");

module.exports = async function(req, res, next) {
  res.locals.req = req;
  var themes = ["discord", "dracula", "paranoid"];
  if (!themes.includes(req.cookies['theme'])) {
    req.cookies["theme"] = "discord";
    res.cookie('theme', "discord", {
      maxAge: 30 * 3600 * 24 * 1000, //30days
      httpOnly: true,
      secure: true
    });
  }
  res.locals.theme = (req.cookies["theme"]) ? req.cookies["theme"] : "discord";
  if (req.header('RDL-key')) {
    req.query.key = req.header('RDL-key');
  }

  res.locals.preferEmoji = req.cookies["emoji"] || "twemoji";

  if (req.header('RDL-code')) {
    req.query.code = req.header('RDL-code');
  }
  if (req.query.key) {
    req.cookies['key'] = req.query.key;
  }
  if (req.query.code) {
    req.cookies['code'] = req.query.code;
  }

  if (req.query.r && !req.cookies["refferal"]) {
    console.log("hmmmm: " + req.query.r);
    res.cookie("refferal", req.query.r, { maxAge: 1000 * 60 * 60 * 24, httpOnly: true, secure: true }); //1 day
  }

  var user = null;
  if (req.cookies['key']) {
    req.query.key = req.cookies['key'];
    user = await auth.getUser(req.cookies['key']).catch(async () => {
      try {
        let tempvalid = auth.checkValidity(req.cookies['key']);
        /*
   {
  expired: false,
  expiresIn: 538994851,
  expireTimestamp: 1623434339257
}
*/
        if (tempvalid.expired) {
          // ah yes the key really expired!
          const newkey = await auth.refreshToken(req.cookies['key']);

          const tempuser = await auth.getUser(newkey);
          res.cookie('key', newkey, {
            maxAge: 90 * 3600 * 24 * 1000, //90days
            httpOnly: true,
            secure: true
          });
          res.redirect("/?alert=key_refreshed");
        }
        else {
          res.cookie('key', req.cookies['key'], { maxAge: 0 });
          res.redirect("/?alert=logout");
        }
      }
      catch (e) {
        res.cookie('key', req.cookies['key'], { maxAge: 0 });
        res.redirect("/?alert=logout");
      }
    });
  }
  res.locals.user = user;
  next();
}