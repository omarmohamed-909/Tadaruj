import "dotenv/config";
import mongoose from "mongoose";
import { createApp } from "./app.js";
import connectDB from "./database/db.js";
import { inspectSetup } from "./utils/setupChecks.js";
import { logger } from "./utils/logger.js";
import { createShutdownHandler } from "./utils/shutdown.js";

// Refuse broken public deployments before accepting traffic; values stay private.
if (process.env.NODE_ENV === "production") {
  const setup = inspectSetup();
  if (!setup.ready) throw new Error(`Production configuration is incomplete: ${setup.issues.join(" ")}`);
}

const app = createApp();
export default app;

// Vercel imports the handler; local/container deployments own a listening server.
if (!process.env.VERCEL) {
  const port = Number(process.env.PORT || "3000");
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be an integer from 1 to 65535.");
  const server = app.listen(port, process.env.SERVER_HOST || "0.0.0.0", () => logger("info", "server.listening", { port }));
  server.on("error", () => { logger("error", "server.listen_failed"); process.exit(1); });
  // Readiness remains unavailable until this succeeds. Catch cold-start failures.
  connectDB().catch(() => logger("error", "database.startup_unavailable"));
  const shutdown = createShutdownHandler({
    server, disconnect: () => mongoose.disconnect(),
    beginDrain: () => { app.locals.draining = true; }, logger,
  });
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}
