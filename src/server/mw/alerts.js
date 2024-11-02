export default function (err, req, res, next) {
  var alerts = null;
  if (req.query.alert) {
    alerts = req.query.alert;
  }
  res.locals.alerts = alerts;
};