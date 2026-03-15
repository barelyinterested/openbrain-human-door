import express, { type Express, type Request, type Response } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // When compiled to api/index.js, __dirname = /var/task/api
  // The build script copies dist/public → api/public, so it's always adjacent
  const distPath = path.join(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find static files at ${distPath}. Make sure to build the client first.`
    );
  }

  app.use(express.static(distPath));

  // SPA fallback
  app.use("/{*path}", (_req: Request, res: Response) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}
