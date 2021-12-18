module.exports = function (err, req, res, next) {
  var alerts = undefined;
  if (req.query.alert) {
    alerts = req.query.alert;
  }
  res.locals.alerts = alerts;
};