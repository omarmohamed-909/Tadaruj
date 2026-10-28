import { afterAll, expect, it, vi } from "vitest";
import { createLogger, withRequestLogging } from "../utils/logger.js";
const provider = vi.hoisted(() => ({ constructEvent: vi.fn() }));
vi.mock("stripe", () => ({ default: class { webhooks = { constructEvent: provider.constructEvent }; } }));
vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_local_placeholder");
vi.stubEnv("WEBHOOK_ENDPOINT_SECRET", "whsec_local_placeholder");
const { stripeWebhook } = await import("../controllers/coursePurchase.controller.js");
afterAll(() => vi.unstubAllEnvs());

it("does not reflect a rejected webhook's provider error or signed payload", async () => {
  provider.constructEvent.mockImplementation(() => { throw new Error("private-signature private-request-body"); });
  const write = vi.fn();
  const res = { status: vi.fn().mockReturnThis(), send: vi.fn() };
  await withRequestLogging({ requestId: "server-webhook-id", logger: createLogger(write) }, () => stripeWebhook({ headers: { "stripe-signature": "private-signature" }, body: Buffer.from("private-request-body") }, res));
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.send).toHaveBeenCalledWith("Invalid webhook signature.");
  expect(JSON.parse(write.mock.calls[0][0])).toMatchObject({ event: "course_purchase.stripe_webhook.signature_invalid", level: "warn", requestId: "server-webhook-id" });
  expect(JSON.stringify([res.send.mock.calls, write.mock.calls])).not.toContain("private-");
});
