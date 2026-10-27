import mongoose from "mongoose";
import { Course } from "../models/course.model.js";
import { Lecture } from "../models/lecture.model.js";
import { CoursePurchase } from "../models/coursePurchase.model.js";
import { CourseProgress } from "../models/courseProgress.js";
import { LectureComment } from "../models/lectureComment.model.js";
import { Notification } from "../models/notification.model.js";
import { QuizResult } from "../models/quizResult.model.js";
import { User } from "../models/user.model.js";
import { AuditLog } from "../models/auditLog.model.js";
import { courseSubject, escapeRegex, isLegacyGrade } from "../utils/courseTaxonomy.js";
import { readCoursePagination, readPublicCoursePage } from "../utils/courseListing.js";
import {
    deleteMediaFromCloudinary,
    deleteVideoFromCloudinary,
    extractPublicIdFromUrl,
    getProtectedMediaUrl,
    uploadMedia,
} from "../utils/cloudinary.js";

const sanitizeQuizQuestions = (quizQuestions = []) => {
    const sanitizedQuizQuestions = [];

    for (const item of quizQuestions) {
        const questionText = item?.questionText?.trim();
        const rawQuestionImageUrl =
            item?.questionImageUrl ||
            item?.questionImage ||
            item?.imageUrl ||
            item?.image ||
            "";
        const rawQuestionImagePublicId =
            item?.questionImagePublicId ||
            item?.questionImagePublicID ||
            item?.imagePublicId ||
            "";
        const questionImageUrl = typeof rawQuestionImageUrl === "string" ? rawQuestionImageUrl.trim() : "";
        const questionImagePublicId = typeof rawQuestionImagePublicId === "string" ? rawQuestionImagePublicId.trim() : "";
        const options = (item?.options || [])
            .map((option) => (typeof option === "string" ? option.trim() : ""))
            .filter(Boolean);
        const correctOptionIndex = Number(item?.correctOptionIndex);

        if (!questionText && !questionImageUrl) {
            return { error: "Each quiz question must include text or image." };
        }

        if (options.length < 2) {
            return { error: "Each quiz question must include at least 2 options." };
        }

        if (
            Number.isNaN(correctOptionIndex) ||
            correctOptionIndex < 0 ||
            correctOptionIndex >= options.length
        ) {
            return { error: "Each quiz question must have a valid correct option." };
        }

        sanitizedQuizQuestions.push({
            questionText,
            questionImageUrl,
            questionImagePublicId,
            options,
            correctOptionIndex,
        });
    }

    return { data: sanitizedQuizQuestions };
};

const collectLectureAssetDeletionTasks = (lecture = {}) => {
    const deletionTasks = [];

    if (lecture.publicId) {
        deletionTasks.push(lecture.videoUrl?.includes("/video/authenticated/") ? deleteVideoFromCloudinary(lecture.publicId, "authenticated") : deleteVideoFromCloudinary(lecture.publicId));
    }

    if (lecture.attachmentPublicId) {
        deletionTasks.push(lecture.attachmentUrl?.includes("/raw/authenticated/") ? deleteMediaFromCloudinary(lecture.attachmentPublicId, "raw", "authenticated") : deleteMediaFromCloudinary(lecture.attachmentPublicId, "raw"));
    }

    const quizImagePublicIds = [
        ...new Set(
            (lecture.quizQuestions || [])
                .map((question) => question.questionImagePublicId)
                .filter(Boolean)
        ),
    ];

    quizImagePublicIds.forEach((publicId) => {
        deletionTasks.push(deleteMediaFromCloudinary(publicId, "image"));
    });

    return deletionTasks;
};

export const createCourse = async (req,res) => {
    try {
        const courseTitle = String(req.body.courseTitle || "").trim();
        const category = String(req.body.category || "").trim();
        const subject = String(req.body.subject || courseSubject({ category })).trim();
        const gradeLevel = String(req.body.gradeLevel || (isLegacyGrade(category) ? category : "")).trim();
        if(!courseTitle || !subject) {
            return res.status(400).json({
                message:"Course title and subject are required."
            })
        }

        const course = await Course.create({
            courseTitle,
            category,
            subject,
            gradeLevel,
            creator:req.id
        });

        return res.status(201).json({
            course,
            message:"Course created."
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message:"Failed to create course"
        })
    }
}

export const searchCourse = async (req,res) => {
    try {
        const pagination = readCoursePagination(req.query);
        if (!pagination) return res.status(400).json({ message: "Invalid course pagination." });
        const {query = "", categories = [], subjects = [], grades = [], sortByPrice =""} = req.query;
        const parseList = (value) => (Array.isArray(value) ? value : String(value || "").split(","))
            .map((item) => String(item).trim()).filter(Boolean).slice(0, 20);
        const legacyFilters = parseList(categories);
        const subjectFilters = [...parseList(subjects), ...legacyFilters.filter((item) => !isLegacyGrade(item))];
        const gradeFilters = [...parseList(grades), ...legacyFilters.filter(isLegacyGrade)];

        // 1. تنظيف نص البحث لتجنب الأخطاء
        const cleanQuery = query === "undefined" || query === "null" ? "" : String(query).trim().slice(0, 100);

        // 2. الشرط الأساسي: الكورس لازم يكون منشور
        const searchCriteria = {
            isPublished: true,
        };

        // 3. البحث بالنص (فقط إذا كتب المستخدم شيئاً)
        if(cleanQuery) {
            const safeQuery = escapeRegex(cleanQuery);
            searchCriteria.$or = [
                {courseTitle: {$regex:safeQuery, $options:"i"}},
                {subTitle: {$regex:safeQuery, $options:"i"}},
                {subject: {$regex:safeQuery, $options:"i"}},
                {gradeLevel: {$regex:safeQuery, $options:"i"}},
                {category: {$regex:safeQuery, $options:"i"}},
            ];
        }

        const exactMatches = (items) => ({ $in: items.map((item) => new RegExp(`^${escapeRegex(item)}$`, "i")) });
        if (subjectFilters.length || gradeFilters.length) searchCriteria.$and = [];
        if (subjectFilters.length) {
            const match = exactMatches(subjectFilters);
            searchCriteria.$and.push({ $or: [{ subject: match }, { subject: "", category: match }, { subject: { $exists: false }, category: match }] });
        }
        if (gradeFilters.length) {
            const match = exactMatches(gradeFilters);
            searchCriteria.$and.push({ $or: [{ gradeLevel: match }, { gradeLevel: "", category: match }, { gradeLevel: { $exists: false }, category: match }] });
        }

        // 5. ترتيب الكورسات حسب السعر
        const sortOptions = sortByPrice === "low" ? { coursePrice: 1, _id: 1 }
            : sortByPrice === "high" ? { coursePrice: -1, _id: -1 }
            : { createdAt: -1, _id: -1 };

        // 6. جلب البيانات من الداتا بيز
        const result = await readPublicCoursePage(searchCriteria, pagination, sortOptions);

        return res.status(200).json({
            success: true,
            ...result,
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to search courses"
        });
    }
}

export const getPublishedCourse = async (req, res) => {
    try {
        const pagination = readCoursePagination(req?.query);
        if (!pagination) return res.status(400).json({ message: "Invalid course pagination." });
        return res.status(200).json(await readPublicCoursePage({ isPublished: true }, pagination));
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Failed to get published courses" });
    }
};
export const getCourseFilters = async (_req, res) => {
    try {
        const published = { isPublished: true };
        const missing = (field) => ({ ...published, $or: [{ [field]: "" }, { [field]: { $exists: false } }] });
        const [subjects, grades, subjectCategories, gradeCategories] = await Promise.all([
            Course.distinct("subject", published),
            Course.distinct("gradeLevel", published),
            Course.distinct("category", missing("subject")),
            Course.distinct("category", missing("gradeLevel")),
        ]);
        const choices = (values) => [...new Set(values.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()))].sort((a, b) => a.localeCompare(b));
        return res.json({
            subjects: choices([...subjects, ...subjectCategories.filter((value) => !isLegacyGrade(value))]),
            grades: choices([...grades, ...gradeCategories.filter(isLegacyGrade)]),
        });
    } catch {
        return res.status(500).json({ message: "Could not load course filters." });
    }
};
export const getCreatorCourses = async (req,res) => {
    try {
        const userId = req.id;
        const courses = await Course.find({creator:userId});
        if(!courses){
            return res.status(404).json({
                courses:[],
                message:"Course not found"
            })
        };
        return res.status(200).json({
            courses,
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message:"Failed to create course"
        })
    }
}
export const editCourse = async (req,res) => {
    try {
        const courseId = req.params.courseId;
        const {courseTitle, subTitle, description, category, subject, gradeLevel, courseLevel, coursePrice} = req.body;
        const thumbnail = req.file;

        let course = await Course.findById(courseId);
        if(!course){
            return res.status(404).json({
                message:"Course not found!"
            })
        }
        if (courseTitle !== undefined && !String(courseTitle).trim()) {
            return res.status(400).json({ message: "Course title is required." });
        }
        if (subject !== undefined && !String(subject).trim()) {
            return res.status(400).json({ message: "Subject is required." });
        }
        const normalizedLevel = typeof courseLevel === "string" ? courseLevel.trim() : courseLevel;
        if (courseLevel !== undefined && !["", "Beginner", "Medium", "Advance"].includes(normalizedLevel)) {
            return res.status(400).json({ message: "Choose a valid course level or leave it unset." });
        }
        if (coursePrice !== undefined &&
            (!["number", "string"].includes(typeof coursePrice) || String(coursePrice).trim() === "" || !Number.isFinite(Number(coursePrice)) || Number(coursePrice) < 0)) {
            return res.status(400).json({ message: "Course price must be a non-negative number." });
        }
        if (course.isPublished && Number(coursePrice === undefined ? course.coursePrice : coursePrice) > 0) {
            const owner = await User.findById(course.creator).select("instructorWhatsapp status");
            if (!owner || owner.status === "suspended" || !owner.instructorWhatsapp) {
                return res.status(400).json({ message:"The course instructor must add a WhatsApp number before offering a paid course." });
            }
        }
        const previousThumbnail = course.courseThumbnail;
        const courseThumbnail = thumbnail ? await uploadMedia(thumbnail.buffer || thumbnail.path) : null;

        const updateData = { courseTitle: courseTitle === undefined ? undefined : String(courseTitle).trim(), subTitle, description, coursePrice };
        if (normalizedLevel) updateData.courseLevel = normalizedLevel;
        if (category !== undefined) updateData.category = category;
        if (subject !== undefined) updateData.subject = String(subject).trim();
        if (gradeLevel !== undefined) updateData.gradeLevel = String(gradeLevel).trim();
        if (courseThumbnail?.secure_url) updateData.courseThumbnail = courseThumbnail.secure_url;

        const update = { $set: Object.fromEntries(Object.entries(updateData).filter(([, value]) => value !== undefined)) };
        if (normalizedLevel === "") update.$unset = { courseLevel: 1 };
        course = await Course.findByIdAndUpdate(courseId, update, { new: true, runValidators: true });
        if (courseThumbnail?.secure_url && previousThumbnail) {
            const oldPublicId = extractPublicIdFromUrl(previousThumbnail);
            if (oldPublicId) await deleteMediaFromCloudinary(oldPublicId, "image").catch((error) => console.error("Old thumbnail cleanup failed:", error));
        }

        return res.status(200).json({
            course,
            message:"Course updated successfully."
        })

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message:"Failed to create course"
        })
    }
}
export const deleteCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.id;
        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return res.status(400).json({
                message: "Invalid course id.",
            });
        }

        const courseObjectId = new mongoose.Types.ObjectId(courseId);
        const courseQuery = Course.findById(courseObjectId).populate("lectures");
        const course = await courseQuery;

        if (!course) {
            return res.status(404).json({
                message: "Course not found!",
            });
        }

        if (req.user?.role !== "admin" && course.creator?.toString() !== userId) {
            return res.status(403).json({
                message: "You are not allowed to delete this course.",
            });
        }

        if (await CoursePurchase.exists({ courseId: courseObjectId, status: "completed" })) {
            return res.status(409).json({ message: "This course has purchase history. Unpublish it instead of deleting it." });
        }

        const validLectures = (course.lectures || []).filter(Boolean);
        const cloudinaryDeletionTasks = [];
        const lectureIds = validLectures.map((lecture) => lecture._id);

        if (course.courseThumbnail) {
            const thumbnailPublicId = extractPublicIdFromUrl(course.courseThumbnail);
            if (thumbnailPublicId) {
                cloudinaryDeletionTasks.push(
                    deleteMediaFromCloudinary(thumbnailPublicId, "image")
                );
            }
        }

        validLectures.forEach((lecture) => {
            cloudinaryDeletionTasks.push(...collectLectureAssetDeletionTasks(lecture));
        });

        await Promise.allSettled(cloudinaryDeletionTasks);

        if (lectureIds.length) {
            await Lecture.deleteMany({
                _id: { $in: lectureIds },
            });
        }

        const courseNotificationLinkPattern = new RegExp(
            `/course-progress/${courseId}(?:\\?|$)`
        );

        await Promise.all([
            LectureComment.deleteMany({ courseId }),
            QuizResult.deleteMany({ courseId }),
            CoursePurchase.deleteMany({ courseId }),
            CourseProgress.deleteMany({ courseId }),
            Notification.deleteMany({
                link: { $regex: courseNotificationLinkPattern },
            }),
            User.updateMany(
                { enrolledCourses: courseObjectId },
                { $pull: { enrolledCourses: courseObjectId } }
            ),
        ]);

        await Course.findByIdAndDelete(courseObjectId);
        await AuditLog.create({ actor: req.id, action: "course.deleted", targetType: "Course", targetId: courseId, metadata: { title: course.courseTitle }, ip: req.ip }).catch((error) => console.error("Audit logging failed:", error));

        return res.status(200).json({
            message: "Course deleted successfully.",
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to delete course.",
        });
    }
}
const loadCourseById = async (req, res, publishedOnly = false) => {
    try {
        const { courseId } = req.params;

        const course = await Course.findById(courseId)
            .populate({ path: "creator", select: "name photoUrl" })
            .populate({ path: "lectures" });

        if (!course || (publishedOnly && !course.isPublished)) {
            return res.status(404).json({ message: "Course not found!" });
        }

        if (!publishedOnly && !course.isPublished && req.user?.role !== "admin" && course.creator?._id?.toString() !== req.id?.toString()) {
            return res.status(404).json({ message: "Course not found!" });
        }

        const sourceLectures = course.lectures || [];
        const hasExplicitPreviewConfig = sourceLectures.some((lecture) => typeof lecture.previewEnabledByAdmin === "boolean");
        const allLegacyLecturesMarkedFree = sourceLectures.length > 1 && sourceLectures.every((lecture) => Boolean(lecture.isPreviewFree));
        const safeLectures = sourceLectures.map((lecture, index) => {
            const lec = lecture.toObject();
            delete lec.attachmentUrl;
            delete lec.attachmentPublicId;
            delete lec.quizQuestions;
            delete lec.publicId;
            const isPreviewFree = typeof lec.previewEnabledByAdmin === "boolean"
                ? Boolean(lec.previewEnabledByAdmin && lec.isPreviewFree)
                : !hasExplicitPreviewConfig && (allLegacyLecturesMarkedFree ? index === 0 : Boolean(lec.isPreviewFree));
            lec.isPreviewFree = isPreviewFree;
            if (!isPreviewFree) {
                delete lec.videoUrl;
            } else if (lec.videoUrl) {
                lec.videoUrl = getProtectedMediaUrl(lec.videoUrl, lecture.publicId, "video");
            }
            return lec;
        });

        return res.status(200).json({
            course: { ...course.toObject(), lectures: safeLectures },
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Failed to get course by id" });
    }
};

export const getCourseById = (req, res) => loadCourseById(req, res);
export const getPublicCourseById = (req, res) => loadCourseById(req, res, true);

export const createLecture = async (req,res) => {
    try {
        const {lectureTitle} = req.body;
        const {courseId} = req.params;

        if(!lectureTitle || !courseId){
            return res.status(400).json({
                message:"Lecture title is required"
            })
        };

        // create lecture
        const lecture = await Lecture.create({lectureTitle});

        const course = await Course.findById(courseId);
        if(course){
            course.lectures.push(lecture._id);
            await course.save();
        }

        return res.status(201).json({
            lecture,
            message:"Lecture created successfully."
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message:"Failed to create lecture"
        })
    }
}
export const getCourseLecture = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.id;
        const userRole = req.user?.role;

        // الـ instructor يعدي على طول
        const managedCourse = await Course.findById(courseId).select("creator coursePrice isPublished");
        if (!managedCourse) return res.status(404).json({ message: "Course not found" });
        const canManage = userRole === "admin" || (userRole === "instructor" && managedCourse.creator?.toString() === userId);
        if (!canManage && managedCourse.isPublished === false) {
            return res.status(403).json({ message: "This course is not published." });
        }
        if (!canManage) {
            const purchase = await CoursePurchase.findOne({
                courseId,
                userId,
                status: "completed",
            });

            // تحقق كمان من enrolledCourses
            const user = await User.findById(userId).select("enrolledCourses");
            const hasManualAccess = user?.enrolledCourses?.some(
                (id) => id.toString() === courseId
            );

            const isFreeCourse = !managedCourse.coursePrice || managedCourse.coursePrice <= 0;

            if (!purchase && !hasManualAccess && !isFreeCourse) {
                return res.status(403).json({
                    message: "You must enroll in this course to access lectures.",
                });
            }
        }

        const course = await Course.findById(courseId).populate("lectures");
        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        const safeLectures = course.lectures.map((lecture) => {
            const data = lecture.toObject ? lecture.toObject() : lecture;
            const media = {
                ...data,
                videoUrl: getProtectedMediaUrl(data.videoUrl, data.publicId, "video"),
                attachmentUrl: getProtectedMediaUrl(data.attachmentUrl, data.attachmentPublicId, "raw"),
            };
            if (canManage) return { ...data, playbackUrl: media.videoUrl, attachmentDownloadUrl: media.attachmentUrl };
            return { ...media, quizQuestions: (data.quizQuestions || []).map((question) => {
                const item = question.toObject ? question.toObject() : question;
                const { correctOptionIndex: _answer, ...safeQuestion } = item;
                return safeQuestion;
            }) };
        });
        return res.status(200).json({ lectures: safeLectures });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Failed to get lectures" });
    }
};
export const editLecture = async (req,res) => {
    try {
        const {courseId, lectureId} = req.params;
        const lecture = await Lecture.findById(lectureId);
        if(!lecture){
            return res.status(404).json({
                message:"Lecture not found!"
            })
        }

        // Parse fields – when sent as FormData, objects arrive as JSON strings
        const lectureTitle = req.body.lectureTitle;
        const isPreviewFreeRaw = req.body.isPreviewFree;
        const isPreviewFree =
            isPreviewFreeRaw === true ||
            isPreviewFreeRaw === "true" ||
            isPreviewFreeRaw === 1 ||
            isPreviewFreeRaw === "1";

        let videoInfo = req.body.videoInfo;
        if (typeof videoInfo === "string") {
            try { videoInfo = JSON.parse(videoInfo); } catch (parseErr) {
                console.warn("editLecture: failed to parse videoInfo JSON:", parseErr?.message);
                videoInfo = null;
            }
        }

        const description = typeof req.body.description === "string" ? req.body.description : null;

        const previousPublicId = lecture.publicId;
        const previousVideoUrl = lecture.videoUrl;
        const previousAttachmentPublicId = lecture.attachmentPublicId;
        const previousAttachmentUrl = lecture.attachmentUrl;

        // update lecture title
        if(lectureTitle) lecture.lectureTitle = lectureTitle;

        // update video
        if(typeof videoInfo?.videoUrl === "string" && videoInfo.videoUrl.trim()) {
            const nextVideoUrl = videoInfo.videoUrl.trim();
            const nextPublicId = typeof videoInfo.publicId === "string" ? videoInfo.publicId.trim() : "";

            if (nextPublicId) {
                const isExistingAsset = nextPublicId === previousPublicId;
                const isOwnedNewAsset = nextPublicId.startsWith(`lms/lectures/${req.id}/`) &&
                    extractPublicIdFromUrl(nextVideoUrl) === nextPublicId &&
                    nextVideoUrl.includes("/video/authenticated/");
                if ((isExistingAsset && nextVideoUrl !== previousVideoUrl) || (!isExistingAsset && !isOwnedNewAsset)) {
                    return res.status(400).json({ message: "Invalid or unowned video asset." });
                }
            } else {
                let youtubeHost;
                try { youtubeHost = new URL(nextVideoUrl).hostname.toLowerCase(); } catch { youtubeHost = ""; }
                if (!["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"].includes(youtubeHost)) {
                    return res.status(400).json({ message: "Only YouTube links are allowed for external videos." });
                }
            }

            lecture.videoUrl = nextVideoUrl;
            lecture.publicId = nextPublicId || undefined;

        }

        // update preview flag
        if (typeof isPreviewFreeRaw !== "undefined" && isPreviewFreeRaw !== "") {
            lecture.isPreviewFree = isPreviewFree;
            lecture.previewEnabledByAdmin = true;
        }

        // update description
        if (description !== null) {
            lecture.description = description;
        }

        // handle PDF attachment upload
        const attachmentFile = req.file;
        if (attachmentFile) {
            if (attachmentFile.mimetype !== "application/pdf") {
                return res.status(400).json({ message: "Only PDF files are accepted as attachments." });
            }
            // Verify PDF magic bytes (%PDF-) to guard against spoofed MIME types
            const pdfMagic = Buffer.from("%PDF-");
            if (
                !attachmentFile.buffer ||
                attachmentFile.buffer.length < pdfMagic.length ||
                !attachmentFile.buffer.slice(0, pdfMagic.length).equals(pdfMagic)
            ) {
                return res.status(400).json({ message: "Uploaded file does not appear to be a valid PDF." });
            }
            // Upload new file FIRST; only delete the old one after a successful upload
            const uploadResult = await uploadMedia(attachmentFile.buffer, {
                resource_type: "raw",
                folder: "lecture_attachments",
                format: "pdf",
                type: "authenticated",
            });
            lecture.attachmentUrl = uploadResult.secure_url;
            lecture.attachmentPublicId = uploadResult.public_id;
        }

        await lecture.save();

        // Keep old media intact unless the updated lecture was stored successfully.
        if (previousPublicId && previousPublicId !== lecture.publicId) {
            await (previousVideoUrl?.includes("/video/authenticated/") ? deleteVideoFromCloudinary(previousPublicId, "authenticated") : deleteVideoFromCloudinary(previousPublicId));
        }
        if (previousAttachmentPublicId && previousAttachmentPublicId !== lecture.attachmentPublicId) {
            await (previousAttachmentUrl?.includes("/raw/authenticated/") ? deleteMediaFromCloudinary(previousAttachmentPublicId, "raw", "authenticated") : deleteMediaFromCloudinary(previousAttachmentPublicId, "raw"));
        }

        // Ensure the course still has the lecture id if it was not already added
        const course = await Course.findById(courseId);
        if(course && !course.lectures.includes(lecture._id)){
            course.lectures.push(lecture._id);
            await course.save();
        };
        return res.status(200).json({
            lecture,
            message:"Lecture updated successfully."
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message:"Failed to edit lectures"
        })
    }
}
export const reorderLecture = async (req,res) => {
    try {
        const { courseId, lectureId } = req.params;
        const { direction } = req.body;

        if (!direction || !["up", "down"].includes(direction)) {
            return res.status(400).json({
                message: "Direction must be up or down"
            });
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                message: "Course not found"
            });
        }

        const currentIndex = course.lectures.findIndex(
            (item) => item.toString() === lectureId
        );

        if (currentIndex === -1) {
            return res.status(404).json({
                message: "Lecture not found in this course"
            });
        }

        const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

        if (targetIndex < 0 || targetIndex >= course.lectures.length) {
            return res.status(400).json({
                message: `Lecture is already at the ${direction === "up" ? "top" : "bottom"}`
            });
        }

        [course.lectures[currentIndex], course.lectures[targetIndex]] = [
            course.lectures[targetIndex],
            course.lectures[currentIndex],
        ];

        await course.save();

        return res.status(200).json({
            message: `Lecture moved ${direction} successfully.`
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to reorder lecture"
        });
    }
}
export const removeLecture = async (req,res) => {
    try {
        const {lectureId} = req.params;
        const lecture = await Lecture.findByIdAndDelete(lectureId);
        if(!lecture){
            return res.status(404).json({
                message:"Lecture not found!"
            });
        }
        // delete the lecture from couldinary as well
        if(lecture.publicId){
            await (lecture.videoUrl?.includes("/video/authenticated/") ? deleteVideoFromCloudinary(lecture.publicId, "authenticated") : deleteVideoFromCloudinary(lecture.publicId));
        }

        // delete any quiz question images from Cloudinary
        const imagePublicIds = [
            ...new Set(
                (lecture.quizQuestions || [])
                    .map((q) => q.questionImagePublicId)
                    .filter(Boolean)
            ),
        ];
        await Promise.allSettled(
            imagePublicIds.map((publicId) => deleteMediaFromCloudinary(publicId, "image"))
        );

        // Remove the lecture reference from the associated course
        await Course.updateOne(
            {lectures:lectureId}, // find the course that contains the lecture
            {$pull:{lectures:lectureId}} // Remove the lectures id from the lectures array
        );

        return res.status(200).json({
            message:"Lecture removed successfully."
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message:"Failed to remove lecture"
        })
    }
}
export const getLectureById = async (req,res) => {
    try {
        const {lectureId} = req.params;
        const lecture = await Lecture.findById(lectureId);
        if(!lecture){
            return res.status(404).json({
                message:"Lecture not found!"
            });
        }
        const data = lecture.toObject ? lecture.toObject() : lecture;
        return res.status(200).json({ lecture: {
            ...data,
            playbackUrl: getProtectedMediaUrl(data.videoUrl, data.publicId, "video"),
            attachmentDownloadUrl: getProtectedMediaUrl(data.attachmentUrl, data.attachmentPublicId, "raw"),
        } });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message:"Failed to get lecture by id"
        })
    }
}


// publich unpublish course logic

export const togglePublishCourse = async (req,res) => {
    try {
        const {courseId} = req.params;
        const {publish} = req.query;
        if (publish !== "true" && publish !== "false") {
            return res.status(400).json({ message: "Publish must be true or false." });
        }
        const course = await Course.findById(courseId);
        if(!course){
            return res.status(404).json({
                message:"Course not found!"
            });
        }
        if (publish === "true" && !courseSubject(course)) {
            return res.status(400).json({ message: "Choose a subject before publishing this course." });
        }
        if (publish === "true" && !course.lectures?.length) {
            return res.status(400).json({ message: "Add at least one lecture before publishing this course." });
        }
        if (publish === "true" && Number(course.coursePrice) > 0) {
            const owner = await User.findById(course.creator).select("instructorWhatsapp status");
            if (!owner || owner.status === "suspended" || !owner.instructorWhatsapp) {
                return res.status(400).json({ message:"The course instructor must add a WhatsApp number before publishing a paid course." });
            }
        }
        // Old form submissions stored an empty string in this optional enum field.
        if (course.courseLevel === "") course.courseLevel = undefined;
        course.isPublished = publish === "true";
        await course.save();
        await AuditLog.create({ actor: req.id, action: course.isPublished ? "course.published" : "course.unpublished", targetType: "Course", targetId: courseId, ip: req.ip }).catch((error) => console.error("Audit logging failed:", error));

        const statusMessage = course.isPublished ? "Published" : "Unpublished";
        return res.status(200).json({
            message:`Course is ${statusMessage}`
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message:"Failed to update status"
        })
    }
}
export const getAdminManageableCourses = async (_req, res) => {
    try {
        const courses = await Course.find()
            .select("courseTitle courseThumbnail coursePrice isPublished creator category subject gradeLevel")
            .populate({ path: "creator", select: "name email" })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            courses,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Failed to load courses.",
        });
    }
}

export const updateLectureQuiz = async (req, res) => {
    try {
        const { courseId, lectureId } = req.params;
        const { quizQuestions = [] } = req.body;

        if (!Array.isArray(quizQuestions)) {
            return res.status(400).json({
                message: "Quiz questions must be an array.",
            });
        }

        const lecture = await Lecture.findById(lectureId);
        if (!lecture) {
            return res.status(404).json({
                message: "Lecture not found!",
            });
        }

        const course = await Course.findById(courseId);
        if (!course || !course.lectures.some((item) => item.toString() === lectureId)) {
            return res.status(404).json({
                message: "Lecture not found in this course.",
            });
        }

        const sanitizedResult = sanitizeQuizQuestions(quizQuestions);
        if (sanitizedResult.error) {
            return res.status(400).json({
                message: sanitizedResult.error,
            });
        }

        const existingImageIds = new Set((lecture.quizQuestions || []).map((question) => question.questionImagePublicId).filter(Boolean));
        const hasUnownedImage = sanitizedResult.data.some((question) => {
            if (!question.questionImagePublicId) return false;
            if (existingImageIds.has(question.questionImagePublicId)) return false;
            return !question.questionImagePublicId.startsWith(`lms/quiz-questions/${req.id}/`) ||
                extractPublicIdFromUrl(question.questionImageUrl) !== question.questionImagePublicId;
        });
        if (hasUnownedImage) return res.status(400).json({ message: "Invalid or unowned quiz image." });

        // Collect public IDs of images that are no longer referenced after the update
        const newPublicIds = new Set(
            sanitizedResult.data
                .filter((q) => q.questionImagePublicId)
                .map((q) => q.questionImagePublicId)
        );
        const stalePublicIds = [
            ...new Set(
                (lecture.quizQuestions || [])
                    .map((q) => q.questionImagePublicId)
                    .filter((id) => id && !newPublicIds.has(id))
            ),
        ];

        lecture.quizQuestions = sanitizedResult.data;
        await lecture.save();

        // Delete stale images from Cloudinary after the save succeeds
        await Promise.allSettled(
            stalePublicIds.map((publicId) => deleteMediaFromCloudinary(publicId, "image"))
        );

        return res.status(200).json({
            lecture,
            message: "Lecture quiz updated successfully.",
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Failed to update lecture quiz",
        });
    }
}
