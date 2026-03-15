import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // When compiled to api/index.js, __dirname is the api/ folder.
  // Static files are at dist/public/ relative to the project root.
  // Try multiple candidate paths in order:
  const candidates = [
    path.resolve(__dirname, "public"),          // compiled to dist/vercel.cjs  → dist/public
    path.resolve(__dirname, "../dist/public"),  // compiled to api/index.js     → dist/public
    path.resolve(process.cwd(), "dist", "public"), // fallback via cwd
  ];

  let distPath: string | null = null;
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      distPath = candidate;
      break;
    }
  }

  if (!distPath) {
    throw new Error(
      `Could not find the build directory. Tried: ${candidates.join(", ")}. Make sure to build the client first.`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html for client-side routing
  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath!, "index.html"));
  });
}
