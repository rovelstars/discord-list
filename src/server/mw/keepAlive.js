export default async function (req, res, next) {
  const space = " ";
  let isFinished = false;
  let isDataSent = false;

  //uncomment to only extend the timeout for API requests
  /*if (!req.url.includes('/api')) {
    next();
    return;
  }*/

  res.once("finish", () => {
    isFinished = true;
  });

  res.once("end", () => {
    isFinished = true;
  });

  res.once("close", () => {
    isFinished = true;
  });

  res.on("data", (data) => {
    // Look for something other than our blank space to indicate that real
    // data is now being sent back to the client.
    if (data !== space) {
      isDataSent = true;
    }
  });
  var i = 0;
  const waitAndSend = () => {
    if (i <= 10) {
      //this will wait for 10*15 seconds or 150 seconds.
      i++;
      setTimeout(() => {
        // If the response hasn't finished and hasn't sent any data back....
        if (!isFinished && !isDataSent) {
          // Need to write the status code/headers if they haven't been sent yet.
          if (!res.headersSent) {
            res.writeHead(202);
          }

          res.write(space);

          // Wait another 15 seconds
          waitAndSend();
        }
      }, 15000);
    }
  };

  waitAndSend();
  next();
};
