import type { Express, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// Supabase configuration
const SUPABASE_URL = "https://pqlbnvefkqbfwinfszbf.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "sb_secret_pjRefw7iSOVR7ZjtBg_UMg_nFwcFaRj";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

interface AuthCookieData {
  user_id: string;
  email: string;
}

function setAuthCookie(res: Response, userId: string, email: string) {
  const secret = getSecret();
  const data: AuthCookieData = { user_id: userId, email };
  const value = sign(JSON.stringify(data), secret);
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

function getAuthData(req: Request): AuthCookieData | null {
  const raw = req.cookies?.[COOKIE_NAME];
  if (!raw) return null;
  const result = unsign(raw, getSecret());
  if (!result || result === "authenticated") return null;
  try {
    return JSON.parse(result);
  } catch {
    return null;
  }
}

export function isAuthenticated(req: Request): boolean {
  const data = getAuthData(req);
  return data !== null && !!data.user_id;
}

export function getCurrentUser(req: Request): { user_id: string; email: string } | null {
  return getAuthData(req);
}

export function setupAuth(app: Express) {
  // GET /auth/google — initiate Google OAuth flow via Supabase
  app.get("/auth/google", (req: Request, res: Response) => {
    const { data, error } = supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.BASE_URL || "https://door.nsnc.xyz"}/auth/callback`,
      },
    });

    if (error || !data.url) {
      return res.status(500).json({ error: "Failed to initiate OAuth flow" });
    }

    res.redirect(data.url);
  });

  // GET /auth/callback — handle OAuth callback from Supabase
  app.get("/auth/callback", async (req: Request, res: Response) => {
    const { code, error } = req.query;

    if (error) {
      return res.redirect("/#/login?error=" + encodeURIComponent(String(error)));
    }

    if (!code) {
      return res.redirect("/#/login?error=no_code");
    }

    try {
      // Exchange the code for a session
      const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(String(code));

      if (sessionError || !data.user) {
        console.error("OAuth session exchange failed:", sessionError);
        return res.redirect("/#/login?error=session_failed");
      }

      const user = data.user;
      const userId = user.email?.split("@")[0] || user.id;
      const email = user.email || "";

      // Set auth cookie with user info
      setAuthCookie(res, userId, email);

      // Redirect to app
      res.redirect("/#/");
    } catch (err) {
      console.error("OAuth callback error:", err);
      res.redirect("/#/login?error=unknown");
    }
  });

  // GET /auth/logout
  app.get("/auth/logout", async (req: Request, res: Response) => {
    // Sign out from Supabase if we have a session
    await supabase.auth.signOut();
    clearAuthCookie(res);
    res.redirect("/#/login");
  });

  // GET /auth/me
  app.get("/auth/me", (req: Request, res: Response) => {
    const user = getCurrentUser(req);
    if (user) {
      res.json({ authenticated: true, user_id: user.user_id, email: user.email });
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
