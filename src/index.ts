import { Hono } from "hono";
import { handleGoogleAuth, handleGoogleCallback, handleAuthStatus, handleLogout } from "./endpoints/auth";
import { handleSearch, handleSearchHistory } from "./endpoints/search";
import portalHTML from "./views/portal.html";

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

app.onError((err, c) => {
  console.error("Global error handler caught:", err);
  return c.json(
    {
      success: false,
      error: err.message || "Internal Server Error",
    },
    500,
  );
});

// Serve the web portal at root
app.get("/", async (c) => {
  return c.html(portalHTML);
});

// Authentication routes
app.get("/api/auth/google", handleGoogleAuth);
app.get("/api/auth/callback", handleGoogleCallback);
app.get("/api/auth/status", handleAuthStatus);
app.post("/api/auth/logout", handleLogout);

// Search routes
app.get("/api/search", handleSearch);
app.get("/api/search/history", handleSearchHistory);

// Health check endpoint
app.get("/health", (c) => {
  return c.json({ status: "ok", service: "Google Drive Search Portal" });
});

// Export the Hono app
export default app;
