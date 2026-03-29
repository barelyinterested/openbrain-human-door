import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function OAuthCallback() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Supabase returns tokens as hash fragments after implicit-flow OAuth
      const hash = window.location.hash.replace(/^#\/?oauth\/callback/, "").replace(/^#/, "");
      const hashParams = new URLSearchParams(hash);
      // Also check query params in case Supabase switches to PKCE code flow
      const searchParams = new URLSearchParams(window.location.search);

      const errorParam = hashParams.get("error") || searchParams.get("error");
      if (errorParam) {
        setError(`OAuth failed: ${errorParam}`);
        return;
      }

      const accessToken = hashParams.get("access_token") || searchParams.get("access_token");
      if (!accessToken) {
        setError("No access token received — check that your Supabase project uses implicit flow");
        return;
      }

      try {
        const resp = await fetch("/auth/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ access_token: accessToken }),
        });

        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          setError(body.error || `Authentication failed (${resp.status})`);
          return;
        }

        // Cookie is now set — navigate to home
        setLocation("/");
      } catch (err) {
        setError("Failed to complete login");
        console.error(err);
      }
    };

    handleOAuthCallback();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md p-6 space-y-4">
          <h1 className="text-2xl font-bold">Authentication Failed</h1>
          <p className="text-gray-500">{error}</p>
          <button
            onClick={() => setLocation("/login")}
            className="px-4 py-2 bg-primary text-white rounded-md"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
