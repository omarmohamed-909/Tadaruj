import { randomUUID } from "node:crypto";
import { createCloudinaryUploadSignature, getCloudinaryResource, readCloudinaryFileHeader } from "./cloudinary.js";

export const DIRECT_UPLOAD_LIMIT = 10 * 1024 * 1024;
const purposes = {
    profile: { folder: "profile-photos", resourceType: "image", type: "upload" },
    thumbnail: { folder: "course-thumbnails", resourceType: "image", type: "upload" },
    quiz: { folder: "quiz-questions", resourceType: "image", type: "upload" },
    attachment: { folder: "lecture-attachments", resourceType: "raw", type: "authenticated" },
};
export const uploadError = (message, status = 400) => Object.assign(new Error(message), { uploadStatus: status });

export function canUploadPurpose(purpose, role) {
    return Object.hasOwn(purposes, purpose) && (purpose === "profile" || ["admin", "instructor"].includes(role));
}

export function createDirectUpload(purpose, userId) {
    const config = purposes[purpose];
    if (!config || !userId) throw uploadError("Invalid upload purpose.");
    const params = {
        public_id: `lms/${config.folder}/${userId}/${randomUUID()}${purpose === "attachment" ? ".pdf" : ""}`,
        timestamp: Math.floor(Date.now() / 1000),
        type: config.type,
        overwrite: false,
    };
    return { ...createCloudinaryUploadSignature(params), params, resourceType: config.resourceType, maxBytes: DIRECT_UPLOAD_LIMIT };
}

// Never trust a browser-supplied URL, MIME type, size or upload response.
export async function verifyDirectUpload(publicId, purpose, userId) {
    const config = purposes[purpose];
    const prefix = config && `lms/${config.folder}/${userId}/`;
    const name = typeof publicId === "string" && publicId.startsWith(prefix) ? publicId.slice(prefix.length) : "";
    const pattern = purpose === "attachment" ? /^[0-9a-f-]{36}\.pdf$/
        : purpose === "quiz" ? /^[a-zA-Z0-9_-]{1,100}$/ : /^[0-9a-f-]{36}$/;
    if (!config || !userId || !pattern.test(name)) throw uploadError("Invalid or unowned upload.");
    let asset;
    try {
        asset = await getCloudinaryResource(publicId, config.resourceType, config.type);
    } catch (error) {
        throw uploadError(error?.http_code === 404 ? "Uploaded file was not found." : "Could not verify uploaded file. Please try again.", error?.http_code === 404 ? 400 : 502);
    }
    if (asset.public_id !== publicId || asset.resource_type !== config.resourceType || asset.type !== config.type || !asset.secure_url) {
        throw uploadError("Invalid or unowned upload.");
    }
    if (!Number.isSafeInteger(asset.bytes) || asset.bytes <= 0 || asset.bytes > DIRECT_UPLOAD_LIMIT) {
        throw uploadError("File must be 10 MB or smaller.");
    }
    if (config.resourceType === "image" && !["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(asset.format)) {
        throw uploadError("Choose a JPG, PNG, WebP, GIF or AVIF image.");
    }
    if (purpose === "attachment") {
        let header;
        try { header = await readCloudinaryFileHeader(publicId); }
        catch { throw uploadError("Could not verify uploaded file. Please try again.", 502); }
        if (!header.equals(Buffer.from("%PDF-"))) throw uploadError("Uploaded file does not appear to be a valid PDF.");
    }
    return { public_id: asset.public_id, secure_url: asset.secure_url };
}
