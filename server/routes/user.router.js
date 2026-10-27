import express from "express";
import {
	deleteAdminUser,
	forgotPassword,
	getAdminUsers,
	getUserProfile,
	login,
	logout,
	register,
	resendVerificationEmail,
	resetPassword,
	updateUserCourseAccess,
	updateProfile,
	updateUserRole,
	updateUserStatus,
	verifyEmail,
} from "../controllers/user.controller.js";
import { getPublicInstructor, listPublicInstructors } from "../controllers/instructor.controller.js";
import authorizeRoles from "../middlewares/authorizeRoles.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import upload from "../utils/multer.js";
import { googleChallenge, googleConfig, googleLogin } from "../controllers/googleAuth.controller.js";

const router = express.Router();

router.route("/register").post(register);
router.route("/login").post(login);
router.get("/google/config", googleConfig);
router.post("/google/challenge", googleChallenge);
router.post("/google", googleLogin);
router.route("/logout").get(logout);
router.route("/verify-email/resend").post(resendVerificationEmail);
router.route("/verify-email/:token").post(verifyEmail);
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password/:token").post(resetPassword);
router.route("/instructors").get(listPublicInstructors);
router.route("/instructors/:instructorId").get(getPublicInstructor);
router.route("/profile").get(isAuthenticated ,getUserProfile);
router.route("/profile/update").put(isAuthenticated ,upload.single("profilePhoto") ,updateProfile);
router.route("/admin/users").get(isAuthenticated, authorizeRoles("admin"), getAdminUsers);
router.route("/admin/users/:userId").delete(isAuthenticated, authorizeRoles("admin"), deleteAdminUser);
router.route("/admin/users/:userId/role").patch(isAuthenticated, authorizeRoles("admin"), updateUserRole);
router.route("/admin/users/:userId/status").patch(isAuthenticated, authorizeRoles("admin"), updateUserStatus);
router.route("/admin/users/:userId/course-access").patch(isAuthenticated, authorizeRoles("admin"), updateUserCourseAccess);

export default router;
