import { courseProgressApi } from "./courseProgressApi";
const tags = (result, error) => error ? [] : ["Assignments", "CommentNotifications"];
const api = courseProgressApi.injectEndpoints({ endpoints: builder => ({
  getTrackedAssignments: builder.query({
    query: ({ courseId, studentId, page }) => ({
      url: `/teaching/${courseId}/students/${studentId}/assignments`, params: { page },
    }),
    providesTags: ["Assignments"],
  }),
  getAssignments: builder.query({ query: ({ courseId, manager = false, ...params }) => ({ url: `/assignments/${manager ? "manager/" : ""}${courseId}`, params }), providesTags: ["Assignments"] }),
  getAssignment: builder.query({ query: ({ courseId, assignmentId }) => `/assignments/${courseId}/${assignmentId}`, providesTags: ["Assignments"] }),
  createAssignment: builder.mutation({ query: ({ courseId, ...body }) => ({ url: `/assignments/manager/${courseId}`, method: "POST", body }), invalidatesTags: tags }),
  updateAssignment: builder.mutation({ query: ({ courseId, assignmentId, ...body }) => ({ url: `/assignments/manager/${courseId}/${assignmentId}`, method: "PATCH", body }), invalidatesTags: tags }),
  submitAssignment: builder.mutation({ query: ({ courseId, assignmentId, ...body }) => ({ url: `/assignments/${courseId}/${assignmentId}/submit`, method: "POST", body }), invalidatesTags: tags }),
  getAssignmentSubmissions: builder.query({ query: ({ courseId, assignmentId, ...params }) => ({ url: `/assignments/manager/${courseId}/${assignmentId}/submissions`, params }), providesTags: ["Assignments"] }),
  getAssignmentSubmission: builder.query({ query: ({ courseId, assignmentId, submissionId }) => `/assignments/manager/${courseId}/${assignmentId}/submissions/${submissionId}`, providesTags: ["Assignments"] }),
  reviewAssignmentSubmission: builder.mutation({ query: ({ courseId, assignmentId, submissionId, ...body }) => ({ url: `/assignments/manager/${courseId}/${assignmentId}/submissions/${submissionId}`, method: "PATCH", body }), invalidatesTags: tags }),
}) });
export const { useGetTrackedAssignmentsQuery, useGetAssignmentsQuery, useGetAssignmentQuery, useCreateAssignmentMutation, useUpdateAssignmentMutation, useSubmitAssignmentMutation, useGetAssignmentSubmissionsQuery, useGetAssignmentSubmissionQuery, useReviewAssignmentSubmissionMutation } = api;
