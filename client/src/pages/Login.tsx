import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  // If already authenticated, go to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  const searchParams = new URLSearchParams(window.location.hash.split("?")[1] || "");
  const error = searchParams.get("error");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm mx-4">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <svg viewBox="0 0 32 32" className="w-8 h-8 text-primary" fill="none" aria-label="OpenBrain logo">
              <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="2" />
              <circle cx="16" cy="16" r="4" fill="currentColor" />
              <line x1="16" y1="2" x2="16" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="16" y1="24" x2="16" y2="30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="2" y1="16" x2="8" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="24" y1="16" x2="30" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">OpenBrain</h1>
          <p className="text-muted-foreground text-sm mt-1">Human Door</p>
        </div>

        {/* Error */}
        {error === "unauthorized" && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
            Access restricted — this brain belongs to someone else.
          </div>
        )}

        {/* Login card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          <p className="text-muted-foreground text-sm text-center mb-6">
            Sign in to access your thoughts, notes, and memory.
          </p>

          <a
            href="/auth/google"
            className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl border border-border bg-background hover:bg-muted transition-colors font-medium text-foreground text-sm"
          >
            {/* Google "G" logo */}
            <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </a>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Access is restricted to authorized users only.
          </p>
        </div>
      </div>
    </div>
  );
}
