import { Course } from "../models/course.model.js";

// Course mutations are reserved for platform admins or the course's creator.
const requireCourseManager = async (req, res, next) => {
    try {
        if (!["admin", "instructor"].includes(req.user?.role)) {
            return res.status(403).json({ success: false, message: "Instructor access required." });
        }
        const course = req.params.courseId
            ? await Course.findById(req.params.courseId).select("creator lectures")
            : await Course.findOne({ lectures: req.params.lectureId }).select("creator lectures");
        if (!course) {
            return res.status(404).json({ success: false, message: "Course not found." });
        }
        if (req.user.role !== "admin" && course.creator?.toString() !== req.id?.toString()) {
            return res.status(403).json({ success: false, message: "You can only manage your own courses." });
        }
        if (req.params.lectureId && !course.lectures?.some((id) => id.toString() === req.params.lectureId)) {
            return res.status(404).json({ success: false, message: "Lecture not found in this course." });
        }
        req.managedCourse = course;
        next();
    } catch (error) {
        return res.status(400).json({ success: false, message: "Invalid course or lecture id." });
    }
};

export default requireCourseManager;
