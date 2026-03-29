import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Supabase OAuth redirects to /oauth/callback#access_token=...
// The hash router needs /#/oauth/callback, so we catch this here,
// stash the token params in sessionStorage, and redirect to the correct hash route.
if (window.location.pathname === "/oauth/callback") {
  if (window.location.hash) {
    sessionStorage.setItem("oauth_params", window.location.hash.substring(1));
  }
  window.location.replace("/#/oauth/callback");
} else if (!window.location.hash) {
  window.location.hash = "#/";
}

createRoot(document.getElementById("root")!).render(<App />);
