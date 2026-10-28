import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import { directUpload, MAX_UPLOAD_BYTES, validateUpload } from "../lib/directUpload";
vi.mock("axios", () => ({ default: { post: vi.fn() } }));
beforeEach(() => { vi.clearAllMocks(); window.localStorage.setItem("lms_auth_token", "private-session"); });
afterEach(() => window.localStorage.clear());
const upload = { cloudName: "test", apiKey: "public-key", signature: "signed", resourceType: "raw", params: { public_id: "owned-id.pdf", type: "authenticated", overwrite: false, timestamp: 123 } };
describe("browser uploads", () => {
  it("uploads a 6 MB PDF straight to storage and returns the signed ID", async () => {
    const file = new File([new Uint8Array(6 * 1024 * 1024)], "notes.pdf", { type: "application/pdf" });
    axios.post.mockResolvedValueOnce({ data: { data: upload } }).mockResolvedValueOnce({ data: { public_id: "untrusted-response-id" } });
    expect(await directUpload(file, "attachment")).toEqual({ public_id: "owned-id.pdf" });
    expect(axios.post.mock.calls[0][1]).toEqual({ purpose: "attachment" });
    const [url, body, options] = axios.post.mock.calls[1];
    expect(url).toBe("https://api.cloudinary.com/v1_1/test/raw/upload");
    expect(body.get("file")).toBe(file);
    expect(body.get("overwrite")).toBe("false");
    expect(options).toBeUndefined();
    expect(axios.post.mock.calls[0][2].headers.Authorization).toBe("Bearer private-session");
  });
  it("requests a verified quiz image URL from our API", async () => {
    const asset = { public_id: "quiz-id", secure_url: "verified-url" };
    axios.post.mockResolvedValueOnce({ data: { data: { ...upload, params: { ...upload.params, public_id: "quiz-id" }, resourceType: "image" } } }).mockResolvedValueOnce({}).mockResolvedValueOnce({ data: { data: asset } });
    expect(await directUpload(new File(["image"], "quiz.png", { type: "image/png" }), "quiz")).toEqual(asset);
    expect(axios.post.mock.calls[2][0]).toMatch(/\/verify-quiz-image$/);
    expect(axios.post.mock.calls[2][1]).toEqual({ publicId: "quiz-id" });
  });
  it("rejects oversize and unsupported files before sending any request", async () => {
    await expect(directUpload(new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], "big.pdf", { type: "application/pdf" }), "attachment")).rejects.toThrow("10 MB");
    expect(() => validateUpload(new File(["<svg/>"], "image.svg", { type: "image/svg+xml" }), "profile")).toThrow("Choose a JPG");
    expect(axios.post).not.toHaveBeenCalled();
  });
  it("stops when storage fails and does not finalize an absent upload", async () => {
    axios.post.mockResolvedValueOnce({ data: { data: upload } }).mockRejectedValueOnce(new Error("offline"));
    await expect(directUpload(new File(["%PDF-"], "notes.pdf", { type: "application/pdf" }), "attachment")).rejects.toThrow("offline");
    expect(axios.post).toHaveBeenCalledTimes(2);
  });
});
