// Vercel serverless entry point
let app;
try {
  const mod = require("./server.cjs");
  app = mod.default || mod;
} catch (e) {
  app = (req, res) => {
    res.status(500).json({
      error: "Startup crash",
      message: e.message,
      stack: e.stack,
    });
  };
}
module.exports = app;
