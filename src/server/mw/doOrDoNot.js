module.exports = function(req, res, next){
 if(!res.headersSent) { 
  next();
 }
}