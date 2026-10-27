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
} from '../controllers/courseProgress.controller.js';

const router = express.Router();

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
