export default function (err, req, res, next) {
  var dup = new URLSearchParams(req.query);
  for (const [key, value] of Object.entries(req.query)) {
    req.query[key] = dup.get(key);
  };
};
/* we are mutating req.query.
   because expressjs's parser sucks.
   learn more about it here: https://evanhahn.com/gotchas-with-express-query-parsing-and-how-to-avoid-them
 */