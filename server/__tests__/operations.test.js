import { afterEach, describe, expect, it, vi } from "vitest";
import { once } from "node:events";
import { createApp } from "../app.js";
import { createShutdownHandler } from "../utils/shutdown.js";
import { createLogger } from "../utils/logger.js";

vi.mock("../routes/admin.route.js", async () => {
  const { Router } = await import("express");
  const { reportError } = await import("../utils/logger.js");
  const router = Router();
  router.post("/failure/:token", () => { throw new Error("private-provider-key"); });
  router.post("/reported/:token", async (_req, res) => {
    await new Promise((resolve) => setImmediate(resolve));
    reportError("admin.operation.failed", new Error("private-provider-payload"));
    res.status(503).json({ message: "Service unavailable." });
  });
  return { default: router };
});
vi.mock("../routes/purchaseCourse.route.js", async () => {
  const { Router } = await import("express");
  const router = Router();
  router.post("/webhook", (req, res) => res.json({ raw: Buffer.isBuffer(req.body), text: req.body.toString() }));
  return { default: router };
});

const servers = [];
afterEach(async () => {
  vi.useRealTimers();
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); })));
});
async function boot(options = {}) {
  const logger = vi.fn();
  const connectDatabase = vi.fn().mockResolvedValue();
  const app = createApp({ env: { NODE_ENV: "production", FRONTEND_URL: "https://tadaruj.example.test" }, logger, connectDatabase, checkReadiness: async () => true, ...options });
  const server = app.listen(0, "127.0.0.1");
  servers.push(server);
  await once(server, "listening");
  const url = `http://127.0.0.1:${server.address().port}`;
  return { app, logger, connectDatabase, get: (path, init) => fetch(url + path, init) };
}

describe("operational HTTP contract", () => {
  it("correlates handled asynchronous errors with the server's ID rather than client input", async () => {
    const { get, logger } = await boot();
    const response = await get("/api/v1/admin/reported/private-path-token?email=private-email", { method: "POST", headers: { "X-Request-Id": "private-client-id", "Content-Type": "application/json" }, body: '{"password":"private-password"}' });
    expect(response.status).toBe(503);
    const event = logger.mock.calls.find((call) => call[1] === "admin.operation.failed");
    expect(event).toEqual(["error", "admin.operation.failed", { requestId: response.headers.get("x-request-id"), errorType: "Error" }]);
    expect(JSON.stringify(logger.mock.calls)).not.toContain("private-");
  });
  it("keeps liveness independent of the database and makes readiness uncached", async () => {
    const { get, connectDatabase } = await boot();
    const live = await get("/health/live");
    expect(await live.json()).toEqual({ status: "alive" });
    expect(connectDatabase).not.toHaveBeenCalled();
    const ready = await get("/health/ready");
    expect(ready.status).toBe(200);
    expect(ready.headers.get("cache-control")).toBe("no-store");
    expect(await ready.json()).toEqual({ status: "ready" });
  });
  it.each([false, "true"])("requires an explicit successful readiness result (%s)", async (value) => {
    const { get } = await boot({ checkReadiness: async () => value });
    expect((await get("/health/ready")).status).toBe(503);
  });
  it("bounds unavailable readiness checks and hides database errors", async () => {
    const { get } = await boot({ checkReadiness: () => new Promise(() => {}), readinessTimeoutMs: 15 });
    expect((await get("/health/ready")).status).toBe(503);
    const failed = await boot({ checkReadiness: () => Promise.reject(new Error("mongodb://private:password@host")) });
    expect(await (await failed.get("/health/ready")).json()).toEqual({ status: "unavailable" });
  });
  it("stops readiness and new API work while draining, including an in-flight probe", async () => {
    const { app, get, connectDatabase } = await boot();
    app.locals.draining = true;
    expect((await get("/health/live")).status).toBe(200);
    expect((await get("/health/ready")).status).toBe(503);
    expect((await get("/api/v1/user/profile")).status).toBe(503);
    expect(connectDatabase).not.toHaveBeenCalled();
    let finish;
    let started;
    const probing = new Promise((resolve) => { started = resolve; });
    const pending = await boot({ checkReadiness: () => { started(); return new Promise((resolve) => { finish = resolve; }); } });
    const request = pending.get("/health/ready");
    await probing;
    pending.app.locals.draining = true;
    finish(true);
    expect((await request).status).toBe(503);
  });
  it("returns a correlated JSON 503 when database connection fails", async () => {
    const { get, logger } = await boot({ connectDatabase: async () => { throw new Error("private-database-password"); } });
    const response = await get("/api/v1/user/profile", { headers: { "X-Request-Id": "attacker-id" } });
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.requestId).toBe(response.headers.get("x-request-id"));
    expect(body.requestId).not.toBe("attacker-id");
    expect(JSON.stringify([body, logger.mock.calls])).not.toContain("private-database-password");
  });
  it("keeps allowed credentialed CORS and rejects other origins with JSON", async () => {
    const { get } = await boot();
    const allowed = await get("/health/live", { headers: { Origin: "https://tadaruj.example.test" } });
    expect(allowed.headers.get("access-control-allow-origin")).toBe("https://tadaruj.example.test");
    expect(allowed.headers.get("access-control-expose-headers")).toBe("X-Request-Id");
    const rejected = await get("/api/v1/user/profile", { headers: { Origin: "https://untrusted.example.test" } });
    expect(rejected.status).toBe(403);
    expect((await rejected.json()).message).toBe("Origin not allowed.");
  });
  it("handles malformed and oversized JSON without reflecting the body", async () => {
    const { get, logger } = await boot();
    const headers = { "Content-Type": "application/json" };
    const bad = await get("/api/v1/user/login", { method: "POST", headers, body: '{"secret":"private-body-value"' });
    expect(bad.status).toBe(400);
    expect((await bad.json()).message).toBe("Invalid request.");
    const large = await get("/api/v1/user/login", { method: "POST", headers, body: JSON.stringify({ data: "x".repeat(110000) }) });
    expect(large.status).toBe(413);
    expect(JSON.stringify(logger.mock.calls)).not.toContain("private-body-value");
  });
  it("preserves raw webhook bytes before JSON parsing", async () => {
    const { get } = await boot();
    const body = '{ "id" : "synthetic-event" }';
    const response = await get("/api/v1/purchase/webhook", { method: "POST", headers: { "Content-Type": "application/json" }, body });
    expect(await response.json()).toEqual({ raw: true, text: body });
  });
  it("keeps server errors, path tokens, query strings, and credentials out of responses and new logs", async () => {
    const { get, logger } = await boot();
    const response = await get("/api/v1/admin/failure/private-path-token?email=private-query-email", {
      method: "POST", headers: { Authorization: "Bearer private-header-token", "Content-Type": "application/json" }, body: '{"password":"private-body-password"}',
    });
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.message).toBe("Internal server error.");
    expect(body.requestId).toBe(response.headers.get("x-request-id"));
    expect(logger.mock.calls.some((call) => call[2]?.route === "/failure/:token")).toBe(true);
    expect(JSON.stringify([body, logger.mock.calls])).not.toMatch(/private-(provider|path|query|header|body)/);
    const missing = await get("/missing?token=private-query-token");
    expect(missing.status).toBe(404);
    expect((await missing.json()).message).toBe("Not found.");
  });
});

describe("graceful shutdown", () => {
  function fixture() {
    let closed;
    const server = { close: vi.fn((callback) => { closed = callback; }), closeIdleConnections: vi.fn(), closeAllConnections: vi.fn() };
    const disconnect = vi.fn().mockResolvedValue();
    const beginDrain = vi.fn();
    const logger = vi.fn();
    const exit = vi.fn();
    const shutdown = createShutdownHandler({ server, disconnect, beginDrain, logger, exit, timeoutMs: 100 });
    return { server, disconnect, beginDrain, logger, exit, shutdown, closed: () => closed };
  }
  it("drains once, waits for active HTTP work, then disconnects", async () => {
    const f = fixture();
    f.shutdown("SIGTERM"); f.shutdown("SIGINT");
    expect(f.beginDrain).toHaveBeenCalledOnce();
    expect(f.server.close).toHaveBeenCalledOnce();
    expect(f.disconnect).not.toHaveBeenCalled();
    await f.closed()();
    expect(f.disconnect).toHaveBeenCalledOnce();
    expect(f.exit).toHaveBeenCalledWith(0);
  });
  it("force-closes stalled connections at the deadline", async () => {
    vi.useFakeTimers();
    const f = fixture(); f.shutdown("SIGTERM");
    await vi.advanceTimersByTimeAsync(101);
    expect(f.server.closeAllConnections).toHaveBeenCalledOnce();
    expect(f.exit).toHaveBeenCalledWith(1);
  });
  it("reports disconnect failure without leaking its message", async () => {
    const f = fixture(); f.disconnect.mockRejectedValue(new Error("private-password")); f.shutdown("SIGTERM");
    await f.closed()();
    expect(f.exit).toHaveBeenCalledWith(1);
    expect(JSON.stringify(f.logger.mock.calls)).not.toContain("private-password");
  });
  it("writes parseable structured events", () => {
    const write = vi.fn(); createLogger(write)("info", "server.test", { status: 200 });
    expect(JSON.parse(write.mock.calls[0][0])).toEqual({ timestamp: expect.any(String), level: "info", event: "server.test", status: 200 });
  });
});
