// Vercel serverless entry point
let app;
try {
  const mod = require("../dist/vercel.cjs");
  app = mod.default || mod;
} catch (e) {
  // Surface the real error instead of a generic 500
  app = (req, res) => {
    res.status(500).json({
      error: "Startup crash",
      message: e.message,
      stack: e.stack,
    });
  };
}
module.exports = app;
