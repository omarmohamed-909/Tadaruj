import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { purchaseApi } from "./purchaseApi";

import { API_BASE_URL } from "@/lib/apiBaseUrl";
const Course_API = `${API_BASE_URL}/api/v1/course`;
const AUTH_TOKEN_KEY = "lms_auth_token";

const getStoredToken = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(AUTH_TOKEN_KEY) || "";
};

export const courseApi = createApi({
  reducerPath: "courseApi",
  tagTypes: [
    "Refresh_Creator_Course",
    "Refresh_Lecture",
    "Refresh_Course",
    "Refresh_Published_Course",
    "Refresh_Search_Course",
    "Admin_Manageable_Course",
  ],
  baseQuery: fetchBaseQuery({
    baseUrl: Course_API,
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
    createCourse: builder.mutation({
      query: ({ courseTitle, subject, gradeLevel }) => ({
        url: "",
        method: "POST",
        body: { courseTitle, subject, gradeLevel },
      }),
      invalidatesTags: ["Refresh_Creator_Course"],
    }),
    getSearchCourse: builder.query({
      query: ({ query, subjects, grades, sortByPrice}) => {
        const params = new URLSearchParams({ query: query || "" });
        subjects?.forEach((subject) => params.append("subjects", subject));
        grades?.forEach((grade) => params.append("grades", grade));
        if (sortByPrice) params.set("sortByPrice", sortByPrice);

        return {
          url: `/search?${params.toString()}`,
          method: "GET",
          credentials: "omit",
        };
      },
      providesTags: (result) =>
        result?.courses
          ? [
              "Refresh_Search_Course",
              ...result.courses.map((course) => ({
                type: "Refresh_Course",
                id: course._id,
              })),
            ]
          : ["Refresh_Search_Course"],
    }),
    getPublishedCourse: builder.query({
      query: () => ({
        url: "/published-courses",
        method: "GET",
        credentials: "omit",
      }),
      providesTags: (result) =>
        result?.courses
          ? [
              "Refresh_Published_Course",
              ...result.courses.map((course) => ({
                type: "Refresh_Course",
                id: course._id,
              })),
            ]
          : ["Refresh_Published_Course"],
    }),
    getCreatorCourse: builder.query({
      query: () => ({
        url: "",
        method: "GET",
      }),
      providesTags: (result) =>
        result?.courses
          ? [
              "Refresh_Creator_Course",
              ...result.courses.map((course) => ({
                type: "Refresh_Course",
                id: course._id,
              })),
            ]
          : ["Refresh_Creator_Course"],
    }),
    getAdminManageableCourses: builder.query({
      query: () => ({
        url: "/admin/manageable-courses",
        method: "GET",
      }),
      providesTags: ["Admin_Manageable_Course"],
    }),
    editCourse: builder.mutation({
      query: ({ formData, courseId }) => ({
        url: `/${courseId}`,
        method: "PUT",
        body: formData,
      }),
      invalidatesTags: (result, error, { courseId }) => [
        "Refresh_Creator_Course",
        "Refresh_Published_Course",
        "Refresh_Search_Course",
        { type: "Refresh_Course", id: courseId },
      ],
      async onQueryStarted({ courseId }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(
            purchaseApi.util.invalidateTags([
              { type: "PurchaseStatus", id: courseId },
            ])
          );
        } catch {
          // Let the mutation error flow handle failures.
        }
      },
    }),
    deleteCourse: builder.mutation({
      query: (courseId) => ({
        url: `/${courseId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, courseId) => [
        "Refresh_Creator_Course",
        "Refresh_Lecture",
        "Refresh_Published_Course",
        "Refresh_Search_Course",
        "Admin_Manageable_Course",
        { type: "Refresh_Course", id: courseId },
      ],
      async onQueryStarted(courseId, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(
            purchaseApi.util.invalidateTags([
              { type: "PurchaseStatus", id: courseId },
            ])
          );
        } catch {
          // Let the mutation error flow handle failures.
        }
      },
    }),
    getCourseById: builder.query({
      query: (courseId) => ({
        url: `/${courseId}`,
        method: "GET",
      }),
      providesTags: (result, error, courseId) => [
        { type: "Refresh_Course", id: courseId },
      ],
    }),
    getPublicCourseById: builder.query({
      query: (courseId) => ({ url: `/public/${courseId}`, method: "GET", credentials: "omit" }),
      providesTags: (result, error, courseId) => [{ type: "Refresh_Course", id: courseId }],
    }),
    createLecture: builder.mutation({
      query: ({ lectureTitle, courseId }) => ({
        url: `/${courseId}/lecture`,
        method: "POST",
        body: { lectureTitle },
      }),
      invalidatesTags: (result, error, { courseId }) => error ? [] : ["Refresh_Lecture", { type: "Refresh_Course", id: courseId }],
    }),
    getCourseLecture: builder.query({
      query: (courseId) => ({
        url: `/${courseId}/lecture`,
        method: "GET",
      }),
      providesTags: ["Refresh_Lecture"],
    }),
    editLecture: builder.mutation({
      query: ({
        lectureTitle,
        videoInfo,
        isPreviewFree,
        courseId,
        lectureId,
        description,
        pdfFile,
      }) => {
        const formData = new FormData();
        if (lectureTitle !== undefined) formData.append("lectureTitle", lectureTitle);
        if (videoInfo !== undefined) formData.append("videoInfo", JSON.stringify(videoInfo));
        if (isPreviewFree !== undefined) formData.append("isPreviewFree", String(isPreviewFree));
        if (description !== undefined) formData.append("description", description);
        if (pdfFile instanceof File) formData.append("attachment", pdfFile);
        return {
          url: `/${courseId}/lecture/${lectureId}`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: (result, error, { courseId }) => error ? [] : ["Refresh_Lecture", { type: "Refresh_Course", id: courseId }],
    }),
    updateLectureQuiz: builder.mutation({
      query: ({ courseId, lectureId, quizQuestions }) => ({
        url: `/${courseId}/lecture/${lectureId}/quiz`,
        method: "PATCH",
        body: { quizQuestions },
      }),
      invalidatesTags: (result, error, { courseId }) => error ? [] : ["Refresh_Lecture", { type: "Refresh_Course", id: courseId }],
    }),
    reorderLecture: builder.mutation({
      query: ({ courseId, lectureId, direction }) => ({
        url: `/${courseId}/lecture/${lectureId}/reorder`,
        method: "POST",
        body: { direction },
      }),
      invalidatesTags: ["Refresh_Lecture"],
    }),
    removeLecture: builder.mutation({
      query: (lectureId) => ({
        url: `/lecture/${lectureId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Refresh_Lecture"],
    }),
    getLectureById: builder.query({
      query: (lectureId) => ({
        url: `/lecture/${lectureId}`,
        method: "GET",
      }),
      providesTags: ["Refresh_Lecture"],
    }),
    publishCourse: builder.mutation({
      query: ({ courseId, query }) => ({
        url: `/${courseId}?publish=${query}`,
        method: "PATCH",
      }),
      invalidatesTags: (result, error, { courseId }) => [
        "Refresh_Creator_Course",
        "Refresh_Published_Course",
        "Refresh_Search_Course",
        { type: "Refresh_Course", id: courseId },
      ],
      async onQueryStarted({ courseId }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(
            purchaseApi.util.invalidateTags([
              { type: "PurchaseStatus", id: courseId },
            ])
          );
        } catch {
          // Let the mutation error flow handle failures.
        }
      },
    }),
  }),
});
export const {
  useCreateCourseMutation,
  useGetSearchCourseQuery,
  useGetPublishedCourseQuery,
  useGetCreatorCourseQuery,
  useGetAdminManageableCoursesQuery,
  useEditCourseMutation,
  useDeleteCourseMutation,
  useGetCourseByIdQuery,
  useGetPublicCourseByIdQuery,
  useCreateLectureMutation,
  useGetCourseLectureQuery,
  useEditLectureMutation,
  useUpdateLectureQuizMutation,
  useReorderLectureMutation,
  useRemoveLectureMutation,
  useGetLectureByIdQuery,
  usePublishCourseMutation,
} = courseApi;
