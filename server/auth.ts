import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import type { Express, Request, Response, NextFunction } from "express";

const ALLOWED_EMAIL = process.env.ALLOWED_EMAIL || "tait.jnc@gmail.com";

// Serialize/deserialize user (store minimal profile in session)
passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

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
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );

  // Passport middleware
  app.use(passport.initialize());
  app.use(passport.session());

  // Google strategy — only configured when credentials are present
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = process.env.BASE_URL || "http://localhost:5000";

  if (clientID && clientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID,
          clientSecret,
          callbackURL: `${baseUrl}/auth/callback`,
        },
        (_accessToken, _refreshToken, profile, done) => {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(null, false, { message: "No email in profile" });
          if (email.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
            return done(null, false, { message: "Unauthorized email" });
          }
          return done(null, {
            id: profile.id,
            email,
            name: profile.displayName,
            photo: profile.photos?.[0]?.value,
          });
        }
      )
    );
  }

  // Auth routes
  app.get("/auth/google", (req, res, next) => {
    if (!clientID || !clientSecret) {
      return res.status(503).json({ error: "Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars." });
    }
    passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
  });

  app.get(
    "/auth/callback",
    (req, res, next) => {
      passport.authenticate("google", { failureRedirect: "/#/login?error=unauthorized" })(req, res, next);
    },
    (req: Request, res: Response) => {
      res.redirect("/#/");
    }
  );

  app.get("/auth/logout", (req: Request, res: Response) => {
    req.logout(() => {
      res.redirect("/#/login");
    });
  });

  app.get("/auth/me", (req: Request, res: Response) => {
    if (req.isAuthenticated()) {
      res.json({ authenticated: true, user: req.user });
    } else {
      res.json({ authenticated: false });
    }
  });
}

// Middleware to guard API routes
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: "Not authenticated", loginUrl: "/auth/google" });
}
