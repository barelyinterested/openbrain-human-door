import { useEffect, useState } from "react";
import { useNavigate } from "wouter";
import { useAuth } from "@/hooks/useAuth";

export default function OAuthCallback() {
  const [, setLocation] = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const hash = window.location.hash.substring(1); // Remove leading '#'
      const params = new URLSearchParams(hash);

      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const expiresAt = params.get("expires_at");
      const errorParam = params.get("error");

      if (errorParam) {
        setError(`OAuth failed: ${errorParam}`);
        return;
      }

      if (!accessToken) {
        setError("No access token received");
        return;
      }

      try {
        // Store auth info in localStorage for use by the app
        localStorage.setItem("sb-auth-token", accessToken);
        if (refreshToken) {
          localStorage.setItem("sb-refresh-token", refreshToken);
        }
        if (expiresAt) {
          localStorage.setItem("sb-expires-at", expiresAt);
        }

        // Trigger auth refresh
        window.dispatchEvent(new Event("storage"));
        
        // Redirect to home
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
