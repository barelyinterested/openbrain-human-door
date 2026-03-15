// Vercel serverless entry point — source file (not compiled)
const path = require("path");
const express = require("express");

// Lazy-load the compiled server to catch errors clearly
let app;
try {
  // The build script compiles server/vercel.ts -> dist/vercel.cjs
  const mod = require("../dist/vercel.cjs");
  app = mod.default || mod;
} catch (e) {
  app = (req, res) => res.status(500).json({ error: e.message });
}

module.exports = app;
