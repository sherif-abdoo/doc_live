const asyncwrapper = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      if (res.headersSent && req.headers.accept === "text/event-stream") {
        res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
        return res.end();
      }
      next(error);
    }
  };
};
module.exports = asyncwrapper;