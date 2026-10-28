import express from "express";
import authorizeRoles from "../middlewares/authorizeRoles.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import requireCourseManager from "../middlewares/requireCourseManager.js";
import { createCourse, createLecture, deleteCourse, editCourse, editLecture, getAdminManageableCourses, getCourseById, getPublicCourseById, getCourseLecture, getCreatorCourses, getLectureById, getPublishedCourse, removeLecture, reorderLecture, searchCourse, togglePublishCourse, updateLectureQuiz } from "../controllers/course.controller.js";
import upload, { uploadPdf } from "../utils/multer.js";
import { getCourseFilters } from "../controllers/course.controller.js";
import { getAdminCourseAccess } from "../controllers/course.controller.js";

const router = express.Router();

router.route("/").post(isAuthenticated,authorizeRoles("instructor", "admin"),createCourse);
router.route("/search").get(searchCourse);
router.route("/filters").get(getCourseFilters);
router.route("/published-courses").get(getPublishedCourse);
router.route("/public/:courseId").get(getPublicCourseById);
router.route("/admin/manageable-courses").get(isAuthenticated, authorizeRoles("admin"), getAdminManageableCourses);
router.route("/admin/course-access").get(isAuthenticated, authorizeRoles("admin"), getAdminCourseAccess);
router.route("/").get(isAuthenticated,authorizeRoles("instructor", "admin"),getCreatorCourses);
router.route("/:courseId").put(isAuthenticated,requireCourseManager,upload.single("courseThumbnail"),editCourse);
router.route("/:courseId").delete(isAuthenticated,requireCourseManager, deleteCourse);
router.route("/:courseId").get(isAuthenticated, getCourseById);
router.route("/:courseId/lecture").post(isAuthenticated,requireCourseManager, createLecture);
router.route("/:courseId/lecture").get(isAuthenticated, getCourseLecture);
router.route("/:courseId/lecture/:lectureId/reorder").post(isAuthenticated,requireCourseManager, reorderLecture);
router.route("/:courseId/lecture/:lectureId").post(isAuthenticated,requireCourseManager, uploadPdf.single("attachment"), editLecture);
router.route("/:courseId/lecture/:lectureId/quiz").patch(isAuthenticated,requireCourseManager, updateLectureQuiz);
router.route("/lecture/:lectureId").delete(isAuthenticated,requireCourseManager,removeLecture);
router.route("/lecture/:lectureId").get(isAuthenticated,requireCourseManager,getLectureById);
router.route("/:courseId").patch(isAuthenticated,requireCourseManager, togglePublishCourse);

export default router;
