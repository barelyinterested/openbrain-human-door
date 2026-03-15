import express, { type Express, type Request, type Response, type NextFunction } from "express";
import fs from "fs";
import path from "path";

// Resolve path lazily at request time — never at module load
function findDistPath(): string {
  const candidates = [
    path.join(process.cwd(), "dist", "public"),   // Vercel: /var/task/dist/public ✓
    path.join(__dirname, "public"),                // api/public (local fallback)
    path.join(__dirname, "..", "dist", "public"),  // dist/public relative to api/
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  // Return first candidate even if missing — error will surface on request, not startup
  return candidates[0];
}

let _distPath: string | null = null;

function getDistPath(): string {
  if (!_distPath) _distPath = findDistPath();
  return _distPath;
}

export function serveStatic(app: Express) {
  // Serve static assets — resolved lazily per request
  app.use((req: Request, res: Response, next: NextFunction) => {
    const distPath = getDistPath();
    express.static(distPath)(req, res, next);
  });

  // SPA fallback — all unmatched routes serve index.html
  app.use("/{*path}", (_req: Request, res: Response) => {
    res.sendFile(path.join(getDistPath(), "index.html"));
  });
}
