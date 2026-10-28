import { v2 as cloudinary } from 'cloudinary';
import dotenv from "dotenv";
dotenv.config({});

const parseCloudinaryUrl = (cloudinaryUrl) => {
    if (!cloudinaryUrl) {
        return null;
    }

    try {
        const parsedUrl = new URL(cloudinaryUrl);

        return {
            api_key: decodeURIComponent(parsedUrl.username || ""),
            api_secret: decodeURIComponent(parsedUrl.password || ""),
            cloud_name: parsedUrl.hostname || "",
        };
    } catch (error) {
        console.error("Invalid CLOUDINARY_URL:", error?.message || error);
        return null;
    }
};

const specificCloudinaryConfig = {
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
};

const legacyCloudinaryConfig = {
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
    cloud_name: process.env.CLOUD_NAME,
};

const cloudinaryUrlConfig = parseCloudinaryUrl(process.env.CLOUDINARY_URL);

const hasCloudinaryUrl =
    Boolean(cloudinaryUrlConfig?.api_key) &&
    Boolean(cloudinaryUrlConfig?.api_secret) &&
    Boolean(cloudinaryUrlConfig?.cloud_name);

const hasSpecificCloudinaryConfig =
    Boolean(specificCloudinaryConfig.api_key) &&
    Boolean(specificCloudinaryConfig.api_secret) &&
    Boolean(specificCloudinaryConfig.cloud_name);

const hasLegacyCloudinaryConfig =
    Boolean(legacyCloudinaryConfig.api_key) &&
    Boolean(legacyCloudinaryConfig.api_secret) &&
    Boolean(legacyCloudinaryConfig.cloud_name);

const cloudinaryConfig = hasCloudinaryUrl
    ? cloudinaryUrlConfig
    : hasSpecificCloudinaryConfig
        ? specificCloudinaryConfig
        : legacyCloudinaryConfig;

const hasCloudinaryConfig =
    hasCloudinaryUrl || hasSpecificCloudinaryConfig || hasLegacyCloudinaryConfig;

if (!hasCloudinaryConfig) {
    console.error("Cloudinary config missing. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET on deployment.");
}

if (hasCloudinaryConfig) {
    cloudinary.config({
        api_key: cloudinaryConfig.api_key,
        api_secret: cloudinaryConfig.api_secret,
        cloud_name: cloudinaryConfig.cloud_name,
        secure: true,
    });
}

const ensureCloudinaryConfig = () => {
    if (!hasCloudinaryConfig) {
        throw new Error("Cloudinary is not configured");
    }
};

const uploadBufferWithStream = (fileBuffer, options = {}) =>
    new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: "auto",
                ...options,
            },
            (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(result);
            }
        );

        uploadStream.end(fileBuffer);
    });

export const extractPublicIdFromUrl = (mediaUrl) => {
    if (!mediaUrl) {
        return "";
    }

    try {
        const parsedUrl = new URL(mediaUrl);
        const pathSegments = parsedUrl.pathname.split("/").filter(Boolean);
        const uploadIndex = pathSegments.findIndex((segment) => ["upload", "authenticated", "private"].includes(segment));

        if (uploadIndex === -1 || uploadIndex === pathSegments.length - 1) {
            return "";
        }

        const publicIdSegments = [...pathSegments.slice(uploadIndex + 1)];
        // Authenticated upload responses include a delivery-signature segment
        // before the version. It is URL metadata, not part of the asset ID.
        if (/^s--[A-Za-z0-9_-]+--$/.test(publicIdSegments[0] || "")) {
            publicIdSegments.shift();
        }
        const firstSegment = publicIdSegments[0] || "";

        if (/^v\d+$/i.test(firstSegment)) {
            publicIdSegments.shift();
        }

        if (!publicIdSegments.length) {
            return "";
        }

        const lastSegment = publicIdSegments.pop();
        // Cloudinary raw public IDs include their extension; image/video IDs do not.
        const resourceType = pathSegments[uploadIndex - 1];
        const normalizedLastSegment = resourceType === "raw"
            ? lastSegment
            : lastSegment?.replace(/\.[^.]+$/, "");

        return [...publicIdSegments, normalizedLastSegment].filter(Boolean).join("/");
    } catch (error) {
        console.error("Failed to extract Cloudinary public ID:", error?.message || error);
        return "";
    }
};

// Authenticated assets must never be returned with their unsigned storage URL.
// Cloudinary's private download URL expires and is issued only after our API checks access.
export const getProtectedMediaUrl = (mediaUrl, publicId, resourceType = "video") => {
    if (!mediaUrl) return "";
    if (!mediaUrl.includes(`/${resourceType}/authenticated/`)) return mediaUrl; // Legacy public assets need migration.
    if (!hasCloudinaryConfig || !publicId || extractPublicIdFromUrl(mediaUrl) !== publicId) return "";
    const format = mediaUrl.split("?")[0].split(".").pop()?.toLowerCase();
    if (!/^[a-z0-9]{2,8}$/.test(format || "")) return "";
    return cloudinary.utils.private_download_url(publicId, format, {
        resource_type: resourceType,
        type: "authenticated",
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
    });
};

export const migrateAssetToAuthenticated = async (publicId, resourceType) => {
    ensureCloudinaryConfig();
    if (!publicId || !["video", "raw"].includes(resourceType)) throw new Error("Invalid protected media asset.");
    return cloudinary.uploader.rename(publicId, publicId, {
        resource_type: resourceType,
        type: "upload",
        to_type: "authenticated",
        invalidate: true,
    });
};

export const uploadMedia = async (file, options = {}) => {
    ensureCloudinaryConfig();

    try {
        if (Buffer.isBuffer(file)) {
            return await uploadBufferWithStream(file, options);
        }

        const uploadResponse = await cloudinary.uploader.upload(file, {
            resource_type: "auto",
            ...options,
        });
        return uploadResponse;
    } catch (error) {
        console.error("Cloudinary upload error:", error?.message || error);
        throw new Error("Media upload failed");
    }
};

export const createCloudinaryUploadSignature = (paramsToSign = {}) => {
    ensureCloudinaryConfig();

    const signature = cloudinary.utils.api_sign_request(
        paramsToSign,
        cloudinary.config().api_secret
    );

    return {
        signature,
        apiKey: cloudinary.config().api_key,
        cloudName: cloudinary.config().cloud_name,
    };
};

export const getCloudinaryResource = (publicId, resourceType, type) => {
    ensureCloudinaryConfig();
    return cloudinary.api.resource(publicId, { resource_type: resourceType, type, timeout: 10000 });
};

export const readCloudinaryFileHeader = async (publicId) => {
    ensureCloudinaryConfig();
    // Build the URL ourselves; client input must never choose a fetch destination.
    const url = cloudinary.utils.private_download_url(publicId, "pdf", {
        resource_type: "raw", type: "authenticated", expires_at: Math.floor(Date.now() / 1000) + 60,
    });
    const response = await fetch(url, { headers: { Range: "bytes=0-4" }, signal: AbortSignal.timeout(10000), redirect: "error" });
    if (!response.ok || !response.body) throw new Error("Could not read uploaded PDF.");
    const reader = response.body.getReader();
    const prefix = Buffer.alloc(5);
    let offset = 0;
    try {
        while (offset < prefix.length) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = value.subarray(0, prefix.length - offset);
            prefix.set(chunk, offset);
            offset += chunk.length;
        }
    } finally { await reader.cancel(); }
    return prefix.subarray(0, offset);
};

export const deleteMediaFromCloudinary = async (publicId, resourceType = "image", deliveryType = "upload") => {
    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, type: deliveryType });
    } catch (error) {
        console.log(error)
    }
};

export const deleteVideoFromCloudinary = async (publicId, deliveryType = "upload")=>{
    try {
        await cloudinary.uploader.destroy(publicId,{resource_type:"video", type:deliveryType})
    } catch (error) {
        console.log(error);
    }
}
