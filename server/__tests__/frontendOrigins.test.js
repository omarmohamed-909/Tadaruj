import { describe, expect, it } from "vitest";
import { createFrontendOriginCheck } from "../utils/frontendOrigins.js";

describe("standalone frontend origins", () => {
  it("accepts only configured production origins", () => {
    const accepts = createFrontendOriginCheck({ NODE_ENV: "production", FRONTEND_URL: "https://learn.example.test", FRONTEND_URLS: "https://preview.example.test/" });
    expect(accepts("https://learn.example.test")).toBe(true);
    expect(accepts("https://preview.example.test")).toBe(true);
    expect(accepts("https://unknown.example.test")).toBe(false);
    expect(accepts("https://learn.example.test.attacker.test")).toBe(false);
  });
  it("does not implicitly trust localhost or arbitrary previews in production", () => {
    const accepts = createFrontendOriginCheck({ NODE_ENV: "production" });
    expect(accepts("http://localhost:5173")).toBe(false);
    expect(accepts("https://unconfigured-preview.vercel.app")).toBe(false);
  });
  it("supports local development without a production deployment dependency", () => {
    const accepts = createFrontendOriginCheck({ NODE_ENV: "development" });
    expect(accepts("http://localhost:5173")).toBe(true);
    expect(accepts("http://127.0.0.1:5188")).toBe(true);
    expect(accepts("http://localhost.attacker.test:5173")).toBe(false);
  });
  it("fails closed for invalid or insecure production settings", () => {
    const accepts = createFrontendOriginCheck({ NODE_ENV: "production", FRONTEND_URL: "invalid", FRONTEND_URLS: "http://insecure.example.test" });
    expect(accepts("http://insecure.example.test")).toBe(false);
  });
});
