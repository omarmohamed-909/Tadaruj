import { listAssignments, createAssignment, getAssignment, updateAssignment, submitAssignment, listSubmissions, getSubmission, reviewSubmission } from "../controllers/assignment.controller.js";
import { getStudentTracking, getQuestionInbox, resolveQuestion, updateQuizSettings } from "../controllers/teaching.controller.js";
import express from 'express';
import isAuthenticated  from '../middlewares/isAuthenticated.js';
import authorizeRoles from '../middlewares/authorizeRoles.js';
import requireCourseManager from '../middlewares/requireCourseManager.js';
import {
	addLectureComment,
	deleteLectureComment,
	getCommentNotifications,
	getCourseProgress,
	getCourseQuizResults,
	getQuizResultHistory,
	getLectureComments,
	markAllCommentNotificationsAsRead,
	markCommentNotificationAsRead,
	markAsCompleted,
	markAsInCompleted,
	submitQuizResult,
	togglePinLectureComment,
	updateCourseProgress,
  getMyLearning,
  saveLearningPosition,
} from '../controllers/courseProgress.controller.js';

const router = express.Router();
const assignmentManager = (req, _res, next) => { req.assignmentManagement = true; next(); };
router.get('/assignments/manager/:courseId', isAuthenticated, requireCourseManager, assignmentManager, listAssignments);
router.post('/assignments/manager/:courseId', isAuthenticated, requireCourseManager, createAssignment);
router.patch('/assignments/manager/:courseId/:assignmentId', isAuthenticated, requireCourseManager, updateAssignment);
router.get('/assignments/manager/:courseId/:assignmentId/submissions', isAuthenticated, requireCourseManager, listSubmissions);
router.get('/assignments/manager/:courseId/:assignmentId/submissions/:submissionId', isAuthenticated, requireCourseManager, getSubmission);
router.patch('/assignments/manager/:courseId/:assignmentId/submissions/:submissionId', isAuthenticated, requireCourseManager, reviewSubmission);
router.get('/assignments/:courseId', isAuthenticated, listAssignments);
router.get('/assignments/:courseId/:assignmentId', isAuthenticated, getAssignment);
router.post('/assignments/:courseId/:assignmentId/submit', isAuthenticated, submitAssignment);

router.get('/teaching/questions', isAuthenticated, authorizeRoles('instructor', 'admin'), getQuestionInbox);
router.get('/teaching/:courseId/students', isAuthenticated, requireCourseManager, getStudentTracking);
router.patch('/teaching/:courseId/questions/:commentId', isAuthenticated, requireCourseManager, resolveQuestion);
router.patch('/teaching/:courseId/lecture/:lectureId/quiz-settings', isAuthenticated, requireCourseManager, updateQuizSettings);
router.get('/my-learning', isAuthenticated, getMyLearning);
router.put('/:courseId/lecture/:lectureId/position', isAuthenticated, saveLearningPosition);

router.route('/comment-notifications').get(isAuthenticated, getCommentNotifications);
router.route('/comment-notifications/read-all').patch(isAuthenticated, markAllCommentNotificationsAsRead);
router.route('/comment-notifications/:notificationId/read').patch(isAuthenticated, markCommentNotificationAsRead);
router.route('/admin/:courseId/quiz-results').get(isAuthenticated, requireCourseManager, getCourseQuizResults);
router.route('/admin/quiz-result/:resultId/history').get(isAuthenticated, authorizeRoles('instructor', 'admin'), getQuizResultHistory);
router.route('/:courseId').get(isAuthenticated, getCourseProgress);
router.route('/:courseId/lecture/:lectureId/view').post(isAuthenticated, updateCourseProgress);
router.route('/:courseId/lecture/:lectureId/quiz-result').post(isAuthenticated, submitQuizResult);
router.route('/:courseId/lecture/:lectureId/comments').get(isAuthenticated, getLectureComments).post(isAuthenticated, addLectureComment);
router.route('/:courseId/lecture/:lectureId/comments/:commentId').delete(isAuthenticated, deleteLectureComment);
router.route('/:courseId/lecture/:lectureId/comments/:commentId/pin').patch(isAuthenticated, requireCourseManager, togglePinLectureComment);
router.route('/:courseId/complete').post(isAuthenticated, markAsCompleted);
router.route('/:courseId/incomplete').post(isAuthenticated, markAsInCompleted);

export default router;
