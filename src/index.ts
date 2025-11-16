import { ApiException, fromHono } from "chanfana";
import { Hono } from "hono";
import { tasksRouter } from "./endpoints/tasks/router";
import { accountRoutes } from "./endpoints/accounts/router";
import { emailRoutes } from "./endpoints/emails/router";
import { contactRoutes } from "./endpoints/contacts/router";
import { calendarRoutes } from "./endpoints/calendar/router";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { DummyEndpoint } from "./endpoints/dummyEndpoint";

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

app.onError((err, c) => {
  if (err instanceof ApiException) {
    // If it's a Chanfana ApiException, let Chanfana handle the response
    return c.json(
      { success: false, errors: err.buildResponse() },
      err.status as ContentfulStatusCode,
    );
  }

  console.error("Global error handler caught:", err); // Log the error if it's not known

  // For other errors, return a generic 500 response
  return c.json(
    {
      success: false,
      errors: [{ code: 7000, message: "Internal Server Error" }],
    },
    500,
  );
});

// Setup OpenAPI registry
const openapi = fromHono(app, {
  docs_url: "/",
  schema: {
    info: {
      title: "DriveChat - Unified Communication Hub API",
      version: "1.0.0",
      description: "A unified inbox, contact management, and calendar synchronization API for serial entrepreneurs. Aggregates emails, contacts, and calendar events from multiple Google and Microsoft accounts.",
    },
  },
});

// Register Tasks Sub router
openapi.route("/tasks", tasksRouter);

// Register Communication Hub routes
openapi.route("/", accountRoutes());
openapi.route("/", emailRoutes());
openapi.route("/", contactRoutes());
openapi.route("/", calendarRoutes());

// Register other endpoints
openapi.post("/dummy/:slug", DummyEndpoint);

// Export the Hono app
export default app;
