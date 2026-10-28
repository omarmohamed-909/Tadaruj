import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../utils/cloudinary.js", () => ({
    createCloudinaryUploadSignature: vi.fn(() => ({ cloudName: "test", apiKey: "public-key", signature: "signed" })),
    getCloudinaryResource: vi.fn(),
    readCloudinaryFileHeader: vi.fn(),
}));
import { createCloudinaryUploadSignature, getCloudinaryResource, readCloudinaryFileHeader } from "../utils/cloudinary.js";
import { canUploadPurpose, createDirectUpload, DIRECT_UPLOAD_LIMIT, verifyDirectUpload } from "../utils/directUploads.js";
const userId = "507f1f77bcf86cd799439012";
const uuid = "06360d51-8883-4d12-97df-18e2af5da979";
const id = `lms/lecture-attachments/${userId}/${uuid}.pdf`;
const imageId = `lms/course-thumbnails/${userId}/${uuid}`;
const pdf = { public_id: id, secure_url: "https://res.cloudinary.com/test/raw/authenticated/v1/notes.pdf", type: "authenticated", resource_type: "raw", bytes: 6 * 1024 * 1024 };
beforeEach(() => {
    vi.clearAllMocks();
    getCloudinaryResource.mockResolvedValue(pdf);
    readCloudinaryFileHeader.mockResolvedValue(Buffer.from("%PDF-"));
});

describe("direct uploads", () => {
    it("signs unique private PDF IDs without allowing overwrite", () => {
        const upload = createDirectUpload("attachment", userId);
        expect(upload.params).toEqual({ public_id: expect.stringMatching(new RegExp(`^lms/lecture-attachments/${userId}/[a-f0-9-]{36}\\.pdf$`)), timestamp: expect.any(Number), type: "authenticated", overwrite: false });
        expect(createCloudinaryUploadSignature).toHaveBeenCalledWith(upload.params);
        expect(upload.maxBytes).toBe(DIRECT_UPLOAD_LIMIT);
        expect(upload.resourceType).toBe("raw");
        expect(createDirectUpload("attachment", userId).params.public_id).not.toBe(upload.params.public_id);
    });
    it("allows every role to change only its own avatar, and restricts teaching uploads", () => {
        expect(canUploadPurpose("profile", "student")).toBe(true);
        for (const purpose of ["thumbnail", "quiz", "attachment"]) {
            expect(canUploadPurpose(purpose, "student")).toBe(false);
            expect(canUploadPurpose(purpose, "instructor")).toBe(true);
            expect(canUploadPurpose(purpose, "admin")).toBe(true);
        }
        expect(canUploadPurpose("__proto__", "admin")).toBe(false);
    });
    it("verifies a 6 MB PDF without sending the file through the API", async () => {
        expect(await verifyDirectUpload(id, "attachment", userId)).toEqual({ public_id: id, secure_url: pdf.secure_url });
        expect(getCloudinaryResource).toHaveBeenCalledWith(id, "raw", "authenticated");
        expect(readCloudinaryFileHeader).toHaveBeenCalledWith(id);
    });
    it.each([id.replace(userId, "another-user"), imageId, `${id}/../other.pdf`, "https://evil.test/file.pdf", {}, ""])("rejects an unowned or malformed ID before any provider request: %s", async (value) => {
        await expect(verifyDirectUpload(value, "attachment", userId)).rejects.toMatchObject({ uploadStatus: 400 });
        expect(getCloudinaryResource).not.toHaveBeenCalled();
    });
    it.each([{ type: "upload" }, { resource_type: "image" }, { public_id: "other" }, { bytes: 0 }, { bytes: DIRECT_UPLOAD_LIMIT + 1 }])("rejects untrusted metadata: %s", async (change) => {
        getCloudinaryResource.mockResolvedValue({ ...pdf, ...change });
        await expect(verifyDirectUpload(id, "attachment", userId)).rejects.toMatchObject({ uploadStatus: 400 });
        expect(readCloudinaryFileHeader).not.toHaveBeenCalled();
    });
    it("rejects a renamed non-PDF even with a .pdf suffix", async () => {
        readCloudinaryFileHeader.mockResolvedValue(Buffer.from("<html"));
        await expect(verifyDirectUpload(id, "attachment", userId)).rejects.toMatchObject({ uploadStatus: 400, message: "Uploaded file does not appear to be a valid PDF." });
    });
    it.each(["svg", "pdf"])("rejects %s in an image slot", async (format) => {
        getCloudinaryResource.mockResolvedValue({ ...pdf, public_id: imageId, type: "upload", resource_type: "image", format });
        await expect(verifyDirectUpload(imageId, "thumbnail", userId)).rejects.toMatchObject({ uploadStatus: 400 });
    });
    it("uses the provider's verified image URL", async () => {
        getCloudinaryResource.mockResolvedValue({ ...pdf, public_id: imageId, type: "upload", resource_type: "image", format: "png" });
        expect(await verifyDirectUpload(imageId, "thumbnail", userId)).toEqual({ public_id: imageId, secure_url: pdf.secure_url });
    });
    it("hides provider errors and makes temporary failures retryable", async () => {
        getCloudinaryResource.mockRejectedValue(new Error("private-provider-details"));
        await expect(verifyDirectUpload(id, "attachment", userId)).rejects.toMatchObject({ uploadStatus: 502, message: "Could not verify uploaded file. Please try again." });
    });
});
