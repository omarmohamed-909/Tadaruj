import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { rateLimit } from "express-rate-limit";
import connectDB from "./database/db.js";
import userRoute from "./routes/user.router.js";
import courseRoute from "./routes/course.route.js";
import mediaRoute from "./routes/media.route.js";
import purchaseRoute from "./routes/purchaseCourse.route.js";
import courseProgressRoute from "./routes/courseProgress.route.js";
import adminRoute from "./routes/admin.route.js";
import { createFrontendOriginCheck } from "./utils/frontendOrigins.js";
import { logger as defaultLogger, withRequestLogging } from "./utils/logger.js";

async function databaseReady(connectDatabase) {
  await connectDatabase();
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  return Boolean(hello.ok && ((hello.setName && hello.isWritablePrimary) || hello.msg === "isdbgrid"));
}

export function createApp({ env = process.env, connectDatabase = connectDB, checkReadiness = () => databaseReady(connectDatabase), logger = defaultLogger, readinessTimeoutMs = 1500 } = {}) {
  const app = express();
  app.locals.draining = false;
  const hops = Number(env.TRUST_PROXY_HOPS || "0");
  app.set("trust proxy", Number.isSafeInteger(hops) && hops >= 0 ? hops : 0);
  app.disable("x-powered-by");
  app.use(helmet());
  app.use((req, res, next) => {
    const start = performance.now();
    req.requestId = randomUUID();
    res.set("X-Request-Id", req.requestId);
    res.on("finish", () => {
      if (req.path.startsWith("/health/") && res.statusCode === 200) return;
      logger(res.statusCode >= 500 ? "error" : "info", "http.request", {
        requestId: req.requestId, method: req.method,
        // Express route templates contain :token/:id, never their actual values.
        route: typeof req.route?.path === "string" ? req.route.path : "unmatched",
        status: res.statusCode, durationMs: Math.round(performance.now() - start),
      });
    });
    withRequestLogging({ requestId: req.requestId, logger }, next);
  });
  const allowed = createFrontendOriginCheck(env);
  app.use(cors({
    origin: (origin, callback) => callback(origin && !allowed(origin) ? Object.assign(new Error("Origin rejected"), { code: "ORIGIN_REJECTED" }) : null, true),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"], exposedHeaders: ["X-Request-Id"], credentials: true,
  }));
  app.get("/health/live", (_req, res) => res.set("Cache-Control", "no-store").json({ status: "alive" }));
  app.get("/health/ready", async (_req, res) => {
    let timer;
    try {
      if (app.locals.draining) return res.status(503).set("Cache-Control", "no-store").json({ status: "unavailable" });
      const ready = await Promise.race([
        Promise.resolve().then(checkReadiness),
        new Promise((resolve) => { timer = setTimeout(() => resolve(false), readinessTimeoutMs); }),
      ]);
      const available = ready === true && !app.locals.draining;
      return res.status(available ? 200 : 503).set("Cache-Control", "no-store").json({ status: available ? "ready" : "unavailable" });
    } catch {
      return res.status(503).set("Cache-Control", "no-store").json({ status: "unavailable" });
    } finally { clearTimeout(timer); }
  });
  // Preserve raw bytes for signatures before applying the JSON parser.
  app.use("/api/v1/purchase/webhook", express.raw({ type: "application/json" }));
  app.use(express.json());
  app.use(cookieParser());
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: "draft-8", legacyHeaders: false,
    skip: (req) => req.method !== "POST",
    message: { success: false, message: "Too many attempts. Try again later." },
  });
  app.use(["/api/v1/user/login", "/api/v1/user/register", "/api/v1/user/google", "/api/v1/user/forgot-password", "/api/v1/user/reset-password"], authLimiter);
  app.use("/api/v1", async (req, res, next) => {
    if (app.locals.draining) return res.status(503).json({ success: false, message: "Service temporarily unavailable. Please try again shortly.", requestId: req.requestId });
    try { await connectDatabase(); next(); }
    catch {
      logger("error", "database.unavailable", { requestId: req.requestId });
      res.status(503).json({ success: false, message: "Service temporarily unavailable. Please try again shortly.", requestId: req.requestId });
    }
  });
  app.use("/api/v1/media", mediaRoute);
  app.use("/api/v1/user", userRoute);
  app.use("/api/v1/course", courseRoute);
  app.use("/api/v1/purchase", purchaseRoute);
  app.use("/api/v1/progress", courseProgressRoute);
  app.use("/api/v1/admin", adminRoute);
  app.use((req, res) => res.status(404).json({ success: false, message: "Not found.", requestId: req.requestId }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.code === "ORIGIN_REJECTED" ? 403
      : error.type === "entity.parse.failed" ? 400
      : error.type === "entity.too.large" || error.code === "LIMIT_FILE_SIZE" ? 413
      : error.name === "MulterError" ? 400 : 500;
    const message = status === 400 ? "Invalid request." : status === 403 ? "Origin not allowed."
      : status === 413 ? "Request is too large." : "Internal server error.";
    logger(status === 500 ? "error" : "warn", "http.error", { requestId: req.requestId, status });
    return res.status(status).json({ success: false, message, requestId: req.requestId });
  });
  return app;
}
