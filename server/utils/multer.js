import multer from "multer";

// Use memory storage — works reliably on Vercel serverless
// (disk paths in /tmp can be unreliable across function invocations).
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: (process.env.VERCEL ? 4 : 10) * 1024 * 1024, files: 1 },
});

// Legacy server-proxied video uploads are capped; the client normally uploads
// large videos directly to Cloudinary using a signed upload request.
export const uploadVideo = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: (process.env.VERCEL ? 4 : 25) * 1024 * 1024, files: 1 },
});

// Dedicated upload instance for PDF attachments with a 10 MB size cap.
// Failing early in the middleware avoids buffering huge files before
// the controller can inspect them.
export const uploadPdf = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: (process.env.VERCEL ? 4 : 10) * 1024 * 1024, files: 1 },
});

export default upload;
