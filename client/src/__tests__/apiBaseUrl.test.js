import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

describe("standalone API configuration", () => {
  it.each(["localhost", "127.0.0.1"])("uses the local backend on %s", async (hostname) => {
    vi.resetModules(); vi.stubEnv("VITE_API_BASE_URL", "");
    vi.stubGlobal("window", { location: { hostname } });
    expect((await import("../lib/apiBaseUrl")).API_BASE_URL).toBe("http://localhost:8080");
  });
  it("uses same-origin API routes when production has no explicit backend", async () => {
    vi.resetModules(); vi.stubEnv("VITE_API_BASE_URL", "");
    vi.stubGlobal("window", { location: { hostname: "academy.example.test" } });
    expect((await import("../lib/apiBaseUrl")).API_BASE_URL).toBe("");
  });
  it("uses the configured Tadaruj backend and normalizes trailing slashes", async () => {
    vi.resetModules(); vi.stubEnv("VITE_API_BASE_URL", " https://api.example.test/// ");
    expect((await import("../lib/apiBaseUrl")).API_BASE_URL).toBe("https://api.example.test");
  });
});
