import type { Express, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// Supabase configuration - lazy initialization to allow debug logging first
const SUPABASE_URL = process.env.SUPABASE_URL || "https://pqlbnvefkqbfwinfszbf.supabase.co";
const FALLBACK_BASE_URL = "https://door.nsnc.xyz";

// Debug: log all env vars that contain "SUPABASE" (without exposing values)
const supabaseEnvVars = Object.keys(process.env).filter(k => k.includes("SUPABASE"));
console.log("DEBUG: Available SUPABASE env vars:", supabaseEnvVars);
console.log("DEBUG: SUPABASE_SERVICE_KEY present:", !!process.env.SUPABASE_SERVICE_KEY);
console.log("DEBUG: SUPABASE_SERVICE_KEY length:", process.env.SUPABASE_SERVICE_KEY?.length || 0);

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error("ERROR: SUPABASE_SERVICE_KEY environment variable not set!");
  console.error("DEBUG: All env var keys:", Object.keys(process.env).sort());
  // Don't exit immediately - allow the function to respond for debugging
  // process.exit(1);
}

// Lazy client creation - only create when actually needed
let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabaseClient() {
  console.log("[getSupabaseClient] Function called, _supabase initialized:", !!_supabase);
  if (!_supabase) {
    console.log("[getSupabaseClient] Creating new Supabase client...");
    console.log("[getSupabaseClient] SUPABASE_URL:", SUPABASE_URL);
    console.log("[getSupabaseClient] SUPABASE_SERVICE_KEY present:", !!SUPABASE_SERVICE_KEY);
    console.log("[getSupabaseClient] SUPABASE_SERVICE_KEY length:", SUPABASE_SERVICE_KEY?.length || 0);
    console.log("[getSupabaseClient] SUPABASE_SERVICE_KEY first 8 chars:", SUPABASE_SERVICE_KEY ? SUPABASE_SERVICE_KEY.substring(0, 8) + "..." : "N/A");
    
    if (!SUPABASE_SERVICE_KEY) {
      console.error("[getSupabaseClient] ERROR: SUPABASE_SERVICE_KEY is not set!");
      throw new Error("SUPABASE_SERVICE_KEY not set");
    }
    
    try {
      console.log("[getSupabaseClient] Calling createClient...");
      _supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      console.log("[getSupabaseClient] Supabase client created successfully!");
    } catch (err) {
      console.error("[getSupabaseClient] ERROR during createClient:", err);
      console.error("[getSupabaseClient] Error details:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
      throw err;
    }
  }
  return _supabase;
}

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

// Allowed emails for authorization - with fallback if env var is not set
const allowedEmails = (process.env.ALLOWED_EMAILS || "jp@jpruss.com,carola@jpruss.com").split(",").map(e => e.trim().toLowerCase());

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
  app.get("/auth/google", async (req: Request, res: Response) => {
    console.log("[/auth/google] Endpoint hit - method:", req.method, "path:", req.path);
    console.log("[/auth/google] Query params:", JSON.stringify(req.query));
      console.log("[/auth/google] Headers:", JSON.stringify({ host: req.headers.host, origin: req.headers.origin, referer: req.headers.referer }));
      console.log("[/auth/google] process.env.BASE_URL:", process.env.BASE_URL || "not set");
      console.log("[/auth/google] FALLBACK_BASE_URL:", FALLBACK_BASE_URL);
      const Redirect_URL = process.env.BASE_URL || FALLBACK_BASE_URL;
      console.log("[/auth/google] Using redirect URL:", Redirect_URL);
      try {
      console.log("[/auth/google] Calling getSupabaseClient()...");
      const client = getSupabaseClient();
      console.log("[/auth/google] Supabase client obtained, calling signInWithOAuth...");
      console.log("[/auth/google] Site URL should be https://door.nsnc.xyz, not http://localhost:3000");
      console.log("[/auth/google] Redirect URLs should include https://door.nsnc.xyz/oauth/callback");
      const { data, error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          // Client redirect URL - wouter handles hash routes automatically
          redirectTo: `${Redirect_URL}/oauth/callback`,
          // Google-specific parameters must be passed in 'params'
          params: {
            access_type: "offline",
            response_type: "code",
            prompt: "select_account",
          },
        },
      });

      if (error || !data.url) {
        console.error("[/auth/google] signInWithOAuth error:", error);
        console.error("[/auth/google] signInWithOAuth data:", data);
        return res.status(500).json({ error: "Failed to initiate OAuth flow", details: error?.message || "Unknown error" });
      }

      console.log("[/auth/google] OAuth URL obtained:");
      console.log("[/auth/google]   Full URL: " + data.url);
      console.log("[/auth/google]   Redirect URL (for debugging): " + data.url.substring(0, 120) + "...");
      console.log("[/auth/google]   Redirect URL decoded: " + decodeURIComponent(data.url));
      res.redirect(data.url);
    } catch (err) {
      console.error("[/auth/google] ERROR in try-catch:", err);
      console.error("[/auth/google] Error details:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
      return res.status(500).json({ error: "Supabase client not initialized", details: err instanceof Error ? err.message : String(err) });
    }
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
      const client = getSupabaseClient();
      // Exchange the code for a session
      const { data, error: sessionError } = await client.auth.exchangeCodeForSession(String(code));

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
    try {
      const client = getSupabaseClient();
      // Sign out from Supabase if we have a session
      await client.auth.signOut();
    } catch (err) {
      console.error("Logout error:", err);
    }
    clearAuthCookie(res);
    res.redirect("/#/login");
  });

  // POST /auth/token — exchange a Supabase access token for an ob_auth session cookie
  app.post("/auth/token", async (req: Request, res: Response) => {
    const { access_token } = req.body;
    if (!access_token || typeof access_token !== "string") {
      return res.status(400).json({ error: "access_token required" });
    }
    try {
      const client = getSupabaseClient();
      const { data, error } = await client.auth.getUser(access_token);
      if (error || !data.user) {
        console.error("[/auth/token] Invalid token:", error);
        return res.status(401).json({ error: "Invalid token" });
      }
      const email = (data.user.email || "").toLowerCase();
      if (!allowedEmails.includes(email)) {
        console.warn("[/auth/token] Unauthorized email:", email);
        return res.status(403).json({ error: "Email not authorized" });
      }
      const userId = email.split("@")[0]; // "john" or "carola"
      setAuthCookie(res, userId, email);
      return res.json({ ok: true, user_id: userId, email });
    } catch (err) {
      console.error("[/auth/token] Error:", err);
      return res.status(500).json({ error: "Token validation failed" });
    }
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
