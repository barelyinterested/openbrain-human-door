// Vercel serverless entry point
// Exports the Express app without calling .listen()
import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Temporary debug endpoint — remove after verifying auth works
app.get("/auth/debug", (_req, res) => {
  const val = process.env.ACCESS_PASSPHRASE;
  res.json({
    hasPassphrase: !!val,
    length: val ? val.length : 0,
    firstChar: val ? val[0] : null,
    lastChar: val ? val[val.length - 1] : null,
    charCodes: val ? Array.from(val).map(c => c.charCodeAt(0)) : [],
  });
});

// Debug: echo back what was submitted
app.post("/auth/debug-login", (req: any, res: any) => {
  const { passphrase } = req.body;
  const expected = process.env.ACCESS_PASSPHRASE;
  res.json({
    submittedLength: passphrase ? passphrase.length : 0,
    expectedLength: expected ? expected.length : 0,
    submittedCodes: passphrase ? Array.from(passphrase as string).map((c: string) => c.charCodeAt(0)) : [],
    expectedCodes: expected ? Array.from(expected).map(c => c.charCodeAt(0)) : [],
    match: passphrase && expected ? passphrase.trim() === expected.trim() : false,
  });
});

// Auth setup (cookie-based auth + /auth/* routes)
setupAuth(app);

// Register API routes
registerRoutes(httpServer, app);

// Error handler
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  if (res.headersSent) return next(err);
  return res.status(status).json({ message });
});

// Serve static files (React app)
serveStatic(app);

// Export for Vercel serverless
export default app;
