// Vercel serverless entry point
const app = require("../dist/vercel.cjs");
module.exports = app.default || app;
