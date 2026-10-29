import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { API_BASE_URL } from "@/lib/apiBaseUrl";
const COURSE_PURCHASE_API = `${API_BASE_URL}/api/v1/progress`;
const AUTH_TOKEN_KEY = "lms_auth_token";

const getStoredToken = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(AUTH_TOKEN_KEY) || "";
};
export const courseProgressApi = createApi({
  reducerPath: "courseProgressApi",
  tagTypes: ["LectureComments", "CommentNotifications", "Learning"],
  baseQuery: fetchBaseQuery({
    baseUrl: COURSE_PURCHASE_API,
    credentials: "include",
    prepareHeaders: (headers) => {
      const token = getStoredToken();

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      return headers;
    },
  }),
  endpoints: (builder) => ({
    getMyLearning: builder.query({
      query: ({ page = 1, status = "all" } = {}) => ({ url: "/my-learning", params: { page, status } }),
      providesTags: ["Learning"],
    }),
    saveLearningPosition: builder.mutation({
      query: ({ courseId, lectureId, position, duration }) => ({ url: `/${courseId}/lecture/${lectureId}/position`, method: "PUT", body: { position, duration }, timeout: 10000 }),
      invalidatesTags: ["Learning"],
      async onQueryStarted({ courseId, lectureId, position, duration }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(courseProgressApi.util.updateQueryData("getCourseProgress", courseId, draft => {
            if (!draft?.data) return;
            draft.data.positions = [{ lectureId, position, duration, updatedAt: new Date().toISOString() }, ...(draft.data.positions || []).filter(item => item.lectureId !== lectureId)];
          }));
        } catch { /* The player shows the retry state; do not cache failed saves. */ }
      },
    }),
    getCourseProgress: builder.query({
      query: (courseId) => ({
        url: `/${courseId}`,
        method: "GET",
      }),
    }),
    updateLectureProgress: builder.mutation({
      invalidatesTags: ["Learning"],
      query: ({ courseId, lectureId }) => ({
        url: `/${courseId}/lecture/${lectureId}/view`,
        method: "POST",
      }),
    }),
    getCommentNotifications: builder.query({
      query: () => ({
        url: "/comment-notifications",
        method: "GET",
      }),
      providesTags: ["CommentNotifications"],
    }),
    markCommentNotificationAsRead: builder.mutation({
      query: (notificationId) => ({
        url: `/comment-notifications/${notificationId}/read`,
        method: "PATCH",
      }),
      invalidatesTags: ["CommentNotifications"],
    }),
    markAllCommentNotificationsAsRead: builder.mutation({
      query: () => ({
        url: "/comment-notifications/read-all",
        method: "PATCH",
      }),
      invalidatesTags: ["CommentNotifications"],
    }),
    getLectureComments: builder.query({
      query: ({ courseId, lectureId }) => ({
        url: `/${courseId}/lecture/${lectureId}/comments`,
        method: "GET",
      }),
      providesTags: (result, error, { lectureId }) => [{ type: "LectureComments", id: lectureId }],
    }),
    addLectureComment: builder.mutation({
      query: ({ courseId, lectureId, text, parentCommentId = null }) => ({
        url: `/${courseId}/lecture/${lectureId}/comments`,
        method: "POST",
        body: { text, parentCommentId },
      }),
      invalidatesTags: (result, error, { lectureId }) => [
        { type: "LectureComments", id: lectureId },
        "CommentNotifications",
      ],
    }),
    deleteLectureComment: builder.mutation({
      query: ({ courseId, lectureId, commentId }) => ({
        url: `/${courseId}/lecture/${lectureId}/comments/${commentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { lectureId }) => [
        { type: "LectureComments", id: lectureId },
        "CommentNotifications",
      ],
    }),
    togglePinLectureComment: builder.mutation({
      query: ({ courseId, lectureId, commentId }) => ({
        url: `/${courseId}/lecture/${lectureId}/comments/${commentId}/pin`,
        method: "PATCH",
      }),
      async onQueryStarted({ courseId, lectureId, commentId }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          courseProgressApi.util.updateQueryData(
            "getLectureComments",
            { courseId, lectureId },
            (draft) => {
              if (!draft?.comments?.length) {
                return;
              }

              const targetComment = draft.comments.find(
                (comment) => comment._id === commentId
              );

              if (!targetComment || targetComment.parentCommentId) {
                return;
              }

              if (targetComment.isPinned) {
                targetComment.isPinned = false;
                targetComment.pinnedAt = null;
                targetComment.pinnedByUserId = null;
                return;
              }

              draft.comments.forEach((comment) => {
                if (comment.parentCommentId) {
                  return;
                }

                comment.isPinned = false;
                comment.pinnedAt = null;
                comment.pinnedByUserId = null;
              });

              targetComment.isPinned = true;
              targetComment.pinnedAt = new Date().toISOString();
            }
          )
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
    completeCourse: builder.mutation({
        invalidatesTags: ["Learning"],
        query: (courseId) => ({
            url: `/${courseId}/complete`,
            method: "POST",
        }),
    }),
    incompleteCourse: builder.mutation({
        invalidatesTags: ["Learning"],
        query: (courseId) => ({
            url: `/${courseId}/incomplete`,
            method: "POST",
        }),
    }),
    submitQuizResult: builder.mutation({
      invalidatesTags: ["Learning"],
      query: ({ courseId, lectureId, answers }) => ({
        url: `/${courseId}/lecture/${lectureId}/quiz-result`,
        method: "POST",
        body: { answers },
      }),
    }),
    getCourseQuizResults: builder.query({
      query: (courseId) => ({
        url: `/admin/${courseId}/quiz-results`,
        method: "GET",
      }),
    }),
    getQuizResultHistory: builder.query({
      query: (resultId) => ({
        url: `/admin/quiz-result/${resultId}/history`,
        method: "GET",
      }),
    }),
  }),
});
export const {
useGetMyLearningQuery,
useSaveLearningPositionMutation,
useGetCourseProgressQuery,
useUpdateLectureProgressMutation,
useGetCommentNotificationsQuery,
useMarkCommentNotificationAsReadMutation,
useMarkAllCommentNotificationsAsReadMutation,
useGetLectureCommentsQuery,
useAddLectureCommentMutation,
useDeleteLectureCommentMutation,
useTogglePinLectureCommentMutation,
useCompleteCourseMutation,
useIncompleteCourseMutation,
useSubmitQuizResultMutation,
useGetCourseQuizResultsQuery,
useLazyGetQuizResultHistoryQuery,
} = courseProgressApi;
