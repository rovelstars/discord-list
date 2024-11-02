export default function (req, res, next) {
  if (!res.headersSent) {
    next();
  }
};
