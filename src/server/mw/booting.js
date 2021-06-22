module.exports = function(req, res, next) {
 if (process.uptime() < 10) {
  if (req.originalUrl.startsWith("/assets") || req.originalUrl.startsWith("/api")) next();
  else res.sendFile(path.resolve("src/public/assets/loading.html"));
 }
 else next();
}