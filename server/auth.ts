import type { Express, Request, Response, NextFunction } from "express";
import crypto from "crypto";

// Sign a value with the session secret so it can't be forged
function sign(value: string, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret).update(value).digest("base64url");
  return `${value}.${hmac}`;
}

function unsign(signed: string, secret: string): string | false {
  const lastDot = signed.lastIndexOf(".");
  if (lastDot === -1) return false;
  const value = signed.slice(0, lastDot);
  const expected = sign(value, secret);
  // Constant-time comparison
  if (expected.length !== signed.length) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(signed);
  if (crypto.timingSafeEqual(a, b)) return value;
  return false;
}

const COOKIE_NAME = "ob_auth";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

function getSecret(): string {
  return process.env.SESSION_SECRET || "openbrain-dev-secret-change-in-prod";
}

function setAuthCookie(res: Response) {
  const secret = getSecret();
  const value = sign("authenticated", secret);
  res.cookie(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE * 1000,
    path: "/",
  });
}

function clearAuthCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export function isAuthenticated(req: Request): boolean {
  const raw = req.cookies?.[COOKIE_NAME];
  if (!raw) return false;
  const result = unsign(raw, getSecret());
  return result === "authenticated";
}

export function setupAuth(app: Express) {
  // POST /auth/login — check passphrase, set signed cookie
  app.post("/auth/login", (req: Request, res: Response) => {
    const { passphrase } = req.body;
    const expected = process.env.ACCESS_PASSPHRASE;

    if (!expected) {
      return res.status(503).json({
        error: "Server not configured. Set ACCESS_PASSPHRASE in Vercel environment variables.",
      });
    }

    // Normalize both sides: trim whitespace, collapse internal spaces, lowercase
    const normalize = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
    if (!passphrase || normalize(passphrase) !== normalize(expected)) {
      return res.status(401).json({ error: "Incorrect passphrase." });
    }

    setAuthCookie(res);
    return res.json({ ok: true });
  });

  // GET /auth/logout
  app.get("/auth/logout", (req: Request, res: Response) => {
    clearAuthCookie(res);
    res.redirect("/#/login");
  });

  // GET /auth/me
  app.get("/auth/me", (req: Request, res: Response) => {
    if (isAuthenticated(req)) {
      res.json({ authenticated: true });
    } else {
      res.json({ authenticated: false });
    }
  });
}

// Middleware to guard API routes
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (isAuthenticated(req)) return next();
  res.status(401).json({ error: "Not authenticated" });
}
