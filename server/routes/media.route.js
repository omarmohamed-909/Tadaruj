import express from "express";
import authorizeRoles from "../middlewares/authorizeRoles.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import upload, { uploadVideo } from "../utils/multer.js";
import { createCloudinaryUploadSignature, uploadMedia } from "../utils/cloudinary.js";

const router = express.Router();

router.route("/upload-video-signature").post(isAuthenticated, authorizeRoles("instructor", "admin"), async (req, res) => {
    try {
        const timestamp = Math.round(Date.now() / 1000);
        const folder = `lms/lectures/${req.id}`;
        const type = "authenticated";
        const paramsToSign = {
            folder,
            timestamp,
            type,
        };

        const signaturePayload = createCloudinaryUploadSignature(paramsToSign);

        return res.status(200).json({
            success: true,
            data: {
                ...signaturePayload,
                folder,
                timestamp,
                type,
            },
        });
    } catch (error) {
        console.error("Failed to create Cloudinary signature:", error?.message || error);
        return res.status(500).json({
            success: false,
            message: error?.message || "Could not initialize video upload.",
        });
    }
});

router.route("/upload-video").post(isAuthenticated, authorizeRoles("instructor", "admin"), uploadVideo.single("file"), async(req,res)=>{
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file was uploaded.",
            });
        }

        const result = await uploadMedia(req.file.buffer || req.file.path, { folder: `lms/lectures/${req.id}`, type: "authenticated", resource_type: "video" });
        res.status(200).json({
            success:true,
            message:"File uploaded successfully.",
            data: result
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: error?.message || "Error uploading file",
        })

    }
});

router.route("/upload-image").post(
    isAuthenticated,
    authorizeRoles("instructor", "admin"),
    upload.single("file"),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "No image was uploaded.",
                });
            }

            const result = await uploadMedia(req.file.buffer || req.file.path, {
                folder: `lms/quiz-questions/${req.id}`,
                resource_type: "image",
            });

            return res.status(200).json({
                success: true,
                message: "Image uploaded successfully.",
                data: result,
            });
        } catch (error) {
            console.log(error);
            return res.status(500).json({
                success: false,
                message: error?.message || "Error uploading image",
            });
        }
    }
);
export default router;
