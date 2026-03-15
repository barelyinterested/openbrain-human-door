import session from "express-session";
import type { Express, Request, Response, NextFunction } from "express";

export function setupAuth(app: Express) {
  // Session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "openbrain-dev-secret-change-in-prod",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    })
  );

  // POST /auth/login — check passphrase
  app.post("/auth/login", (req: Request, res: Response) => {
    const { passphrase } = req.body;
    const expected = process.env.ACCESS_PASSPHRASE;

    if (!expected) {
      return res.status(503).json({ error: "Server not configured. Set the ACCESS_PASSPHRASE environment variable in Vercel." });
    }

    if (!passphrase || passphrase.trim() !== expected.trim()) {
      return res.status(401).json({ error: "Incorrect passphrase." });
    }

    (req.session as any).authenticated = true;
    return res.json({ ok: true });
  });

  // GET /auth/logout
  app.get("/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.redirect("/#/login");
    });
  });

  // GET /auth/me
  app.get("/auth/me", (req: Request, res: Response) => {
    if ((req.session as any).authenticated) {
      res.json({ authenticated: true });
    } else {
      res.json({ authenticated: false });
    }
  });
}

// Middleware to guard API routes
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if ((req.session as any).authenticated) return next();
  res.status(401).json({ error: "Not authenticated" });
}
