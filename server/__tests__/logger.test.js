import { afterEach, describe, expect, it, vi } from "vitest";
import { setTimeout as delay } from "node:timers/promises";
import { createLogger, reportError, withRequestLogging } from "../utils/logger.js";

afterEach(() => vi.restoreAllMocks());
describe("safe operational errors", () => {
  it("keeps nested provider payloads, messages, stacks and arbitrary names/codes out of JSON logs", () => {
    const write = vi.fn();
    const toJSON = vi.fn(() => ({ token: "private-serialized-token" }));
    const error = Object.assign(new Error("private-password mongodb://private-connection"), {
      name: "private-error-name", code: "private-error-code", stack: "private-stack",
      response: { data: { email: "private-email", resetUrl: "https://example.test/reset/private-token" } }, toJSON,
    });
    withRequestLogging({ requestId: "server-generated-id", logger: createLogger(write) }, () => reportError("email.delivery_failed", error));
    expect(JSON.parse(write.mock.calls[0][0])).toEqual({ timestamp: expect.any(String), level: "error", event: "email.delivery_failed", requestId: "server-generated-id", errorType: "Error" });
    expect(write.mock.calls[0][0]).not.toContain("private-");
    expect(toJSON).not.toHaveBeenCalled();
  });
  it("preserves known failure classifications without logging unique-index values", () => {
    const write = vi.fn();
    const error = { name: "MongoServerError", code: 11000, keyValue: { email: "private-email" } };
    withRequestLogging({ logger: createLogger(write) }, () => reportError("user.register.failed", error, "warn"));
    expect(JSON.parse(write.mock.calls[0][0])).toEqual({ timestamp: expect.any(String), level: "warn", event: "user.register.failed", errorType: "MongoServerError", errorCode: 11000 });
  });
  it("keeps simultaneous asynchronous requests separate", async () => {
    const first = vi.fn(), second = vi.fn();
    await Promise.all([
      withRequestLogging({ requestId: "request-one", logger: createLogger(first) }, async () => { await delay(15); reportError("user.login.failed", new Error("private-one")); }),
      withRequestLogging({ requestId: "request-two", logger: createLogger(second) }, async () => { await delay(1); reportError("course.edit.failed", new TypeError("private-two")); }),
    ]);
    expect(JSON.parse(first.mock.calls[0][0]).requestId).toBe("request-one");
    expect(JSON.parse(second.mock.calls[0][0]).requestId).toBe("request-two");
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });
  it("does not reuse a request ID for background operations after the context exits", () => {
    const write = vi.fn();
    const consoleOutput = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(() => withRequestLogging({ requestId: "finished-request", logger: createLogger(write) }, () => { throw new Error("private-error"); })).toThrow();
    reportError("media.configuration_missing");
    expect(JSON.parse(consoleOutput.mock.calls[0][0])).toEqual({ timestamp: expect.any(String), level: "error", event: "media.configuration_missing" });
    expect(write).not.toHaveBeenCalled();
  });
});
