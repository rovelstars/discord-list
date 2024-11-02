export default function (err, req, res, next) {
  console.error(err.stack);
  if (!res.headersSent) res.status(500).json({ err: "server_down" });
};
